"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Leaf, GraduationCap } from "lucide-react"
import Link from "next/link"

const ease = [0.16, 1, 0.3, 1] as const

const METRIC_DISPLAY: Record<string, { label: string; icon: string; desc: string }> = {
    hrv: { label: "Heart Rate Variability", icon: "♥", desc: "Your body's resilience and recovery capacity" },
    rhr: { label: "Resting Heart Rate", icon: "⚡", desc: "Cardiovascular efficiency at rest" },
    deepSleep: { label: "Deep Sleep", icon: "☽", desc: "Cellular repair and memory consolidation" },
    respRate: { label: "Respiratory Rate", icon: "◎", desc: "Autonomic nervous system balance" },
    cortisol: { label: "Cortisol", icon: "◇", desc: "Primary stress response hormone" },
    inflammation: { label: "Inflammation", icon: "△", desc: "Systemic inflammatory markers" },
}

export default function ElixirPublicPage() {
    const params = useParams()
    const id = params.id as string
    const [elixir, setElixir] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!id) return
        getDoc(doc(db, "elixirs", id)).then(snap => {
            if (snap.exists()) setElixir({ id: snap.id, ...snap.data() })
            setLoading(false)
        })
    }, [id])

    if (loading) {
        return (
            <div className="min-h-[100svh] bg-background bg-mystical-gradient flex items-center justify-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="w-6 h-6 border border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        )
    }

    if (!elixir) {
        return (
            <div className="min-h-[100svh] bg-background bg-mystical-gradient flex flex-col items-center justify-center">
                <Leaf className="w-5 h-5 text-primary/15 mb-4" />
                <p className="text-[11px] tracking-[0.3em] uppercase text-foreground/20 mb-6">Elixir not found</p>
                <Link href="/"
                    className="text-[10px] tracking-[0.3em] uppercase text-primary/40 hover:text-primary transition-colors duration-500">
                    ← Return
                </Link>
            </div>
        )
    }

    const ingredients = Array.isArray(elixir.ingredients)
        ? elixir.ingredients.map((i: any) => typeof i === 'string' ? { name: i, amount: '', role: '' } : i)
        : []

    const science = elixir.science || []
    const metrics = elixir.targetMetrics || {}

    return (
        <div className="min-h-[100svh] bg-background bg-mystical-gradient text-foreground selection:bg-primary/20">
            <div className="noise-overlay" />

            {/* ── NAV ── */}
            <nav className="relative z-10 px-6 md:px-12">
                <div className="max-w-md mx-auto h-14 flex items-center justify-between">
                    <Link href="/"
                        className="text-[10px] tracking-[0.4em] uppercase font-extralight text-foreground/20 hover:text-foreground/50 transition-colors duration-500">
                        Yarey
                    </Link>
                    <span className="text-[8px] tracking-[0.4em] uppercase text-primary/20">The Apothecary</span>
                </div>
            </nav>

            {/* ── HERO ── */}
            <header className="relative z-10 max-w-md mx-auto px-6 pt-8 pb-12">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease }}>

                    {/* Category pill */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-foreground/[0.06] bg-foreground/[0.02] mb-8">
                        <Leaf className="w-2.5 h-2.5 text-primary/30" />
                        <span className="text-[8px] tracking-[0.4em] uppercase text-foreground/20">{elixir.subtitle || "Botanical Elixir"}</span>
                    </div>

                    {/* Title */}
                    <h1 className="font-serif text-[13vw] md:text-6xl font-light text-foreground leading-[0.9] tracking-[-0.03em] mb-4">
                        {elixir.title}
                    </h1>

                    {/* Description */}
                    <p className="text-[13px] font-light text-foreground/25 leading-[1.9] tracking-wide max-w-xs">
                        {elixir.description}
                    </p>
                </motion.div>

                {/* Thin gold line */}
                <div className="aman-rule mt-10" />
            </header>

            {/* ── CONTENT ── */}
            <main className="relative z-10 max-w-md mx-auto px-6 pb-16 space-y-14">

                {/* BOTANICALS — What's inside */}
                <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3, ease }}>
                    <p className="text-[8px] tracking-[0.4em] uppercase text-foreground/12 mb-6">Botanicals</p>
                    <div>
                        {ingredients.map((ing: any, i: number) => (
                            <motion.div key={i}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + i * 0.08, ease }}
                                className="py-4 border-b border-border/20">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-[15px] font-light text-foreground/60">{ing.name}</span>
                                    <span className="text-[13px] font-serif text-primary/40 italic">{ing.amount}</span>
                                </div>
                                {ing.role && (
                                    <p className="text-[10px] text-foreground/12 mt-1 tracking-wide">{ing.role}</p>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* HOW IT HELPS — Biometric targets */}
                {Object.keys(metrics).length > 0 && (
                    <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.5, ease }}>
                        <p className="text-[8px] tracking-[0.4em] uppercase text-foreground/12 mb-6">How It Helps</p>
                        <div className="grid grid-cols-2 gap-px bg-border/20">
                            {Object.entries(metrics).map(([key, direction], i) => {
                                const info = METRIC_DISPLAY[key] || { label: key, icon: "◎", desc: "" }
                                return (
                                    <motion.div key={key}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.6 + i * 0.1 }}
                                        className="bg-background p-5">
                                        <span className="text-[18px] text-primary/20 block mb-2">{info.icon}</span>
                                        <p className="text-[12px] font-light text-foreground/45 mb-0.5">{info.label}</p>
                                        <p className="text-[9px] text-foreground/12 leading-relaxed mb-3">{info.desc}</p>
                                        <p className={`text-[10px] tracking-[0.2em] uppercase font-light ${direction === "increase" ? "text-primary/40" : "text-primary/40"}`}>
                                            {direction === "increase" ? "↑ Improves" : "↓ Reduces"}
                                        </p>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </motion.section>
                )}

                {/* SCIENCE */}
                {science.length > 0 && (
                    <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6, ease }}>
                        <div className="flex items-center gap-2 mb-6">
                            <GraduationCap className="w-3 h-3 text-foreground/10" />
                            <p className="text-[8px] tracking-[0.4em] uppercase text-foreground/12">The Evidence</p>
                        </div>
                        <div className="space-y-6">
                            {science.map((ref: any, i: number) => (
                                <div key={i} className="border-l border-primary/10 pl-5">
                                    <p className="text-[13px] font-light text-foreground/35 leading-relaxed">
                                        <span className="text-foreground/50">{ref.ingredient}</span> — {ref.mechanism}
                                    </p>
                                    <p className="text-[9px] text-foreground/10 mt-2 italic tracking-wide">{ref.reference}</p>
                                </div>
                            ))}
                        </div>
                    </motion.section>
                )}

                {/* SAFETY NOTE */}
                {elixir.contraindications?.length > 0 && (
                    <section className="border-t border-border/15 pt-6">
                        <p className="text-[8px] tracking-[0.3em] uppercase text-foreground/10 mb-2">Please inform your therapist if you experience</p>
                        <p className="text-[12px] font-light text-foreground/15 tracking-wide">{elixir.contraindications.join("  ·  ")}</p>
                    </section>
                )}

                {/* FOOTER */}
                <footer className="text-center pt-12">
                    <div className="aman-rule mb-8" />
                    <Link href="/" className="inline-flex items-center gap-2 group">
                        <Leaf className="w-3 h-3 text-primary/15 group-hover:text-primary/30 transition-colors duration-500" />
                        <span className="text-[9px] tracking-[0.4em] uppercase text-foreground/10 group-hover:text-foreground/20 transition-colors duration-500">
                            Yarey Sanctuary
                        </span>
                    </Link>
                    <p className="text-[7px] tracking-[0.3em] uppercase text-foreground/5 mt-3">
                        Formulated with intention · Backed by science
                    </p>
                </footer>
            </main>
        </div>
    )
}
