"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GachaMachine, GachaPrize } from "@/types"
import Link from "next/link"

type Stage = "idle" | "shaking" | "dropping" | "revealing" | "done"

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

interface GachaGameProps {
    machine: GachaMachine
    memberId: string
    memberName: string
}

export function GachaGame({ machine, memberId, memberName }: GachaGameProps) {
    const [stage, setStage] = useState<Stage>("idle")
    const [wonPrize, setWonPrize] = useState<GachaPrize | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handlePlay = useCallback(async () => {
        if (stage !== "idle") return
        setStage("shaking")

        const apiPromise = fetch("/api/gacha/play", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ machineId: machine.id, memberId, memberName }),
        }).then(r => r.json())

        await delay(2000)
        setStage("dropping")

        const [data] = await Promise.all([apiPromise, delay(1200)])

        if (data.error) {
            setError(data.error)
            setStage("idle")
            return
        }

        setWonPrize(data.prize)
        setStage("revealing")
        await delay(2200)
        setStage("done")
    }, [stage, machine.id, memberId, memberName])

    // Capsule positions for idle state
    const capsulePositions = machine.prizes.flatMap((p, i) => {
        const count = Math.max(1, Math.round(p.weight / 20))
        return Array.from({ length: count }, (_, j) => ({
            ...p,
            key: `${p.id}-${j}`,
            left: 15 + ((i * 37 + j * 23) % 70),
            top: 12 + ((i * 29 + j * 17) % 60),
        }))
    }).slice(0, 12)

    return (
        <div className="relative">
            <AnimatePresence mode="wait">
                {/* ═══ IDLE + SHAKING + DROPPING (Machine visible) ═══ */}
                {(stage === "idle" || stage === "shaking" || stage === "dropping") && (
                    <motion.div
                        key="machine"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="rounded-2xl overflow-hidden"
                        style={{ background: "linear-gradient(160deg, rgba(139,125,93,0.08), rgba(209,192,155,0.04))", border: "1px solid rgba(209,192,155,0.15)" }}
                    >
                        <div className="px-4 pt-4 pb-1">
                            <div className="text-[9px] uppercase tracking-[0.25em] font-bold mb-1" style={{ color: "var(--g-accent)" }}>✦ Lucky Gacha</div>
                            <div className="text-sm font-serif font-bold" style={{ color: "var(--g-text)" }}>{machine.title}</div>
                        </div>

                        {/* Machine Body */}
                        <div className="relative px-4 pb-4">
                            <motion.div
                                animate={stage === "shaking" ? { x: [0, -3, 3, -2, 2, -1, 1, 0], rotate: [0, -0.5, 0.5, -0.3, 0.3, 0] } : {}}
                                transition={{ repeat: stage === "shaking" ? Infinity : 0, duration: 0.12 }}
                                className="relative mx-auto" style={{ maxWidth: 220 }}
                            >
                                {/* Glass Dome */}
                                <div className="relative h-36 rounded-t-[3rem] overflow-hidden"
                                    style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))", border: "1px solid rgba(255,255,255,0.1)", borderBottom: "none" }}>

                                    {/* Capsules */}
                                    {capsulePositions.map((c) => (
                                        <motion.div
                                            key={c.key}
                                            animate={stage === "shaking"
                                                ? { x: [0, 8, -8, 6, -4, 0], y: [0, -6, 8, -4, 6, 0], rotate: [0, 45, -30, 20, -10, 0] }
                                                : { y: [0, -4, 0, 3, 0], x: [0, 2, -2, 1, 0] }
                                            }
                                            transition={{ repeat: Infinity, duration: stage === "shaking" ? 0.3 : 2.5 + Math.random() * 1.5, delay: Math.random() * 0.5 }}
                                            className="absolute w-7 h-7 rounded-full"
                                            style={{ background: c.color, left: `${c.left}%`, top: `${c.top}%`, boxShadow: `0 2px 8px ${c.color}40` }}
                                        >
                                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-black/10" />
                                        </motion.div>
                                    ))}

                                    {/* Glass reflection */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent pointer-events-none" />
                                </div>

                                {/* Machine Base */}
                                <div className="h-14 rounded-b-2xl flex items-center justify-center relative"
                                    style={{ background: "linear-gradient(180deg, rgba(139,125,93,0.15), rgba(139,125,93,0.08))", border: "1px solid rgba(209,192,155,0.12)", borderTop: "2px solid rgba(209,192,155,0.2)" }}>

                                    {/* Dispenser slot */}
                                    <div className="w-12 h-6 rounded-b-xl absolute -bottom-0.5 left-1/2 -translate-x-1/2"
                                        style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(209,192,155,0.1)" }} />

                                    {/* Dropping Capsule */}
                                    <AnimatePresence>
                                        {stage === "dropping" && (
                                            <motion.div
                                                initial={{ y: -60, opacity: 0, scale: 0.5 }}
                                                animate={{ y: 10, opacity: 1, scale: 1 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                                className="absolute w-9 h-9 rounded-full z-10"
                                                style={{ background: machine.prizes[0]?.color || "#eab308", boxShadow: `0 4px 15px ${machine.prizes[0]?.color || "#eab308"}50` }}
                                            >
                                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-black/10" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>

                            {/* Play Button */}
                            {stage === "idle" && (
                                <motion.button
                                    onClick={handlePlay}
                                    whileTap={{ scale: 0.93 }}
                                    className="w-full mt-4 py-3.5 rounded-xl font-bold text-sm tracking-wider relative overflow-hidden"
                                    style={{ background: "var(--g-accent)", color: "var(--g-accent-text)" }}
                                >
                                    <motion.div
                                        animate={{ opacity: [0.5, 1, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                                    />
                                    <span className="relative z-10">🎰 Tap to Play</span>
                                </motion.button>
                            )}

                            {stage === "shaking" && (
                                <div className="text-center mt-4 py-3">
                                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 0.6 }}
                                        className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--g-accent)" }}>
                                        Mixing...
                                    </motion.div>
                                </div>
                            )}

                            {stage === "dropping" && (
                                <div className="text-center mt-4 py-3">
                                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 0.4 }}
                                        className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--g-accent)" }}>
                                        ✨ Here it comes!
                                    </motion.div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ═══ REVEALING ═══ */}
                {stage === "revealing" && wonPrize && (
                    <motion.div
                        key="reveal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-2xl overflow-hidden py-10 text-center relative"
                        style={{ background: "linear-gradient(160deg, rgba(139,125,93,0.12), rgba(209,192,155,0.06))", border: "1px solid rgba(209,192,155,0.2)" }}
                    >
                        {/* Sparkle particles */}
                        {Array.from({ length: 8 }).map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], x: (Math.random() - 0.5) * 120, y: (Math.random() - 0.5) * 120 }}
                                transition={{ duration: 1.5, delay: i * 0.1 }}
                                className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
                                style={{ background: wonPrize.color }}
                            />
                        ))}

                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 12 }}
                            className="w-16 h-16 rounded-full mx-auto mb-4"
                            style={{ background: wonPrize.color, boxShadow: `0 8px 30px ${wonPrize.color}40` }}
                        >
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-white/30 to-transparent flex items-center justify-center text-2xl">
                                {wonPrize.type === "discount" ? "🏷️" : "🎁"}
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                            <div className="text-xl font-serif font-bold" style={{ color: "var(--g-text)" }}>{wonPrize.label}</div>
                            <div className="text-[10px] mt-1" style={{ color: "var(--g-text-muted)" }}>
                                {wonPrize.type === "discount" ? "Discount on any treatment" : wonPrize.treatmentTitle}
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* ═══ DONE ═══ */}
                {stage === "done" && wonPrize && (
                    <motion.div
                        key="done"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl overflow-hidden p-5 text-center"
                        style={{ background: "linear-gradient(160deg, rgba(139,125,93,0.08), rgba(209,192,155,0.04))", border: "1px solid rgba(209,192,155,0.15)" }}
                    >
                        <div className="text-3xl mb-2">🎉</div>
                        <div className="text-lg font-serif font-bold" style={{ color: "var(--g-text)" }}>{wonPrize.label}</div>
                        <div className="text-[10px] mt-0.5 mb-4" style={{ color: "var(--g-text-muted)" }}>
                            {wonPrize.type === "discount" ? `${wonPrize.discountPercent}% off any treatment` : `Free ${wonPrize.treatmentTitle}`}
                        </div>
                        <Link
                            href="/guest/vouchers"
                            className="inline-block px-6 py-2.5 rounded-xl text-xs font-bold tracking-wider"
                            style={{ background: "var(--g-accent)", color: "var(--g-accent-text)" }}
                        >
                            View in My Vouchers →
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error toast */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-2 left-2 right-2 bg-red-500/15 border border-red-500/20 rounded-xl px-4 py-2 text-xs text-red-400 text-center"
                        onClick={() => setError(null)}
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
