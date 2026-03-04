"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RefreshCw, ExternalLink, ChevronDown, ChevronUp, Activity, Unlink } from "lucide-react"
import { useGuest } from "../layout"
import { fullAnalysis } from "@/lib/biomarker/analysis"
import { generateFullProtocol, Goal, filterByGoal } from "@/lib/biomarker/protocol-engine"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

// ─── Types ───
interface WhoopMetrics {
    hrv: number; rhr: number; deepSleep: number; respRate: number
    recoveryScore?: number; dataSource?: string
    // v9.0 fields
    spo2?: number; skinTemp?: number
    remSleep?: number; lightSleep?: number; totalSleep?: number
    sleepEfficiency?: number; sleepPerformance?: number; sleepConsistency?: number
    sleepDebtMs?: number; sleepCycles?: number; disturbances?: number
    dayStrain?: number; dayCalories?: number; dayAvgHR?: number; dayMaxHR?: number
    workoutStrain?: number; workoutSport?: string; workoutDurationMin?: number
    baseline?: {
        percentChange: { hrv: number; deepSleep: number; strain?: number; spo2?: number; skinTemp?: number }
        average: Record<string, number>
    }
}
interface WhoopDay {
    date: string; hrv: number; rhr: number; deepSleep: number
    respRate: number; recoveryScore: number
}
type PageState = "loading" | "not_connected" | "ready" | "syncing" | "synced" | "error"

// ─── Helpers ───
const rcColor = (s: number) =>
    s >= 67 ? { c: "#34d399", bg: "rgba(52,211,153,0.12)", l: "High" }
        : s >= 34 ? { c: "#fbbf24", bg: "rgba(251,191,36,0.12)", l: "Moderate" }
            : { c: "#f87171", bg: "rgba(248,113,113,0.12)", l: "Low" }

const srcBadge = (ds?: string) =>
    ds === "whoop_v2_live" ? { c: "#34d399", l: "Live" }
        : ds === "firestore_cache" ? { c: "#fbbf24", l: "Cached" }
            : { c: "#f87171", l: "Sim" }

const GOAL_OPTIONS: { key: Goal; icon: string; label: string }[] = [
    { key: "recovery", icon: "🏃", label: "Recovery" },
    { key: "dopamine", icon: "⚡", label: "Dopamine" },
    { key: "mental_clarity", icon: "🧠", label: "Clarity" },
    { key: "brown_fat", icon: "🔥", label: "Brown Fat" },
    { key: "growth_hormone", icon: "💪", label: "GH Boost" },
    { key: "resilience", icon: "❄️", label: "Resilience" },
    { key: "sleep", icon: "😴", label: "Sleep" },
]

const modalityColor = (m: string) =>
    m === 'cold_only' ? { bg: 'rgba(56,189,248,0.12)', c: '#38bdf8' }
        : m === 'sauna_only' ? { bg: 'rgba(251,146,60,0.12)', c: '#fb923c' }
            : { bg: 'rgba(168,85,247,0.12)', c: '#a855f7' }

const intensityStyle = (i: string) =>
    i === 'extreme' || i === 'intense'
        ? { bg: 'rgba(248,113,113,0.12)', c: '#f87171' }
        : i === 'moderate' ? { bg: 'rgba(251,191,36,0.12)', c: '#fbbf24' }
            : { bg: 'rgba(52,211,153,0.12)', c: '#34d399' }

const capacityColor = (level: number) =>
    level >= 6 ? "#22d3ee" : level >= 5 ? "#34d399" : level >= 4 ? "#06b6d4" : level >= 3 ? "#fbbf24" : level >= 2 ? "#fb923c" : "#f87171"

const dimColor = (score: number, max: number) => {
    const pct = score / max
    return pct >= 0.8 ? "#34d399" : pct >= 0.56 ? "#06b6d4" : pct >= 0.32 ? "#fbbf24" : "#f87171"
}

const pillarStyle = (p: string) =>
    p === 'Nervous System' ? { c: '#a855f7', bg: 'rgba(168,85,247,0.1)', icon: '🧠' }
        : p === 'Physical Repair' ? { c: '#fb923c', bg: 'rgba(251,146,60,0.1)', icon: '🩺' }
            : { c: '#34d399', bg: 'rgba(52,211,153,0.1)', icon: '💪' }

export default function GuestWhoop() {
    const { member, platform } = useGuest()
    const [state, setState] = useState<PageState>("loading")
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [metrics, setMetrics] = useState<WhoopMetrics | null>(null)
    const [history, setHistory] = useState<WhoopDay[]>([])
    const [lastSynced, setLastSynced] = useState<string | null>(null)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
    const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null)
    const savedSyncRef = useRef(false) // prevent double-save
    const [aiInsight, setAiInsight] = useState<any>(null)
    const [aiLoading, setAiLoading] = useState(false)

    const lookupKey = member?.id || ""

    // ─── Check Connection ───
    useEffect(() => {
        if (!lookupKey) { setState("not_connected"); return }
        const checkConnection = async () => {
            try {
                const res = await fetch(`/api/whoop/status?sessionId=${encodeURIComponent(lookupKey)}`)
                const data = await res.json()
                if (data.connected) {
                    setSessionId(data.sessionId || lookupKey)
                    setState("ready")
                } else {
                    setState("not_connected")
                }
            } catch {
                setState("error")
            }
        }
        checkConnection()

        // Re-check when user returns from external browser (LINE LIFF OAuth flow)
        const onVisibility = () => {
            if (document.visibilityState === "visible" && state === "not_connected") {
                checkConnection()
            }
        }
        document.addEventListener("visibilitychange", onVisibility)
        return () => document.removeEventListener("visibilitychange", onVisibility)
    }, [lookupKey, state])

    // ─── Sync ───
    const handleSync = async () => {
        if (!sessionId) {
            console.error("[WHOOP Sync] No sessionId — cannot sync")
            setErrorMsg("No session found. Try disconnecting and reconnecting WHOOP.")
            return
        }
        console.log(`[WHOOP Sync] Starting sync with sessionId: ${sessionId}`)
        setState("syncing")
        setErrorMsg(null)
        try {
            const res = await fetch(`/api/whoop/metrics?sessionId=${encodeURIComponent(sessionId)}`)
            console.log(`[WHOOP Sync] API response status: ${res.status}`)
            const data = await res.json()
            console.log(`[WHOOP Sync] API response:`, data.success ? "success" : data.error || "unknown error")
            if (data.success) {
                setMetrics({ ...data.metrics, dataSource: data.dataSource, baseline: data.baseline })
                setLastSynced(data.last_synced)
                if (data.history?.length > 0) {
                    setHistory(data.history)
                    localStorage.setItem("yarey_whoop_history", JSON.stringify(data.history))
                }
                if (data.baseline?.average) {
                    localStorage.setItem("yarey_whoop_baseline", JSON.stringify(data.baseline.average))
                }
                savedSyncRef.current = false // allow new save
                setState("synced")
            } else {
                console.error("[WHOOP Sync] API returned error:", data.error)
                setErrorMsg(data.error || "Failed to fetch WHOOP data. Please try again.")
                setState("ready")
            }
        } catch (err: any) {
            console.error("[WHOOP Sync] Fetch error:", err)
            setErrorMsg(err?.message || "Network error syncing WHOOP. Please try again.")
            setState("ready")
        }
    }

    // ─── Disconnect ───
    const handleDisconnect = async () => {
        if (!confirm("ยกเลิกการเชื่อมต่อ WHOOP?\nDisconnect WHOOP?")) return
        try {
            const res = await fetch("/api/whoop/disconnect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberId: member?.id }),
            })
            const data = await res.json()
            if (data.success) {
                setSessionId(null)
                setMetrics(null)
                setHistory([])
                setLastSynced(null)
                setAiInsight(null)
                savedSyncRef.current = false
                localStorage.removeItem("yarey_whoop_history")
                localStorage.removeItem("yarey_whoop_baseline")
                setState("not_connected")
            }
        } catch {
            // silently fail
        }
    }

    const connectUrl = `/api/whoop/auth?memberId=${encodeURIComponent(member?.id || "")}&platform=${encodeURIComponent(platform)}`

    // LINE LIFF-safe connect handler
    const handleConnect = async () => {
        const url = `${window.location.origin}${connectUrl}`
        if (platform === "line") {
            try {
                const liff = (await import("@line/liff")).default
                if (liff.isInClient()) {
                    liff.openWindow({ url, external: true })
                    return
                }
            } catch { /* fallback below */ }
        }
        window.location.href = connectUrl
    }

    // ─── Derived ───
    const recovery = metrics?.recoveryScore || 0
    const rc = rcColor(recovery)
    const src = srcBadge(metrics?.dataSource)

    const analysis = metrics ? fullAnalysis(metrics, metrics.baseline?.average || undefined) : null
    const hrvDelta = (metrics && metrics.baseline?.percentChange?.hrv !== undefined) ? metrics.baseline.percentChange.hrv / 100 : 0
    const sleepDelta = (metrics && metrics.baseline?.percentChange?.deepSleep !== undefined) ? metrics.baseline.percentChange.deepSleep / 100 : 0
    const fullProto = (metrics && analysis) ? generateFullProtocol(metrics, analysis.pillar, analysis.severity, hrvDelta, sleepDelta) : null

    // Filter recipes by selected goal
    const displayRecipes = fullProto
        ? selectedGoal
            ? filterByGoal(fullProto.availableRecipes, selectedGoal)
            : fullProto.availableRecipes
        : []

    // ─── Fetch Gemini AI Clinical Insight ───
    useEffect(() => {
        if (state !== "synced" || !metrics || !fullProto || !analysis || aiInsight) return
        setAiLoading(true)
        const topRec = fullProto.availableRecipes[0] || null
        fetch('/api/whoop/clinical', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: sessionId || '',
                hrv: metrics.hrv, rhr: metrics.rhr, deepSleep: metrics.deepSleep, respRate: metrics.respRate,
                recoveryScore: metrics.recoveryScore || 0,
                spo2: metrics.spo2, skinTemp: metrics.skinTemp,
                remSleep: metrics.remSleep, sleepEfficiency: metrics.sleepEfficiency,
                sleepPerformance: metrics.sleepPerformance, sleepConsistency: metrics.sleepConsistency,
                sleepDebtMs: metrics.sleepDebtMs, disturbances: metrics.disturbances,
                dayStrain: metrics.dayStrain, workoutStrain: metrics.workoutStrain,
                workoutSport: metrics.workoutSport,
                capacityScore: fullProto.capacity.totalScore,
                capacityLevel: fullProto.capacity.level,
                capacityLabel: fullProto.capacity.label,
                dimensions: fullProto.capacity.dimensions.map(d => ({ name: d.name, score: d.score, maxScore: d.maxScore })),
                illnessWarning: fullProto.capacity.illnessWarning,
                safetyFlags: fullProto.capacity.safetyFlags,
                pillar: analysis.pillar, severity: analysis.severity, trigger: analysis.trigger,
                hrvDelta, sleepDelta,
                baselineHrv: metrics.baseline?.average?.hrv, baselineDeepSleep: metrics.baseline?.average?.deepSleep,
                massageName: fullProto.massage.name, massagePressure: fullProto.massage.pressure,
                recipeName: topRec?.name, recipeModality: topRec?.modality, recipeIntensity: topRec?.intensity,
                recipeSaunaTemp: topRec?.saunaTemp, recipeColdTemp: topRec?.coldTemp, recipeTotalTime: topRec?.totalTime,
            })
        })
            .then(r => r.json())
            .then(data => { if (data.success) setAiInsight(data.insight) })
            .catch(() => { /* non-critical */ })
            .finally(() => setAiLoading(false))
    }, [state, metrics, fullProto, analysis])

    // ─── Persist to Firestore (once per sync) ───
    useEffect(() => {
        if (state !== "synced" || !metrics || !fullProto || !analysis || savedSyncRef.current) return
        savedSyncRef.current = true

        const topRecipe = fullProto.availableRecipes[0] || null
        const cap = fullProto.capacity

        const logEntry: Record<string, any> = {
            clientId: member?.id || null,
            clientName: member?.name || null,
            platform: "guest_whoop",
            timestamp: serverTimestamp(),

            // Full biometrics (v9.0)
            metrics: {
                hrv: Math.round(metrics.hrv),
                rhr: Math.round(metrics.rhr),
                deepSleep: Math.round(metrics.deepSleep),
                respRate: Number(metrics.respRate?.toFixed(1)),
                recoveryScore: metrics.recoveryScore || 0,
                spo2: metrics.spo2 || 0,
                skinTemp: metrics.skinTemp || 0,
                remSleep: metrics.remSleep || 0,
                sleepEfficiency: metrics.sleepEfficiency || 0,
                sleepPerformance: metrics.sleepPerformance || 0,
                sleepConsistency: metrics.sleepConsistency || 0,
                sleepDebtMs: metrics.sleepDebtMs || 0,
                sleepCycles: metrics.sleepCycles || 0,
                disturbances: metrics.disturbances || 0,
                dayStrain: metrics.dayStrain || 0,
                workoutStrain: metrics.workoutStrain || 0,
                workoutSport: metrics.workoutSport || '',
            },
            dataSource: metrics.dataSource || "unknown",

            // Analysis
            pillarName: analysis.pillar,
            severity: analysis.severity,
            trigger: analysis.trigger || null,
            score: cap.totalScore,

            // v9.0 Capacity
            capacity: {
                totalScore: cap.totalScore,
                level: cap.level,
                label: cap.label,
                dimensions: cap.dimensions.map(d => ({ name: d.name, score: d.score, maxScore: d.maxScore, insight: d.insight })),
                safetyFlags: cap.safetyFlags,
            },
            illnessWarning: cap.illnessWarning,
            clinicalNarrative: cap.clinicalNarrative,

            // Protocol
            massage: {
                name: fullProto.massage.name, nameTh: fullProto.massage.nameTh,
                modality: fullProto.massage.modality, pressure: fullProto.massage.pressure,
                duration: fullProto.massage.duration,
                herbs: fullProto.massage.herbs || null,
                oilBlend: fullProto.massage.oilBlend || null,
                thermalPairing: fullProto.massage.thermalPairing || null,
            },
            topRecipe: topRecipe ? { name: topRecipe.name, modality: topRecipe.modality, intensity: topRecipe.intensity, totalTime: topRecipe.totalTime, saunaTemp: topRecipe.saunaTemp, coldTemp: topRecipe.coldTemp } : null,
            recipesAvailable: fullProto.availableRecipes.length,
            engineVersion: fullProto.engineVersion,

            // Baseline
            baseline: metrics.baseline?.average || null,
            baselineDelta: metrics.baseline?.percentChange || null,
        }

        addDoc(collection(db, "biomarker_logs"), logEntry).catch(err =>
            console.error("❌ Failed to save biomarker log:", err)
        )
    }, [state, metrics, fullProto, analysis, member])

    return (
        <div>
            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl border-b px-5 py-3" style={{ background: "color-mix(in srgb, var(--g-bg) 80%, transparent)", borderColor: "var(--g-border)" }}>
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div className="text-lg font-serif" style={{ color: "var(--g-accent)" }}>{"\uD83D\uDC9A"} WHOOP</div>
                    <div className="flex items-center gap-1.5">
                        {(state === "synced" || state === "ready") && (
                            <button onClick={handleDisconnect}
                                className="p-2 rounded-full active:scale-90 transition-transform"
                                style={{ background: "var(--g-surface)" }}
                                title="Disconnect WHOOP">
                                <Unlink className="w-3.5 h-3.5" style={{ color: "var(--g-text-muted)" }} />
                            </button>
                        )}
                        {state === "synced" && (
                            <button onClick={handleSync} className="p-2 rounded-full active:scale-90 transition-transform" style={{ background: "var(--g-surface)" }}>
                                <RefreshCw className="w-4 h-4" style={{ color: "var(--g-text-muted)" }} />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="max-w-md mx-auto px-5 pt-5 pb-28 space-y-4">
                <AnimatePresence mode="wait">

                    {/* Loading */}
                    {state === "loading" && (
                        <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-20 gap-3">
                            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--g-accent)", borderTopColor: "transparent" }} />
                            <span className="text-xs" style={{ color: "var(--g-text-muted)" }}>Checking connection...</span>
                        </motion.div>
                    )}

                    {/* Not Connected */}
                    {state === "not_connected" && (
                        <motion.div key="nc" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-6 py-10">
                            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "2px dashed var(--g-border)" }}>
                                <Activity className="w-10 h-10" style={{ color: "var(--g-text-muted)" }} />
                            </div>
                            <div>
                                <div className="text-lg font-bold mb-1">Connect WHOOP</div>
                                <div className="text-xs leading-relaxed px-6" style={{ color: "var(--g-text-muted)" }}>
                                    Sync your wearable for personalized protocols
                                </div>
                            </div>
                            <button onClick={handleConnect} className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold active:scale-95 transition-transform"
                                style={{ background: "var(--g-accent)", color: "#000" }}>
                                Connect WHOOP <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                        </motion.div>
                    )}

                    {/* Ready */}
                    {state === "ready" && (
                        <motion.div key="ready" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-5 py-10">
                            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center" style={{ background: "rgba(52,211,153,0.08)", border: "2px solid rgba(52,211,153,0.2)" }}>
                                <Activity className="w-10 h-10" style={{ color: "#34d399" }} />
                            </div>
                            <div>
                                <div className="text-lg font-bold mb-1">WHOOP Connected</div>
                                <div className="text-xs" style={{ color: "var(--g-text-muted)" }}>Tap to sync your latest data</div>
                            </div>
                            <button onClick={handleSync} className="px-8 py-3 rounded-full font-bold text-sm active:scale-95 transition-transform"
                                style={{ background: "linear-gradient(135deg, #34d399, #06b6d4)", color: "#000" }}>
                                {"\uD83D\uDD04"} Sync WHOOP
                            </button>
                            {errorMsg && (
                                <div className="mx-4 p-3 rounded-xl text-xs leading-relaxed" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                                    ⚠️ {errorMsg}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Syncing */}
                    {state === "syncing" && (
                        <motion.div key="syncing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-20 gap-3">
                            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#34d399", borderTopColor: "transparent" }} />
                            <span className="text-sm" style={{ color: "var(--g-text-muted)" }}>Syncing WHOOP data...</span>
                        </motion.div>
                    )}

                    {/* ═══ Synced Dashboard ═══ */}
                    {state === "synced" && metrics && fullProto && (
                        <motion.div key="synced" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

                            {/* Recovery + Metrics Strip */}
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="rounded-xl p-3 flex items-center gap-3"
                                style={{ background: rc.bg, border: `1px solid ${rc.c}20` }}>
                                {/* Recovery badge */}
                                <div className="text-center shrink-0">
                                    <div className="text-3xl font-black font-mono leading-none" style={{ color: rc.c }}>{recovery}%</div>
                                    <div className="text-[7px] uppercase tracking-widest font-bold mt-0.5" style={{ color: rc.c, opacity: 0.6 }}>Recovery</div>
                                </div>
                                {/* Divider */}
                                <div className="w-px h-10 shrink-0" style={{ background: `${rc.c}30` }} />
                                {/* 4 metrics inline */}
                                <div className="flex-1 grid grid-cols-4 gap-1">
                                    {[
                                        { l: "HRV", v: `${Math.round(metrics.hrv)}`, u: "ms", d: metrics.baseline?.percentChange?.hrv },
                                        { l: "RHR", v: `${Math.round(metrics.rhr)}`, u: "bpm" },
                                        { l: "Sleep", v: `${Math.round(metrics.deepSleep)}`, u: "m", d: metrics.baseline?.percentChange?.deepSleep },
                                        { l: "Resp", v: `${metrics.respRate?.toFixed(1)}`, u: "" },
                                    ].map(m => (
                                        <div key={m.l} className="text-center">
                                            <div className="text-[7px] uppercase tracking-wider" style={{ color: "var(--g-text-muted)" }}>{m.l}</div>
                                            <div className="text-sm font-mono font-bold leading-tight">{m.v}<span className="text-[7px] font-normal" style={{ color: "var(--g-text-muted)" }}>{m.u}</span></div>
                                            {m.d !== undefined && (
                                                <div className="text-[7px] font-mono" style={{ color: m.d >= 0 ? "#34d399" : "#f87171" }}>{m.d > 0 ? "+" : ""}{m.d}%</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {/* Source dot */}
                                <div className="flex flex-col items-center shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: src.c }} />
                                    <span className="text-[6px] font-mono uppercase mt-0.5" style={{ color: src.c }}>{src.l}</span>
                                </div>
                            </motion.div>

                            {/* ═══ CAPACITY ASSESSMENT (6 dimensions) ═══ */}
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                                className="rounded-xl overflow-hidden" style={{ background: "var(--g-surface)", border: "1px solid var(--g-border)" }}>
                                {/* Header */}
                                <div className="p-3 flex items-center justify-between">
                                    <div>
                                        <div className="text-[8px] uppercase tracking-widest font-bold" style={{ color: "var(--g-text-muted)" }}>Body Capacity Score</div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-2xl font-black font-mono" style={{ color: capacityColor(fullProto.capacity.level) }}>
                                                {fullProto.capacity.totalScore}
                                            </span>
                                            <span className="text-[10px] font-mono" style={{ color: "var(--g-text-muted)" }}>/100</span>
                                            <span className="text-[7px] uppercase px-1.5 py-0.5 rounded-full font-bold ml-1" style={{
                                                background: `${capacityColor(fullProto.capacity.level)}20`,
                                                color: capacityColor(fullProto.capacity.level)
                                            }}>
                                                Level {fullProto.capacity.level} {"\u2022"} {fullProto.capacity.label}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-black font-mono" style={{ color: capacityColor(fullProto.capacity.level) }}>
                                            {fullProto.availableRecipes.length}
                                        </div>
                                        <div className="text-[7px]" style={{ color: "var(--g-text-muted)" }}>recipes{"\n"}available</div>
                                    </div>
                                </div>

                                {/* 6 Dimension Bars */}
                                <div className="border-t px-3 py-2 space-y-2" style={{ borderColor: "var(--g-border)", background: "var(--g-bg)" }}>
                                    {fullProto.capacity.dimensions.map((dim, idx) => (
                                        <motion.div key={dim.name}
                                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3 + idx * 0.08 }}>
                                            <div className="flex items-center justify-between mb-0.5">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px]">{dim.icon}</span>
                                                    <span className="text-[9px] font-bold">{dim.name}</span>
                                                </div>
                                                <span className="text-[9px] font-mono font-bold" style={{ color: dimColor(dim.score, dim.maxScore) }}>
                                                    {dim.score}/{dim.maxScore}
                                                </span>
                                            </div>
                                            {/* Progress bar */}
                                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--g-border)" }}>
                                                <motion.div
                                                    className="h-full rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(dim.score / dim.maxScore) * 100}%` }}
                                                    transition={{ delay: 0.4 + idx * 0.1, duration: 0.5 }}
                                                    style={{ background: dimColor(dim.score, dim.maxScore) }}
                                                />
                                            </div>
                                            <div className="text-[8px] mt-0.5" style={{ color: "var(--g-text-muted)" }}>{dim.insight}</div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Illness Warning */}
                            {fullProto.capacity.illnessWarning?.active && (() => {
                                const iw = fullProto.capacity.illnessWarning
                                const iwc = iw.severity === 'danger' ? '#ef4444' : iw.severity === 'caution' ? '#f97316' : '#fbbf24'
                                return (
                                    <div className="rounded-xl p-3" style={{ background: `${iwc}08`, border: `1px solid ${iwc}20` }}>
                                        <div className="text-[9px] uppercase tracking-wider font-bold mb-1" style={{ color: iwc }}>
                                            {iw.severity === 'danger' ? '🚨' : iw.severity === 'caution' ? '⚠️' : '👁️'} Illness {iw.severity === 'danger' ? 'Alert' : iw.severity === 'caution' ? 'Warning' : 'Watch'}
                                        </div>
                                        {iw.signals.map((s: string) => (
                                            <div key={s} className="text-[10px] leading-relaxed" style={{ color: `${iwc}cc` }}>• {s}</div>
                                        ))}
                                        {iw.recommendation && (
                                            <div className="text-[10px] mt-1.5 font-medium" style={{ color: iwc }}>{iw.recommendation}</div>
                                        )}
                                    </div>
                                )
                            })()}

                            {/* AI Clinical Insight (Gemini-powered) */}
                            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                                className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.15)' }}>
                                {/* Header */}
                                <div className="px-3.5 py-2 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.06))' }}>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[8px] uppercase tracking-widest font-bold" style={{ color: '#818cf8' }}>🩺 Clinical Intelligence</span>
                                        {aiInsight?.riskLevel && (
                                            <span className="w-1.5 h-1.5 rounded-full" style={{
                                                background: aiInsight.riskLevel === 'red' ? '#ef4444' : aiInsight.riskLevel === 'amber' ? '#f59e0b' : '#34d399'
                                            }} />
                                        )}
                                    </div>
                                    <span className="text-[7px] font-mono" style={{ color: 'var(--g-text-muted)', opacity: 0.5 }}>
                                        {aiInsight ? '✨ AI' : aiLoading ? 'analyzing...' : 'v9.0'}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="px-3.5 py-3 space-y-2" style={{ background: 'rgba(99,102,241,0.03)' }}>
                                    {aiLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: '#818cf8', borderTopColor: 'transparent' }} />
                                            <span className="text-[10px]" style={{ color: 'var(--g-text-muted)' }}>AI analyzing your biometrics...</span>
                                        </div>
                                    ) : aiInsight ? (
                                        <>
                                            {/* Thai narrative */}
                                            {aiInsight.narrativeTh && (
                                                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--g-text-primary)' }}>{aiInsight.narrativeTh}</p>
                                            )}
                                            {/* English narrative */}
                                            <p className="text-[10px] leading-relaxed" style={{ color: 'var(--g-text-secondary)' }}>{aiInsight.narrative}</p>

                                            {/* Protocol reasoning */}
                                            {aiInsight.protocolReasoningTh && (
                                                <div className="pt-2 mt-2" style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}>
                                                    <div className="text-[7px] uppercase tracking-widest font-bold mb-1" style={{ color: '#a855f7' }}>💡 Why This Protocol</div>
                                                    <p className="text-[10px] leading-relaxed" style={{ color: 'var(--g-text-muted)' }}>{aiInsight.protocolReasoningTh}</p>
                                                </div>
                                            )}

                                            {/* Action items */}
                                            {aiInsight.actionItems?.length > 0 && (
                                                <div className="pt-2 mt-1" style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}>
                                                    <div className="text-[7px] uppercase tracking-widest font-bold mb-1" style={{ color: '#34d399' }}>✅ Today</div>
                                                    {aiInsight.actionItems.map((item: string, i: number) => (
                                                        <div key={i} className="text-[10px] leading-relaxed" style={{ color: 'var(--g-text-muted)' }}>• {item}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : fullProto.capacity.clinicalNarrative ? (
                                        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--g-text-secondary)' }}>{fullProto.capacity.clinicalNarrative}</p>
                                    ) : null}
                                </div>
                            </motion.div>

                            {/* Safety Flags */}
                            {fullProto.capacity.safetyFlags.length > 0 && (
                                <div className="rounded-xl p-3" style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.12)" }}>
                                    <div className="text-[9px] uppercase tracking-wider font-bold mb-1" style={{ color: "#f87171" }}>{"\u26A0\uFE0F"} Safety Flags</div>
                                    {fullProto.capacity.safetyFlags.map((f: string) => (
                                        <div key={f} className="text-[10px] leading-relaxed" style={{ color: "#fca5a5" }}>{f}</div>
                                    ))}
                                </div>
                            )}

                            {/* Bodywork Treatment */}
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                                className="rounded-xl overflow-hidden" style={{ background: "var(--g-surface)", border: "1px solid var(--g-border)" }}>
                                {/* Header */}
                                <div className="p-3.5 pb-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span>{
                                                fullProto.massage.modality === 'tok_sen' ? '🪵' :
                                                    fullProto.massage.modality === 'herbal_compress' ? '🌿' :
                                                        fullProto.massage.modality === 'nuad_thai' ? '🙏' :
                                                            fullProto.massage.modality === 'aromatherapy' ? '🌸' :
                                                                fullProto.massage.modality === 'royal_thai' ? '👑' :
                                                                    fullProto.massage.modality === 'foot_reflexology' ? '🦶' :
                                                                        fullProto.massage.modality === 'guasha' ? '🪨' :
                                                                            fullProto.massage.modality === 'cupping' ? '🔴' :
                                                                                fullProto.massage.modality === 'craniosacral' ? '🧠' :
                                                                                    fullProto.massage.modality === 'lymphatic' ? '💧' :
                                                                                        fullProto.massage.modality === 'sports' ? '💪' :
                                                                                            '✋'
                                            }</span>
                                            <div>
                                                <span className="text-xs font-bold">{fullProto.massage.name}</span>
                                                {fullProto.massage.nameTh && (
                                                    <span className="text-[9px] ml-1.5" style={{ color: "var(--g-text-muted)" }}>{fullProto.massage.nameTh}</span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-[7px] uppercase px-1.5 py-0.5 rounded-full" style={{ background: "var(--g-bg)", color: "var(--g-text-muted)", border: "1px solid var(--g-border)" }}>
                                            {fullProto.massage.pressure} {"·"} {fullProto.massage.duration}m
                                        </span>
                                    </div>

                                    {/* Pillar detection */}
                                    {analysis && (() => {
                                        const ps = pillarStyle(analysis.pillar)
                                        return (
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <span className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-bold" style={{
                                                    background: ps.bg, color: ps.c, border: `1px solid ${ps.c}25`
                                                }}>
                                                    {ps.icon} {analysis.pillar} {"·"} {analysis.severity}
                                                </span>
                                                <span className="text-[7px] uppercase px-1.5 py-0.5 rounded-full font-bold" style={{
                                                    background: 'rgba(251,191,36,0.06)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.15)'
                                                }}>
                                                    {fullProto.massage.modality?.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        )
                                    })()}
                                    {analysis?.trigger && (
                                        <div className="text-[9px] mb-1.5 leading-relaxed" style={{ color: "var(--g-text-muted)" }}>
                                            {"🔍"} {analysis.trigger}
                                        </div>
                                    )}
                                    <p className="text-[10px] italic mb-1.5" style={{ color: "var(--g-text-muted)" }}>{fullProto.massage.subtitle}</p>
                                    <p className="text-[11px] leading-relaxed mb-2" style={{ color: "var(--g-text-secondary)" }}>{fullProto.massage.detail}</p>
                                </div>

                                {/* Details section */}
                                <div className="border-t px-3.5 py-2.5 space-y-2" style={{ borderColor: "var(--g-border)", background: "var(--g-bg)" }}>
                                    {/* Focus areas */}
                                    <div className="flex flex-wrap gap-1">
                                        {fullProto.massage.focusAreas.map((a: string) => (
                                            <span key={a} className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                                                style={{ background: "rgba(129,140,248,0.06)", color: "#818cf8", border: "1px solid rgba(129,140,248,0.1)" }}>{a}</span>
                                        ))}
                                    </div>

                                    {/* Herbs (for herbal treatments) */}
                                    {fullProto.massage.herbs && fullProto.massage.herbs.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            <span className="text-[7px] mr-0.5" style={{ color: "var(--g-text-muted)" }}>🌿</span>
                                            {fullProto.massage.herbs.map((h: string) => (
                                                <span key={h} className="text-[7px] px-1.5 py-0.5 rounded-full"
                                                    style={{ background: "rgba(52,211,153,0.06)", color: "#34d399", border: "1px solid rgba(52,211,153,0.1)" }}>{h}</span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Oil blend (for aromatherapy) */}
                                    {fullProto.massage.oilBlend && (
                                        <div className="text-[9px]" style={{ color: "#a855f7" }}>🌸 {fullProto.massage.oilBlend}</div>
                                    )}

                                    {/* Thermal pairing */}
                                    {fullProto.massage.thermalPairing && (
                                        <div className="text-[9px]" style={{ color: "#fbbf24" }}>🔥 {fullProto.massage.thermalPairing}</div>
                                    )}

                                    {/* Rationale */}
                                    <div className="text-[9px] italic leading-relaxed" style={{ color: "var(--g-text-muted)" }}>{"📖"} {fullProto.massage.rationale}</div>
                                </div>
                            </motion.div>

                            {/* ═══ THERMAL RECIPES ═══ */}
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                                <div className="text-[8px] uppercase tracking-widest font-bold mb-2" style={{ color: "var(--g-text-muted)" }}>
                                    {"\uD83D\uDD25\u2744\uFE0F"} Thermal Recipes {"\u2014"} Choose Your Goal
                                </div>

                                {/* Goal Filter Pills */}
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    <button
                                        onClick={() => setSelectedGoal(null)}
                                        className="text-[9px] px-2 py-1 rounded-full font-bold transition-all active:scale-95"
                                        style={{
                                            background: !selectedGoal ? "var(--g-accent)" : "var(--g-surface)",
                                            color: !selectedGoal ? "#000" : "var(--g-text-muted)",
                                            border: `1px solid ${!selectedGoal ? "var(--g-accent)" : "var(--g-border)"}`
                                        }}>
                                        All ({fullProto.availableRecipes.length})
                                    </button>
                                    {GOAL_OPTIONS.map(g => {
                                        const count = filterByGoal(fullProto.availableRecipes, g.key).length
                                        if (count === 0) return null
                                        return (
                                            <button key={g.key}
                                                onClick={() => setSelectedGoal(selectedGoal === g.key ? null : g.key)}
                                                className="text-[9px] px-2 py-1 rounded-full font-bold transition-all active:scale-95"
                                                style={{
                                                    background: selectedGoal === g.key ? "var(--g-accent)" : "var(--g-surface)",
                                                    color: selectedGoal === g.key ? "#000" : "var(--g-text-muted)",
                                                    border: `1px solid ${selectedGoal === g.key ? "var(--g-accent)" : "var(--g-border)"}`
                                                }}>
                                                {g.icon} {g.label} ({count})
                                            </button>
                                        )
                                    })}
                                </div>

                                {/* Recipe Cards */}
                                <div className="space-y-2">
                                    {displayRecipes.map((recipe, idx) => {
                                        const mc = modalityColor(recipe.modality)
                                        const ic = intensityStyle(recipe.intensity)
                                        const isExpanded = expandedRecipe === recipe.id
                                        return (
                                            <div key={recipe.id}
                                                className="rounded-xl overflow-hidden"
                                                style={{
                                                    background: "var(--g-surface)", border: "1px solid var(--g-border)",
                                                    contain: "content",
                                                }}>
                                                {/* Header */}
                                                <button onClick={() => setExpandedRecipe(isExpanded ? null : recipe.id)}
                                                    className="w-full text-left p-3 flex items-center gap-3 active:scale-[0.99] transition-transform">
                                                    <span className="text-lg">{recipe.icon}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 mb-0.5">
                                                            <span className="text-xs font-bold truncate">{recipe.name}</span>
                                                            <span className="text-[6px] uppercase px-1 py-0.5 rounded-full font-bold shrink-0"
                                                                style={{ background: mc.bg, color: mc.c }}>
                                                                {recipe.modality === 'sauna_only' ? 'SAUNA' : recipe.modality === 'cold_only' ? 'COLD' : 'CONTRAST'}
                                                            </span>
                                                            <span className="text-[6px] uppercase px-1 py-0.5 rounded-full font-bold shrink-0"
                                                                style={{ background: ic.bg, color: ic.c }}>
                                                                {recipe.intensity}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1 flex-wrap">
                                                            {recipe.goalLabels.map(g => (
                                                                <span key={g} className="text-[8px]" style={{ color: "var(--g-text-muted)" }}>{g}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-[9px] font-mono" style={{ color: "var(--g-text-muted)" }}>{recipe.totalTime}m</span>
                                                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--g-text-muted)" }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--g-text-muted)" }} />}
                                                    </div>
                                                </button>

                                                {/* Expanded Detail */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden">

                                                            <div className="px-3 pb-2">
                                                                <p className="text-[10px] leading-relaxed" style={{ color: "var(--g-text-secondary)" }}>
                                                                    {recipe.whyThisWorks}
                                                                </p>
                                                            </div>

                                                            <div className="border-t px-3 py-2.5" style={{ borderColor: "var(--g-border)", background: "var(--g-bg)" }}>
                                                                {(recipe.saunaTemp > 0 || recipe.coldTemp > 0) && (
                                                                    <div className={`grid ${recipe.saunaTemp > 0 && recipe.coldTemp > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mb-2`}>
                                                                        {recipe.saunaTemp > 0 && (
                                                                            <div className="rounded-lg p-2 text-center" style={{ background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.1)" }}>
                                                                                <div className="text-base font-mono font-bold" style={{ color: "#fb923c" }}>{recipe.saunaTemp}{"\u00B0C"}</div>
                                                                                <div className="text-[8px]" style={{ color: "var(--g-text-muted)" }}>{"\uD83E\uDDD6"} Sauna {"\u00B7"} {recipe.saunaDuration}m</div>
                                                                            </div>
                                                                        )}
                                                                        {recipe.coldTemp > 0 && (
                                                                            <div className="rounded-lg p-2 text-center" style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.1)" }}>
                                                                                <div className="text-base font-mono font-bold" style={{ color: "#38bdf8" }}>{recipe.coldTemp}{"\u00B0C"}</div>
                                                                                <div className="text-[8px]" style={{ color: "var(--g-text-muted)" }}>
                                                                                    {recipe.coldEquipment === 'ice_bath' ? '\uD83E\uDDCA Ice Bath' : '\uD83D\uDCA7 Plunge'} {"\u00B7"} {recipe.coldDuration}m
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center justify-between text-[9px]" style={{ color: "var(--g-text-muted)" }}>
                                                                    <span>{"\uD83D\uDD04"} {recipe.sets} set{recipe.sets > 1 ? 's' : ''}</span>
                                                                    {recipe.restBetween > 0 && <span>{"\u23F8"} {recipe.restBetween}m rest</span>}
                                                                    {recipe.endOnCold && <span style={{ color: "#38bdf8" }}>{"\u2744\uFE0F"} End cold</span>}
                                                                    <span>{"\u23F1"} {recipe.totalTime}m total</span>
                                                                </div>
                                                            </div>

                                                            <div className="px-3 py-2 border-t" style={{ borderColor: "var(--g-border)" }}>
                                                                <div className="text-[9px] italic" style={{ color: "var(--g-text-muted)" }}>{"\uD83D\uDCA1"} {recipe.proTip}</div>
                                                            </div>

                                                            <div className="px-3 py-2 border-t" style={{ borderColor: "var(--g-border)" }}>
                                                                <div className="text-[7px] uppercase tracking-widest font-bold mb-1" style={{ color: "var(--g-text-muted)" }}>{"\uD83D\uDD2C"} Science</div>
                                                                {recipe.scienceNotes.map((n, i) => (
                                                                    <div key={i} className="text-[8px] leading-relaxed" style={{ color: "var(--g-text-muted)" }}>{"\u2022"} {n}</div>
                                                                ))}
                                                            </div>

                                                            <div className="px-3 py-2 border-t flex items-center justify-between" style={{ borderColor: "var(--g-border)" }}>
                                                                <span className="text-[8px]" style={{ color: "var(--g-text-muted)" }}>S{"\u00F8"}berg Weekly</span>
                                                                <div className="flex items-center gap-2">
                                                                    {recipe.weeklyContribution.heatMin > 0 && (
                                                                        <span className="text-[8px] font-mono" style={{ color: "#fb923c" }}>{"\uD83D\uDD25"} {recipe.weeklyContribution.heatMin}/57m</span>
                                                                    )}
                                                                    {recipe.weeklyContribution.coldMin > 0 && (
                                                                        <span className="text-[8px] font-mono" style={{ color: "#38bdf8" }}>{"\u2744\uFE0F"} {recipe.weeklyContribution.coldMin}/11m</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )
                                    })}

                                    {displayRecipes.length === 0 && (
                                        <div className="text-center py-6 text-xs" style={{ color: "var(--g-text-muted)" }}>
                                            No recipes match this goal at your current capacity
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* Engine Version */}
                            <div className="text-center text-[8px] font-mono" style={{ color: "var(--g-text-muted)" }}>
                                {fullProto.engineVersion} {"\u00B7"} Score {fullProto.capacity.totalScore}/100 {"\u00B7"} Level {fullProto.capacity.level}
                            </div>



                            {/* Last Synced */}
                            {lastSynced && (
                                <div className="text-center text-[9px] pb-2" style={{ color: "var(--g-text-muted)" }}>
                                    Synced: {new Date(lastSynced).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
                            )}

                        </motion.div>
                    )}

                    {/* Error */}
                    {state === "error" && (
                        <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                            <div className="text-3xl mb-3">{"\u26A0\uFE0F"}</div>
                            <div className="text-sm mb-1">Connection Error</div>
                            <div className="text-xs mb-4" style={{ color: "var(--g-text-muted)" }}>Unable to connect</div>
                            <button onClick={() => { setState("loading"); location.reload() }}
                                className="px-5 py-2 rounded-xl text-xs font-bold" style={{ background: "var(--g-surface)", border: "1px solid var(--g-border)" }}>
                                Retry
                            </button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    )
}
