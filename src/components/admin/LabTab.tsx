"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Trash2, X, Activity, TrendingUp, Users, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirestoreCRUD } from "@/hooks/useFirestore"
import { Session } from "@/types"

interface LabTabProps {
    sessions: Session[]
}

// ─── Helpers ─────────────────────────
const rcColor = (s: number) =>
    s >= 67 ? { c: "text-emerald-400", bg: "bg-emerald-500/15", label: "High" }
        : s >= 34 ? { c: "text-amber-400", bg: "bg-amber-500/15", label: "Moderate" }
            : { c: "text-red-400", bg: "bg-red-500/15", label: "Low" }

const capacityColor = (level: number) =>
    level >= 6 ? "text-cyan-300" : level >= 5 ? "text-emerald-400" : level >= 4 ? "text-cyan-400" : level >= 3 ? "text-amber-400" : level >= 2 ? "text-orange-400" : "text-red-400"

const capacityBg = (level: number) =>
    level >= 6 ? "bg-cyan-400/15" : level >= 5 ? "bg-emerald-500/15" : level >= 4 ? "bg-cyan-500/15" : level >= 3 ? "bg-amber-500/15" : level >= 2 ? "bg-orange-500/15" : "bg-red-500/15"

const modalityIcon = (m?: string) =>
    m === "sauna_only" ? "🔥" : m === "cold_only" ? "❄️" : "🔄"

const sourceBadge = (ds?: string) => {
    if (ds === "whoop_v2_live") return { label: "Live", color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" }
    if (ds === "firestore_cache") return { label: "Cached", color: "text-amber-400 bg-amber-500/15 border-amber-500/30" }
    return { label: "Legacy", color: "text-white/40 bg-white/5 border-white/10" }
}

const formatTime = (ts: any) => {
    if (!ts) return { time: "--:--", date: "" }
    const d = ts.toDate ? new Date(ts.toDate()) : new Date(ts)
    return {
        time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }
}

export function LabTab({ sessions }: LabTabProps) {
    const sessionOps = useFirestoreCRUD("biomarker_logs")
    const [viewingSession, setViewingSession] = useState<Session | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)
    const [filterSource, setFilterSource] = useState<string | null>(null)

    const toggleSelect = (id: string) => setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
    const toggleSelectAll = () => setSelectedIds(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(s => s.id)))

    const handleBulkDelete = async () => {
        if (!selectedIds.size || !confirm(`Delete ${selectedIds.size} session${selectedIds.size > 1 ? 's' : ''}?`)) return
        setIsDeleting(true)
        for (const id of selectedIds) await sessionOps.remove(id)
        setSelectedIds(new Set())
        setIsDeleting(false)
    }

    // Filter
    const filtered = filterSource ? sessions.filter(s => s.dataSource === filterSource) : sessions

    // ═══ Aggregate Insights ═══
    const insights = useMemo(() => {
        const todayStr = new Date().toLocaleDateString("en-CA")
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)

        const todaySessions = sessions.filter(s => {
            if (!s.timestamp) return false
            const d = s.timestamp.toDate ? new Date(s.timestamp.toDate()) : new Date(s.timestamp)
            return d.toLocaleDateString("en-CA") === todayStr
        })

        const weekSessions = sessions.filter(s => {
            if (!s.timestamp) return false
            const d = s.timestamp.toDate ? new Date(s.timestamp.toDate()) : new Date(s.timestamp)
            return d >= weekAgo
        })

        // Average recovery
        const recoveries = weekSessions
            .map(s => s.metrics?.recoveryScore)
            .filter((r): r is number => typeof r === "number" && r > 0)
        const avgRecovery = recoveries.length > 0 ? Math.round(recoveries.reduce((a, b) => a + b, 0) / recoveries.length) : 0

        // Average capacity
        const capacities = weekSessions
            .map(s => s.capacity?.totalScore || s.score)
            .filter((c): c is number => typeof c === "number" && c > 0)
        const avgCapacity = capacities.length > 0 ? Math.round(capacities.reduce((a, b) => a + b, 0) / capacities.length) : 0

        // Most common pillar
        const pillarCounts: Record<string, number> = {}
        weekSessions.forEach(s => {
            if (s.pillarName) pillarCounts[s.pillarName] = (pillarCounts[s.pillarName] || 0) + 1
        })
        const topPillar = Object.entries(pillarCounts).sort((a, b) => b[1] - a[1])[0]

        // Unique guests
        const uniqueEmails = new Set(weekSessions.filter(s => s.email).map(s => s.email))

        // Live vs legacy
        const liveCount = sessions.filter(s => s.dataSource === "whoop_v2_live").length
        const legacyCount = sessions.filter(s => !s.dataSource || s.dataSource === "whoop_scan").length

        return {
            todayCount: todaySessions.length,
            weekCount: weekSessions.length,
            avgRecovery,
            avgCapacity,
            topPillar: topPillar ? topPillar[0] : "—",
            topPillarCount: topPillar ? topPillar[1] : 0,
            uniqueGuests: uniqueEmails.size,
            liveCount,
            legacyCount,
            totalCount: sessions.length,
        }
    }, [sessions])

    return (
        <div className="space-y-8">
            <div>
                <h2 className="font-serif text-2xl text-foreground mb-1">The Alchemist&apos;s Lab</h2>
                <p className="text-sm text-foreground/60">v8.1 Capacity Engine · Biometric intelligence & guest physiology</p>
            </div>

            {/* ═══ Insight Cards ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#042A40]/30 border border-primary/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-primary/50" />
                        <span className="text-[9px] uppercase tracking-widest text-foreground/40 font-bold">Today</span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-foreground">{insights.todayCount}</div>
                    <div className="text-[10px] text-foreground/30">{insights.weekCount} this week</div>
                </div>
                <div className="bg-[#042A40]/30 border border-primary/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400/50" />
                        <span className="text-[9px] uppercase tracking-widest text-foreground/40 font-bold">Avg Recovery</span>
                    </div>
                    <div className={`text-2xl font-mono font-bold ${rcColor(insights.avgRecovery).c}`}>
                        {insights.avgRecovery > 0 ? `${insights.avgRecovery}%` : "—"}
                    </div>
                    <div className="text-[10px] text-foreground/30">Capacity avg: {insights.avgCapacity || "—"}/100</div>
                </div>
                <div className="bg-[#042A40]/30 border border-primary/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-amber-400/50" />
                        <span className="text-[9px] uppercase tracking-widest text-foreground/40 font-bold">Top Pillar</span>
                    </div>
                    <div className="text-lg font-bold text-foreground truncate">{insights.topPillar}</div>
                    <div className="text-[10px] text-foreground/30">{insights.topPillarCount} sessions</div>
                </div>
                <div className="bg-[#042A40]/30 border border-primary/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-cyan-400/50" />
                        <span className="text-[9px] uppercase tracking-widest text-foreground/40 font-bold">Guests</span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-foreground">{insights.uniqueGuests}</div>
                    <div className="text-[10px] text-foreground/30">
                        {insights.liveCount} live · {insights.legacyCount} legacy
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] uppercase tracking-widest text-foreground/30 font-bold mr-2">Source</span>
                {[
                    { key: null, label: `All (${sessions.length})` },
                    { key: "whoop_v2_live", label: `Live (${insights.liveCount})` },
                    { key: "legacy", label: `Legacy (${insights.legacyCount})` },
                ].map(f => (
                    <button
                        key={f.key || "all"}
                        onClick={() => setFilterSource(f.key === "legacy" ? null : f.key)} // simplified: null = all
                        className={`text-[10px] px-3 py-1 rounded-full font-bold transition-all ${filterSource === f.key ? "bg-primary text-background" : "bg-white/5 text-foreground/40 hover:text-foreground/70 border border-white/10"}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Bulk Delete */}
            {selectedIds.size > 0 && (
                <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <span className="text-sm text-red-300">{selectedIds.size} selected</span>
                    <Button onClick={handleBulkDelete} disabled={isDeleting} className="bg-red-500 hover:bg-red-600 text-white">
                        <Trash2 className="w-4 h-4 mr-2" />{isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                </div>
            )}

            {/* ═══ Sessions Table ═══ */}
            <div className="bg-[#042A40]/30 backdrop-blur-md border border-primary/10 rounded-[2rem] overflow-x-auto shadow-2xl">
                <table className="w-full text-left">
                    <thead className="bg-[#0F2E2E]/60 border-b border-primary/10">
                        <tr>
                            <th className="p-4 w-10"><input type="checkbox" checked={filtered.length > 0 && selectedIds.size === filtered.length} onChange={toggleSelectAll} className="w-4 h-4 rounded cursor-pointer" /></th>
                            <th className="p-4 text-[9px] uppercase tracking-widest text-foreground/40 font-bold">When</th>
                            <th className="p-4 text-[9px] uppercase tracking-widest text-foreground/40 font-bold">Guest</th>
                            <th className="p-4 text-[9px] uppercase tracking-widest text-foreground/40 font-bold">Recovery</th>
                            <th className="p-4 text-[9px] uppercase tracking-widest text-foreground/40 font-bold">Capacity</th>
                            <th className="p-4 text-[9px] uppercase tracking-widest text-foreground/40 font-bold hidden lg:table-cell">Pillar</th>
                            <th className="p-4 text-[9px] uppercase tracking-widest text-foreground/40 font-bold hidden lg:table-cell">Protocol</th>
                            <th className="p-4 text-[9px] uppercase tracking-widest text-foreground/40 font-bold hidden md:table-cell">Metrics</th>
                            <th className="p-4 text-[9px] uppercase tracking-widest text-foreground/40 font-bold text-right">Source</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                        {filtered.map(s => {
                            const t = formatTime(s.timestamp)
                            const rec = s.metrics?.recoveryScore || 0
                            const rc = rcColor(rec)
                            const cap = s.capacity?.totalScore || s.score || 0
                            const capLevel = s.capacity?.level || 0
                            const src = sourceBadge(s.dataSource)
                            return (
                                <tr key={s.id} className={`hover:bg-primary/5 transition-colors cursor-pointer ${selectedIds.has(s.id) ? "bg-primary/10" : ""}`}>
                                    <td className="p-4 w-10" onClick={e => e.stopPropagation()}>
                                        <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} className="w-4 h-4 rounded cursor-pointer" />
                                    </td>
                                    <td className="p-4" onClick={() => setViewingSession(s)}>
                                        <div className="text-xs font-mono text-foreground/60">{t.time}</div>
                                        <div className="text-[10px] text-foreground/30">{t.date}</div>
                                    </td>
                                    <td className="p-4" onClick={() => setViewingSession(s)}>
                                        <div className="text-sm font-medium truncate max-w-[140px]">{s.clientName || s.email || "Guest"}</div>
                                        {s.clientName && s.email && <div className="text-[10px] text-foreground/30 truncate max-w-[140px]">{s.email}</div>}
                                    </td>
                                    <td className="p-4" onClick={() => setViewingSession(s)}>
                                        {rec > 0 ? (
                                            <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded-full ${rc.bg} ${rc.c}`}>{rec}%</span>
                                        ) : (
                                            <span className="text-foreground/20 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="p-4" onClick={() => setViewingSession(s)}>
                                        {cap > 0 ? (
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-mono font-bold ${capacityColor(capLevel)}`}>{cap}</span>
                                                <span className="text-[9px] text-foreground/30">/100</span>
                                                {capLevel > 0 && <span className={`text-[8px] uppercase px-1.5 py-0.5 rounded-full font-bold ${capacityBg(capLevel)} ${capacityColor(capLevel)}`}>L{capLevel}</span>}
                                            </div>
                                        ) : (
                                            <span className="text-foreground/20 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="p-4 hidden lg:table-cell" onClick={() => setViewingSession(s)}>
                                        <span className="px-2 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold border border-white/10 bg-white/5">{s.pillarName || "—"}</span>
                                        {s.severity && <div className="text-[9px] text-foreground/30 mt-0.5 capitalize">{s.severity}</div>}
                                    </td>
                                    <td className="p-4 hidden lg:table-cell" onClick={() => setViewingSession(s)}>
                                        {s.topRecipe ? (
                                            <div>
                                                <div className="text-[10px] font-medium truncate max-w-[120px]">{modalityIcon(s.topRecipe.modality)} {s.topRecipe.name}</div>
                                                <div className="text-[9px] text-foreground/30">{s.topRecipe.totalTime}m · {s.topRecipe.intensity}</div>
                                            </div>
                                        ) : s.massage ? (
                                            <div className="text-[10px] font-medium truncate max-w-[120px]">✋ {s.massage.name}</div>
                                        ) : (
                                            <span className="text-foreground/20 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="p-4 hidden md:table-cell" onClick={() => setViewingSession(s)}>
                                        <div className="font-mono text-[10px] text-foreground/50 space-x-2">
                                            <span>♥{Math.round(s.metrics?.hrv || 0)}</span>
                                            <span>⚡{Math.round(s.metrics?.rhr || 0)}</span>
                                            <span>💤{Math.round(s.metrics?.deepSleep || 0)}m</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right" onClick={() => setViewingSession(s)}>
                                        <span className={`text-[8px] uppercase px-2 py-0.5 rounded-full font-bold border ${src.color}`}>{src.label}</span>
                                    </td>
                                </tr>
                            )
                        })}
                        {filtered.length === 0 && (
                            <tr><td colSpan={9} className="p-12 text-center text-foreground/30 italic text-sm">No analysis sessions recorded yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ═══ Session Detail Modal ═══ */}
            <AnimatePresence>
                {viewingSession && (() => {
                    const s = viewingSession
                    const t = formatTime(s.timestamp)
                    const rec = s.metrics?.recoveryScore || 0
                    const rc = rcColor(rec)
                    const cap = s.capacity
                    const src = sourceBadge(s.dataSource)

                    return (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-lg bg-gradient-to-b from-[#0c2627] to-[#051818] border border-white/10 rounded-3xl p-6 shadow-2xl my-8 space-y-5">

                                {/* Header */}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest text-white/40 mb-0.5">{t.date} · {t.time}</p>
                                        <h2 className="text-xl font-serif text-white">{s.clientName || s.email || "Guest"}</h2>
                                        {s.clientName && s.email && <p className="text-[10px] text-white/30">{s.email}</p>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[8px] uppercase px-2 py-0.5 rounded-full font-bold border ${src.color}`}>{src.label}</span>
                                        <button onClick={() => setViewingSession(null)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
                                    </div>
                                </div>

                                {/* Recovery + Metrics */}
                                <div className="grid grid-cols-5 gap-2">
                                    <div className={`col-span-1 ${rc.bg} rounded-xl p-3 text-center`}>
                                        <div className={`text-2xl font-mono font-bold ${rc.c}`}>{rec > 0 ? `${rec}%` : "—"}</div>
                                        <div className="text-[8px] uppercase text-white/40">Recovery</div>
                                    </div>
                                    {[
                                        { l: "HRV", v: Math.round(s.metrics?.hrv || 0), u: "ms", bl: s.baseline?.hrv },
                                        { l: "RHR", v: Math.round(s.metrics?.rhr || 0), u: "bpm", bl: s.baseline?.rhr },
                                        { l: "Sleep", v: Math.round(s.metrics?.deepSleep || 0), u: "m", bl: s.baseline?.deepSleep },
                                        { l: "Resp", v: Number(s.metrics?.respRate || 0).toFixed(1), u: "", bl: s.baseline?.respRate },
                                    ].map(m => (
                                        <div key={m.l} className="bg-white/5 rounded-xl p-3 text-center">
                                            <div className="text-lg font-mono font-bold text-white">{m.v}<span className="text-[8px] text-white/30">{m.u}</span></div>
                                            <div className="text-[8px] uppercase text-white/30">{m.l}</div>
                                            {m.bl && <div className="text-[8px] text-white/20">avg {Math.round(m.bl)}</div>}
                                        </div>
                                    ))}
                                </div>

                                {/* Pillar + Severity */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold border border-primary/30 bg-primary/10 text-primary">{s.pillarName || "—"}</span>
                                    {s.severity && <span className="px-2 py-1 rounded-full text-[10px] capitalize bg-white/5 text-white/50 border border-white/10">{s.severity}</span>}
                                    {s.engineVersion && <span className="text-[9px] font-mono text-white/20">{s.engineVersion}</span>}
                                </div>
                                {s.trigger && <p className="text-[10px] text-white/40 italic">🔍 {s.trigger}</p>}

                                {/* Capacity Dimensions */}
                                {cap && (
                                    <div className="bg-white/5 rounded-xl p-4 space-y-3 border border-white/10">
                                        <div className="flex items-center justify-between">
                                            <div className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Body Capacity</div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xl font-mono font-bold ${capacityColor(cap.level)}`}>{cap.totalScore}</span>
                                                <span className="text-[9px] text-white/30">/100</span>
                                                <span className={`text-[8px] uppercase px-1.5 py-0.5 rounded-full font-bold ${capacityBg(cap.level)} ${capacityColor(cap.level)}`}>L{cap.level} · {cap.label}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {cap.dimensions.map(d => (
                                                <div key={d.name}>
                                                    <div className="flex justify-between text-[10px] mb-0.5">
                                                        <span className="text-white/60">{d.name}</span>
                                                        <span className="font-mono text-white/40">{d.score}/{d.maxScore}</span>
                                                    </div>
                                                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                                        <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${(d.score / d.maxScore) * 100}%` }} />
                                                    </div>
                                                    <div className="text-[9px] text-white/25 mt-0.5">{d.insight}</div>
                                                </div>
                                            ))}
                                        </div>
                                        {cap.safetyFlags.length > 0 && (
                                            <div className="border-t border-white/10 pt-2">
                                                <div className="text-[9px] text-red-400 font-bold mb-1">⚠️ Safety Flags</div>
                                                {cap.safetyFlags.map(f => <div key={f} className="text-[10px] text-red-300/60">{f}</div>)}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Illness Warning */}
                                {(s as any).illnessWarning?.active && (() => {
                                    const iw = (s as any).illnessWarning
                                    const iwCls = iw.severity === 'danger' ? 'text-red-400 bg-red-500/10 border-red-500/20' : iw.severity === 'caution' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                    return (
                                        <div className={`rounded-xl p-3 border ${iwCls}`}>
                                            <div className="text-[9px] uppercase tracking-wider font-bold mb-1">{iw.severity === 'danger' ? '🚨 Illness Alert' : iw.severity === 'caution' ? '⚠️ Illness Warning' : '👁️ Illness Watch'}</div>
                                            {iw.signals?.map((sig: string) => <div key={sig} className="text-[10px] opacity-80">• {sig}</div>)}
                                            {iw.recommendation && <div className="text-[10px] mt-1 font-medium">{iw.recommendation}</div>}
                                        </div>
                                    )
                                })()}

                                {/* Clinical Narrative */}
                                {(s as any).clinicalNarrative && (
                                    <div className="bg-indigo-500/5 rounded-xl p-4 border border-indigo-500/10">
                                        <div className="text-[9px] uppercase tracking-widest text-indigo-400 font-bold mb-1">🩺 Clinical Insight</div>
                                        <p className="text-[11px] text-white/60 leading-relaxed">{(s as any).clinicalNarrative}</p>
                                    </div>
                                )}

                                {/* v9 Extra Metrics */}
                                {(s.metrics?.spo2 > 0 || s.metrics?.dayStrain > 0) && (
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            s.metrics.spo2 > 0 && { l: "SpO2", v: `${s.metrics.spo2?.toFixed(1)}%`, c: s.metrics.spo2 < 96 ? 'text-amber-400' : 'text-white' },
                                            s.metrics.skinTemp > 0 && { l: "Skin", v: `${s.metrics.skinTemp?.toFixed(1)}°`, c: s.metrics.skinTemp > 34 ? 'text-amber-400' : 'text-white' },
                                            s.metrics.dayStrain > 0 && { l: "Strain", v: s.metrics.dayStrain?.toFixed(1), c: s.metrics.dayStrain > 14 ? 'text-red-400' : 'text-white' },
                                            s.metrics.remSleep > 0 && { l: "REM", v: `${Math.round(s.metrics.remSleep)}m`, c: 'text-white' },
                                        ].filter(Boolean).map((m: any) => (
                                            <div key={m.l} className="bg-white/5 rounded-xl p-2 text-center border border-white/5">
                                                <div className={`text-sm font-mono font-bold ${m.c}`}>{m.v}</div>
                                                <div className="text-[7px] uppercase text-white/30">{m.l}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Protocol */}
                                <div className="grid grid-cols-2 gap-3">
                                    {s.massage && (
                                        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                            <div className="text-[8px] uppercase tracking-widest text-white/30 mb-1">Bodywork</div>
                                            <div className="text-sm font-medium text-white">{s.massage.name}</div>
                                            {s.massage.nameTh && <div className="text-[10px] text-white/30">{s.massage.nameTh}</div>}
                                            <div className="text-[10px] text-white/40">{s.massage.pressure} · {s.massage.duration}m</div>
                                            {s.massage.modality && <span className="text-[8px] uppercase px-1.5 py-0.5 rounded-full text-amber-400 bg-amber-500/10 border border-amber-500/20 mt-1 inline-block">{s.massage.modality?.replace(/_/g, ' ')}</span>}
                                        </div>
                                    )}
                                    {s.topRecipe && (
                                        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                            <div className="text-[8px] uppercase tracking-widest text-white/30 mb-1">Thermal</div>
                                            <div className="text-sm font-medium text-white">{modalityIcon(s.topRecipe.modality)} {s.topRecipe.name}</div>
                                            <div className="text-[10px] text-white/40">{s.topRecipe.intensity} · {s.topRecipe.totalTime}m</div>
                                            <div className="flex gap-2 mt-1">
                                                {s.topRecipe.saunaTemp > 0 && <span className="text-[9px] font-mono text-orange-400">🔥{s.topRecipe.saunaTemp}°</span>}
                                                {s.topRecipe.coldTemp > 0 && <span className="text-[9px] font-mono text-cyan-400">❄️{s.topRecipe.coldTemp}°</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {s.recipesAvailable && <div className="text-[10px] text-white/25 text-center">{s.recipesAvailable} recipes available at this capacity</div>}

                                {/* Legacy protocol (old sessions) */}
                                {s.protocol?.length > 0 && !s.capacity && (
                                    <div className="space-y-2">
                                        <div className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Legacy Protocol</div>
                                        {s.protocol.map((item: any, i: number) => (
                                            <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10">
                                                <div className="text-sm font-medium text-white">{item.title || item.name || "Treatment"}</div>
                                                <div className="text-[10px] text-white/40">{item.category} · {item.detail?.slice(0, 80)}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[8px] uppercase px-2 py-0.5 rounded-full font-bold border ${src.color}`}>{src.label}</span>
                                        {s.platform && <span className="text-[9px] text-white/20">{s.platform}</span>}
                                    </div>
                                    <Button onClick={() => setViewingSession(null)} className="bg-primary/20 hover:bg-primary/30 text-primary">Close</Button>
                                </div>
                            </motion.div>
                        </div>
                    )
                })()}
            </AnimatePresence>
        </div>
    )
}
