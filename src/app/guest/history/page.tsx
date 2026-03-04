"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Clock } from "lucide-react"
import { useGuest } from "../layout"
import { useFirestoreCRUD } from "@/hooks/useFirestore"

interface WhoopDay {
    date: string; hrv: number; rhr: number; deepSleep: number
    respRate: number; recoveryScore: number
}

const rcColor = (s: number) =>
    s >= 67 ? { c: "#34d399", bg: "rgba(52,211,153,0.12)" }
        : s >= 34 ? { c: "#fbbf24", bg: "rgba(251,191,36,0.12)" }
            : { c: "#f87171", bg: "rgba(248,113,113,0.12)" }

export default function GuestHistory() {
    const { bookings } = useGuest()
    const { update } = useFirestoreCRUD("bookings")

    const [whoopHistory, setWhoopHistory] = useState<WhoopDay[]>([])
    const [whoopBaseline, setWhoopBaseline] = useState<{ hrv: number; rhr: number; deepSleep: number; respRate: number } | null>(null)

    // Load WHOOP history from localStorage (saved during sync on WHOOP page)
    useEffect(() => {
        try {
            const h = localStorage.getItem("yarey_whoop_history")
            if (h) setWhoopHistory(JSON.parse(h))
            const b = localStorage.getItem("yarey_whoop_baseline")
            if (b) setWhoopBaseline(JSON.parse(b))
        } catch { }
    }, [])

    const todayStr = new Date().toISOString().split("T")[0]
    const upcoming = bookings.filter(b => b.date >= todayStr && b.status === "Confirmed").sort((a, b) => a.date.localeCompare(b.date))
    const past = bookings.filter(b => b.date < todayStr || b.status === "Complete" || b.status === "Cancelled").sort((a, b) => b.date.localeCompare(a.date))

    const grouped = past.reduce<Record<string, typeof past>>((acc, b) => {
        const k = b.date.slice(0, 7)
        if (!acc[k]) acc[k] = []
        acc[k].push(b)
        return acc
    }, {})

    const handleCancel = async (id: string) => {
        if (!confirm("ยืนยันยกเลิก? / Confirm cancellation?")) return
        await update(id, { status: "Cancelled" })
    }

    const badge = (s: string) => {
        const map: Record<string, { bg: string; color: string; label: string }> = {
            Complete: { bg: "rgba(16,185,129,0.12)", color: "var(--g-success)", label: "✓ Complete" },
            Confirmed: { bg: "rgba(59,130,246,0.12)", color: "#60a5fa", label: "Confirmed" },
            Cancelled: { bg: "rgba(239,68,68,0.12)", color: "var(--g-danger)", label: "Cancelled" },
        }
        const d = map[s] || { bg: "var(--g-surface)", color: "var(--g-text-muted)", label: s }
        return <span className="text-[9px] uppercase px-2 py-0.5 rounded-full font-bold" style={{ background: d.bg, color: d.color }}>{d.label}</span>
    }

    return (
        <div>
            <header className="sticky top-0 z-50 backdrop-blur-xl border-b px-5 py-3" style={{ background: "color-mix(in srgb, var(--g-bg) 80%, transparent)", borderColor: "var(--g-border)" }}>
                <div className="max-w-md mx-auto">
                    <div className="text-lg font-serif" style={{ color: "var(--g-accent)" }}>📜 ประวัติ · History</div>
                    <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: "var(--g-text-muted)" }}>Treatment visits & WHOOP trends</div>
                </div>
            </header>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
                className="max-w-md mx-auto px-5 pt-5 space-y-5 pb-28">
                {/* Upcoming */}
                {upcoming.length > 0 && (
                    <div className="space-y-3">
                        <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--g-success)" }}>
                            📅 Upcoming ({upcoming.length})
                        </div>
                        {upcoming.map((b, i) => (
                            <motion.div
                                key={b.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="rounded-2xl p-4"
                                style={{ background: "var(--g-surface)", border: "1px solid var(--g-border)" }}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-sm font-bold">{b.treatment}</div>
                                        <div className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color: "var(--g-text-muted)" }}>
                                            <Clock className="w-3 h-3" /> {b.date} · {b.time}
                                        </div>
                                    </div>
                                    {badge(b.status)}
                                </div>
                                <button
                                    onClick={() => handleCancel(b.id)}
                                    className="mt-3 w-full py-2 rounded-xl text-xs font-bold active:scale-[0.97] transition-transform"
                                    style={{ border: "1px solid rgba(239,68,68,0.2)", color: "var(--g-danger)" }}
                                >
                                    ยกเลิก · Cancel
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Past by month */}
                {Object.keys(grouped).length > 0 ? (
                    Object.entries(grouped).map(([month, items]) => (
                        <div key={month} className="space-y-2">
                            <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--g-text-muted)" }}>
                                {new Date(month + "-01").toLocaleDateString("th-TH", { month: "long", year: "numeric" })}
                            </div>
                            {items.map(b => (
                                <div
                                    key={b.id}
                                    className="rounded-2xl p-4"
                                    style={{
                                        background: "var(--g-surface)",
                                        border: "1px solid var(--g-border)",
                                        opacity: b.status === "Cancelled" ? 0.4 : 1,
                                    }}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="text-sm">{b.treatment}</div>
                                            <div className="text-[10px] mt-0.5" style={{ color: "var(--g-text-muted)" }}>
                                                {b.date} · {b.time}
                                                {b.priceSnapshot ? ` · ฿${b.priceSnapshot.toLocaleString()}` : ""}
                                            </div>
                                        </div>
                                        {badge(b.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                ) : upcoming.length === 0 && whoopHistory.length === 0 && (
                    <div className="text-center py-16">
                        <div className="text-4xl mb-3">📜</div>
                        <div className="text-sm" style={{ color: "var(--g-text-secondary)" }}>ยังไม่มีประวัติ</div>
                        <div className="text-xs mt-1" style={{ color: "var(--g-text-muted)" }}>No visit history yet</div>
                    </div>
                )}

                {/* ═══ WHOOP Biometric History ═══ */}
                {whoopHistory.length > 1 && (
                    <div className="space-y-3">
                        <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--g-text-muted)" }}>
                            💚 WHOOP · {whoopHistory.length}-Day Trends
                        </div>

                        {/* Baseline row */}
                        {whoopBaseline && (
                            <div className="rounded-xl p-3" style={{ background: "var(--g-surface)", border: "1px solid var(--g-border)" }}>
                                <div className="text-[8px] uppercase tracking-widest font-bold mb-2" style={{ color: "var(--g-text-muted)" }}>14-Day Baseline</div>
                                <div className="grid grid-cols-4 gap-1 text-center">
                                    {[
                                        { l: "HRV", v: `${Math.round(whoopBaseline.hrv)}` },
                                        { l: "RHR", v: `${Math.round(whoopBaseline.rhr)}` },
                                        { l: "Sleep", v: `${Math.round(whoopBaseline.deepSleep)}m` },
                                        { l: "Resp", v: `${whoopBaseline.respRate?.toFixed(1)}` },
                                    ].map(a => (
                                        <div key={a.l}>
                                            <div className="text-xs font-mono font-bold">{a.v}</div>
                                            <div className="text-[7px] uppercase" style={{ color: "var(--g-text-muted)" }}>{a.l}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Day-by-day table */}
                        <div className="rounded-xl overflow-hidden" style={{ background: "var(--g-surface)", border: "1px solid var(--g-border)" }}>
                            <div className="grid grid-cols-5 px-3 py-2 text-[7px] uppercase tracking-wider font-bold" style={{ color: "var(--g-text-muted)" }}>
                                <span>Date</span><span className="text-center">Rec</span><span className="text-center">HRV</span><span className="text-center">RHR</span><span className="text-center">Sleep</span>
                            </div>
                            <div className="divide-y" style={{ borderColor: "var(--g-border)" }}>
                                {whoopHistory.map((d, i) => {
                                    const drc = rcColor(d.recoveryScore)
                                    const dt = d.date ? new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : `Day ${i + 1}`
                                    return (
                                        <div key={d.date || i} className="grid grid-cols-5 px-3 py-2 items-center">
                                            <span className="text-[10px]" style={{ color: i === 0 ? "var(--g-text)" : "var(--g-text-muted)" }}>
                                                {i === 0 ? "Today" : dt}
                                            </span>
                                            <div className="flex justify-center">
                                                <span className="text-[10px] font-mono font-bold px-1 py-0.5 rounded-full" style={{ background: drc.bg, color: drc.c }}>
                                                    {d.recoveryScore}%
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-mono text-center">{Math.round(d.hrv)}</span>
                                            <span className="text-[10px] font-mono text-center">{Math.round(d.rhr)}</span>
                                            <span className="text-[10px] font-mono text-center">{Math.round(d.deepSleep)}m</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    )
}
