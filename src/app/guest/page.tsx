"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Star, User, X, Sparkles, Calendar, Ticket, Activity, ChevronRight, ExternalLink, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { useGuest } from "./layout"
import { determineTier, TIERS } from "@/lib/loyalty"
import { useFirestoreCollection } from "@/hooks/useFirestore"
import { GachaMachine } from "@/types"
import { GachaGame } from "@/components/guest/GachaGame"

// ─── Tier Aesthetics ─────────────────────────
const tierStyle: Record<string, { bg: string; glow: string; accent: string; textMain: string; textSub: string }> = {
    Seeker: { bg: "linear-gradient(160deg, #0e2f2f    , #071e1e)", glow: "rgba(139,157,160,0.08)", accent: "#8B9DA0", textMain: "#c5d0d2", textSub: "#6b8083" },
    Initiate: { bg: "linear-gradient(160deg, #5D4037    , #3E2723)", glow: "rgba(139, 90, 43,0.15)", accent: "#D4A76A", textMain: "#f2e2d5", textSub: "#a88b7d" },
    Devotee: { bg: "linear-gradient(160deg, #bdc3c7    , #8997a1)", glow: "rgba(255,255,255,0.15)", accent: "#ffffff", textMain: "#1a1a1a", textSub: "#4a5568" },
    Alchemist: { bg: "linear-gradient(160deg, #FFD700    , #B8860B)", glow: "rgba(255,215,  0,0.20)", accent: "#FFF8DC", textMain: "#3E2723", textSub: "#5D4037" },
    Guardian: { bg: "linear-gradient(160deg, #4c1d95    , #1e1b4b)", glow: "rgba(168, 85,247,0.15)", accent: "#c084fc", textMain: "#e9d5ff", textSub: "#a78bfa" },
}

export default function GuestHome() {
    const { profile, member, vouchers, bookings, isRegistered, platform } = useGuest()
    const [showTiers, setShowTiers] = useState(false)

    // ─── Gacha Machine ───
    const { data: gachaMachines, loading: gachaLoading, error: gachaError } = useFirestoreCollection<GachaMachine>("gacha_machines")
    const eligibleMachine = useMemo(() => {
        console.log("[Gacha Debug]", {
            machinesCount: gachaMachines.length,
            gachaLoading,
            gachaError,
            memberId: member?.id,
            machines: gachaMachines.map(m => ({
                id: m.id,
                title: m.title,
                active: m.active,
                expiresAt: m.expiresAt,
                expired: new Date(m.expiresAt) < new Date(),
                targetType: m.targetType,
                targetMemberIds: m.targetMemberIds,
                playedBy: m.playedBy,
                memberPlayed: member?.id ? !!m.playedBy?.[member.id] : "no member",
            })),
        })
        if (!member?.id) return null
        return gachaMachines.find(m => {
            if (!m.active) return false
            if (new Date(m.expiresAt) < new Date()) return false
            if (m.targetType === "specific" && !m.targetMemberIds?.includes(member.id)) return false
            if (m.playedBy?.[member.id]) return false
            return true
        }) || null
    }, [gachaMachines, member?.id, gachaLoading, gachaError])

    // ─── WHOOP status (uses member.id as key) ───
    const [whoopStatus, setWhoopStatus] = useState<"checking" | "connected" | "not_connected" | "error">("checking")
    const whoopConnectUrl = `/api/whoop/auth?memberId=${encodeURIComponent(member?.id || "")}&platform=${encodeURIComponent(platform)}`

    const handleWhoopConnect = useCallback(async () => {
        const url = `${window.location.origin}${whoopConnectUrl}`
        if (platform === "line") {
            try {
                const liff = (await import("@line/liff")).default
                if (liff.isInClient()) {
                    liff.openWindow({ url, external: true })
                    return
                }
            } catch { /* fallback below */ }
        }
        window.location.href = whoopConnectUrl
    }, [whoopConnectUrl, platform])

    const whoopStatusRef = useRef(whoopStatus)
    whoopStatusRef.current = whoopStatus

    useEffect(() => {
        if (!member?.id) { setWhoopStatus("not_connected"); return }
        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/whoop/status?sessionId=${encodeURIComponent(member.id)}`)
                const data = await res.json()
                setWhoopStatus(data.connected ? "connected" : "not_connected")
            } catch {
                setWhoopStatus("error")
            }
        }
        checkStatus()

        // Re-check when user returns from external browser (LINE LIFF OAuth flow)
        const onVisibility = () => {
            if (document.visibilityState === "visible" && whoopStatusRef.current === "not_connected") {
                checkStatus()
            }
        }
        document.addEventListener("visibilitychange", onVisibility)
        return () => document.removeEventListener("visibilitychange", onVisibility)
    }, [member?.id]) // removed whoopStatus — same loop bug as whoop page

    // ─── Not registered (shouldn't happen with auto-register, but safety fallback) ───
    // This shouldn't show — layout handles auth gate. Safety fallback.
    if (!isRegistered || !member) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-6">
                <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "var(--g-accent)", borderTopColor: "transparent" }} />
            </div>
        )
    }

    // ─── Registered — Data ────────────
    const totalSpend = member.totalSpend || 0
    const tierName = determineTier(totalSpend)
    const tierIdx = TIERS.findIndex(t => t.name === tierName)
    const nextTier = TIERS[tierIdx + 1]
    const ts = tierStyle[tierName] || tierStyle.Seeker

    let progressPercent = 100
    let progressLabel = "Max Tier ✨"
    if (nextTier) {
        const base = TIERS[tierIdx].spend
        const range = nextTier.spend - base
        progressPercent = range > 0 ? Math.min(100, ((totalSpend - base) / range) * 100) : 0
        progressLabel = `฿${(nextTier.spend - totalSpend).toLocaleString()} to ${nextTier.name}`
    }

    const todayStr = new Date().toISOString().split("T")[0]
    const upcoming = bookings.filter(b => b.status === "Confirmed" && b.date >= todayStr)
    const completed = bookings.filter(b => b.status === "Complete")

    let birthdayText = ""
    if (member?.birthday) {
        const bday = new Date(member.birthday)
        const now = new Date()
        const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate())
        if (thisYear < now) thisYear.setFullYear(now.getFullYear() + 1)
        const daysLeft = Math.ceil((thisYear.getTime() - now.getTime()) / 86400000)
        birthdayText = daysLeft === 0 ? "🎂 Happy Birthday!" : `🎂 ${daysLeft}d`
    }

    const greetingHour = new Date().getHours()
    const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 17 ? "Good afternoon" : "Good evening"

    return (
        <div data-guest-home className="pb-4">
            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl border-b px-5 py-3" style={{ background: "color-mix(in srgb, var(--g-bg) 80%, transparent)", borderColor: "var(--g-border)" }}>
                <div className="max-w-md mx-auto flex justify-between items-center">
                    <div className="text-lg font-serif" style={{ color: "var(--g-accent)" }}>Sanctuary.</div>
                    <Link href="/guest/profile" className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden transition-transform active:scale-90" style={{ background: "var(--g-surface)", border: "2px solid var(--g-border)", boxShadow: "0 0 0 2px var(--g-bg)" }}>
                        {profile?.pictureUrl
                            ? <img src={profile.pictureUrl} alt="" className="w-full h-full object-cover" />
                            : <User className="w-4 h-4" style={{ color: "var(--g-text-muted)" }} />
                        }
                    </Link>
                </div>
            </header>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="max-w-md mx-auto px-5 pt-6 space-y-5"
            >
                {/* ═══ Greeting ═══ */}
                <div>
                    <div className="text-[10px] uppercase tracking-[0.3em] mb-1" style={{ color: "var(--g-text-muted)" }}>{greeting}</div>
                    <h1 className="text-[26px] font-serif leading-tight">{member.name}</h1>
                    {birthdayText && <span className="text-xs mt-0.5 inline-block" style={{ color: "#f472b6" }}>{birthdayText}</span>}
                </div>

                {/* ═══ Tier Card ═══ */}
                <button
                    onClick={() => setShowTiers(true)}
                    className="w-full rounded-2xl p-5 text-left relative overflow-hidden transition-transform active:scale-[0.98]"
                    style={{ background: ts.bg, boxShadow: `0 8px 32px ${ts.glow}, var(--g-card-shadow)` }}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-[0.07]" style={{ background: ts.accent }} />
                    <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full opacity-[0.05]" style={{ background: ts.accent }} />

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="text-[9px] uppercase tracking-[0.3em] font-bold mb-1.5" style={{ color: ts.textSub }}>Membership</div>
                                <div className="text-xl font-serif flex items-center gap-2" style={{ color: ts.textMain }}>
                                    <Sparkles className="w-4 h-4" style={{ color: ts.accent }} />
                                    {tierName}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[9px] uppercase tracking-wider" style={{ color: ts.textSub }}>Total Spend</div>
                                <div className="text-sm font-mono font-bold" style={{ color: ts.textMain }}>฿{totalSpend.toLocaleString()}</div>
                            </div>
                        </div>

                        {nextTier && (
                            <div>
                                <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.25)" }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPercent}%` }}
                                        transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                        className="h-full rounded-full"
                                        style={{ background: ts.accent }}
                                    />
                                </div>
                                <div className="flex justify-between mt-1.5">
                                    <span className="text-[9px] font-bold tracking-wider" style={{ color: ts.textSub }}>{progressLabel}</span>
                                    <span className="text-[9px] font-mono" style={{ color: ts.textSub }}>{Math.round(progressPercent)}%</span>
                                </div>
                            </div>
                        )}
                        {!nextTier && (
                            <div className="text-[9px] tracking-wider font-bold mt-1" style={{ color: ts.accent }}>✦ Highest Tier Achieved</div>
                        )}
                    </div>
                </button>

                {/* ═══ Stats Row ═══ */}
                <div className="grid grid-cols-3 gap-2.5">
                    {[
                        { value: completed.length, label: "Visits", icon: Calendar },
                        { value: vouchers.length, label: "Vouchers", icon: Ticket },
                        { value: upcoming.length, label: "Upcoming", icon: Activity },
                    ].map(({ value, label, icon: Icon }) => (
                        <div key={label} className="rounded-xl py-3 px-2 text-center" style={{ background: "var(--g-surface)", border: "1px solid var(--g-border)" }}>
                            <Icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: "var(--g-accent)", opacity: 0.7 }} />
                            <div className="text-base font-mono font-bold leading-none" style={{ color: "var(--g-text)" }}>{value}</div>
                            <div className="text-[8px] uppercase tracking-wider mt-0.5" style={{ color: "var(--g-text-muted)" }}>{label}</div>
                        </div>
                    ))}
                </div>

                {/* ═══ Gacha Game ═══ */}
                {eligibleMachine && member && (
                    <GachaGame machine={eligibleMachine} memberId={member.id} memberName={member.name} />
                )}

                {/* DEBUG: Gacha Status — REMOVE AFTER TESTING */}
                <div style={{ background: "rgba(255,0,0,0.1)", border: "1px solid rgba(255,0,0,0.3)", borderRadius: 12, padding: 10, fontSize: 10, color: "#f87171", fontFamily: "monospace" }}>
                    <div>🔍 Gacha Debug</div>
                    <div>machines: {gachaMachines.length} | loading: {String(gachaLoading)} | error: {gachaError ? String(gachaError) : "none"}</div>
                    <div>memberId: {member?.id || "none"}</div>
                    {gachaMachines.map(m => (
                        <div key={m.id} style={{ marginTop: 4 }}>
                            [{m.title}] active:{String(m.active)} | expired:{String(new Date(m.expiresAt) < new Date())} | target:{m.targetType}
                            {m.targetType === "specific" && ` | ids:${m.targetMemberIds?.join(",")}`}
                            | played:{member?.id ? String(!!m.playedBy?.[member.id]) : "?"}
                        </div>
                    ))}
                    {gachaMachines.length === 0 && <div>⚠️ No machines found in Firestore</div>}
                    {eligibleMachine && <div style={{ color: "#4ade80" }}>✅ Eligible: {eligibleMachine.title}</div>}
                    {!eligibleMachine && gachaMachines.length > 0 && <div>❌ No eligible machine for this member</div>}
                </div>

                {/* ═══ Upcoming Booking ═══ */}
                {upcoming.length > 0 && (
                    <Link href="/guest/history" className="block">
                        <div className="rounded-2xl p-4 transition-transform active:scale-[0.98]" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}>
                            <div className="flex items-center justify-between mb-2.5">
                                <div className="text-[9px] uppercase tracking-[0.2em] font-bold" style={{ color: "var(--g-success)" }}>Next Visit</div>
                                <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--g-success)", opacity: 0.5 }} />
                            </div>
                            {upcoming.slice(0, 1).map(b => (
                                <div key={b.id}>
                                    <div className="text-sm font-bold">{b.treatment}</div>
                                    <div className="text-[10px] mt-0.5" style={{ color: "var(--g-text-muted)" }}>
                                        {new Date(b.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {b.time} · {b.guests || 1} guest{(b.guests || 1) > 1 ? "s" : ""}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Link>
                )}

                {/* ═══ WHOOP Connection Status ═══ */}
                {whoopStatus === "checking" ? (
                    <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "var(--g-surface)", border: "1px solid var(--g-border)" }}>
                        <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" style={{ color: "var(--g-text-muted)" }} />
                        <div>
                            <div className="text-xs font-bold">Checking WHOOP...</div>
                            <div className="text-[9px]" style={{ color: "var(--g-text-muted)" }}>Verifying connection</div>
                        </div>
                    </div>
                ) : whoopStatus === "not_connected" ? (
                    <button
                        onClick={handleWhoopConnect}
                        className="w-full rounded-2xl p-4 transition-transform active:scale-[0.98] relative overflow-hidden text-left"
                        style={{ background: "linear-gradient(135deg, rgba(251,146,60,0.08), rgba(239,68,68,0.06))", border: "1px solid rgba(251,146,60,0.15)" }}
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-[0.04]" style={{ background: "#fb923c" }} />
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.2)" }}>
                                <AlertCircle className="w-5 h-5" style={{ color: "#fb923c" }} />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-bold flex items-center gap-1.5">
                                    Connect WHOOP
                                    <span className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-bold"
                                        style={{ background: "rgba(251,146,60,0.12)", color: "#fb923c" }}>Required</span>
                                </div>
                                <div className="text-[10px] mt-0.5" style={{ color: "var(--g-text-muted)" }}>
                                    Link your wearable for personalized wellness protocols
                                </div>
                            </div>
                            <ExternalLink className="w-4 h-4 flex-shrink-0" style={{ color: "#fb923c", opacity: 0.5 }} />
                        </div>
                    </button>
                ) : whoopStatus === "connected" ? (
                    <Link href="/guest/whoop" className="block">
                        <div className="rounded-2xl p-4 transition-transform active:scale-[0.98]" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.12)" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.2)" }}>
                                    <CheckCircle className="w-5 h-5" style={{ color: "#34d399" }} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-bold flex items-center gap-1.5">
                                        💚 WHOOP Connected
                                    </div>
                                    <div className="text-[10px] mt-0.5" style={{ color: "var(--g-text-muted)" }}>
                                        Tap to sync and view your wellness protocol
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#34d399", opacity: 0.5 }} />
                            </div>
                        </div>
                    </Link>
                ) : null}

                {/* ═══ Quick Actions ═══ */}
                <div className="grid grid-cols-2 gap-3">
                    <Link href="/guest/vouchers" className="group rounded-2xl p-4 relative overflow-hidden transition-all active:scale-[0.97]" style={{ background: "var(--g-accent)", color: "var(--g-accent-text)" }}>
                        <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-10" style={{ background: "currentColor" }} />
                        <span className="text-2xl block mb-2">🎫</span>
                        <span className="text-xs font-bold block">Vouchers</span>
                        <span className="text-[9px] block opacity-60">{vouchers.length} active</span>
                    </Link>
                    <Link href="/guest/whoop" className="group rounded-2xl p-4 relative overflow-hidden transition-all active:scale-[0.97]"
                        style={{
                            background: whoopStatus === "connected" ? "rgba(52,211,153,0.06)" : "var(--g-surface)",
                            border: whoopStatus === "connected" ? "1px solid rgba(52,211,153,0.12)" : "1px solid var(--g-border)",
                        }}>
                        <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-5" style={{ background: whoopStatus === "connected" ? "#34d399" : "var(--g-accent)" }} />
                        <span className="text-2xl block mb-2">💚</span>
                        <span className="text-xs font-bold block" style={{ color: whoopStatus === "connected" ? "#34d399" : "var(--g-accent)" }}>Wellness</span>
                        <span className="text-[9px] block" style={{ color: "var(--g-text-muted)" }}>
                            {whoopStatus === "connected" ? "✓ WHOOP ready" : whoopStatus === "not_connected" ? "Connect WHOOP" : "WHOOP Protocol"}
                        </span>
                    </Link>
                </div>
            </motion.div>

            {/* ═══ Tier Modal ═══ */}
            <AnimatePresence>
                {showTiers && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] backdrop-blur-2xl flex items-end sm:items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.7)" }}
                        onClick={() => setShowTiers(false)}
                    >
                        <motion.div
                            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                            className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-6 space-y-2.5"
                            style={{ background: "var(--g-modal-bg)", border: "1px solid var(--g-border)" }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="text-base font-serif" style={{ color: "var(--g-accent)" }}>Membership Tiers</h2>
                                <button onClick={() => setShowTiers(false)}><X className="w-5 h-5" style={{ color: "var(--g-text-muted)" }} /></button>
                            </div>
                            {TIERS.map((t, i) => {
                                const isActive = t.name === tierName
                                const isLocked = tierIdx < i
                                const s = tierStyle[t.name] || tierStyle.Seeker
                                return (
                                    <div
                                        key={t.name}
                                        className="rounded-xl p-4 transition-all relative overflow-hidden"
                                        style={{
                                            background: isActive ? s.bg : "var(--g-surface)",
                                            color: isActive ? s.textMain : "var(--g-text)",
                                            border: `1px solid ${isActive ? "transparent" : "var(--g-border)"}`,
                                            opacity: isLocked ? 0.35 : 1,
                                            boxShadow: isActive ? `0 4px 20px ${s.glow}` : "none",
                                        }}
                                    >
                                        {isActive && <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-[0.06]" style={{ background: s.accent }} />}
                                        <div className="flex justify-between items-center relative z-10">
                                            <div className="flex items-center gap-2.5">
                                                <Sparkles className="w-4 h-4" style={{ color: isActive ? s.accent : "var(--g-text-muted)", opacity: isActive ? 1 : 0.3 }} />
                                                <div>
                                                    <span className="text-sm font-bold">{t.name}</span>
                                                    {isActive && <span className="text-[8px] ml-2 uppercase tracking-wider" style={{ color: s.textSub }}>Current</span>}
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-mono" style={{ opacity: 0.6 }}>
                                                {t.spend === 0 ? "Free" : `฿${t.spend.toLocaleString()}`}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
