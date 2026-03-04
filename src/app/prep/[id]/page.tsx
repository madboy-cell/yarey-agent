"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Check, AlertTriangle, Leaf } from "lucide-react"
import Link from "next/link"

const ease = [0.16, 1, 0.3, 1] as const

export default function PrepPage() {
    const params = useParams()
    const id = params.id as string
    const [elixir, setElixir] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set())

    useEffect(() => {
        if (!id) return
        getDoc(doc(db, "elixirs", id)).then(snap => {
            if (snap.exists()) setElixir({ id: snap.id, ...snap.data() })
            setLoading(false)
        })
    }, [id])

    const toggleStep = (i: number) => {
        setCheckedSteps(prev => {
            const s = new Set(prev)
            s.has(i) ? s.delete(i) : s.add(i)
            return s
        })
    }

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
                <Link href="/admin"
                    className="text-[10px] tracking-[0.3em] uppercase text-primary/40 hover:text-primary transition-colors duration-500">
                    ← Return
                </Link>
            </div>
        )
    }

    const ingredients = Array.isArray(elixir.ingredients)
        ? elixir.ingredients.map((i: any) => typeof i === 'string' ? { name: i, amount: '', role: '' } : i)
        : []

    const steps: string[] = elixir.recipe?.steps || []
    const allDone = steps.length > 0 && checkedSteps.size === steps.length

    return (
        <div className="min-h-[100svh] bg-background bg-mystical-gradient text-foreground selection:bg-primary/20">
            <div className="noise-overlay" />

            {/* ── HEADER ── */}
            <header className="relative z-10">
                <nav className="px-6 md:px-12">
                    <div className="max-w-lg mx-auto h-14 flex items-center justify-between">
                        <Link href="/admin"
                            className="text-[10px] tracking-[0.3em] uppercase font-light text-foreground/15 hover:text-foreground/40 transition-colors duration-500">
                            ← Back
                        </Link>
                        <span className="text-[9px] tracking-[0.4em] uppercase text-foreground/10">Prep Station</span>
                    </div>
                </nav>

                {/* Title bar */}
                <div className="glass-pane">
                    <div className="max-w-lg mx-auto px-6 py-8">
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease }}>
                            <div className="inline-flex items-center gap-2 mb-4">
                                <Leaf className="w-2.5 h-2.5 text-primary/30" />
                                <span className="text-[8px] tracking-[0.4em] uppercase text-primary/30">{elixir.subtitle || "Botanical Elixir"}</span>
                            </div>
                            <h1 className="font-serif text-4xl md:text-5xl font-light text-foreground tracking-[-0.02em] leading-[0.95]">
                                {elixir.title}
                            </h1>

                            <div className="flex items-center gap-6 mt-5">
                                {elixir.recipe?.prepTime && (
                                    <div>
                                        <p className="text-[8px] tracking-[0.3em] uppercase text-foreground/15">Time</p>
                                        <p className="text-sm font-light text-foreground/50">{elixir.recipe.prepTime}</p>
                                    </div>
                                )}
                                {elixir.recipe?.servingSize && (
                                    <div>
                                        <p className="text-[8px] tracking-[0.3em] uppercase text-foreground/15">Serving</p>
                                        <p className="text-sm font-light text-foreground/50">{elixir.recipe.servingSize}</p>
                                    </div>
                                )}
                                {elixir.recipe?.portionsPerBatch && (
                                    <div>
                                        <p className="text-[8px] tracking-[0.3em] uppercase text-foreground/15">Batch</p>
                                        <p className="text-sm font-light text-foreground/50">{elixir.recipe.portionsPerBatch} servings</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </header>

            {/* ── CONTENT ── */}
            <main className="relative z-10 max-w-lg mx-auto px-6 py-10 space-y-12">

                {/* Equipment */}
                {elixir.recipe?.equipment && (
                    <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.15, ease }}>
                        <p className="text-[8px] tracking-[0.4em] uppercase text-foreground/15 mb-4">Equipment</p>
                        <div className="flex flex-wrap gap-2">
                            {elixir.recipe.equipment.map((eq: string) => (
                                <span key={eq}
                                    className="px-4 py-2 border border-primary/[0.08] bg-primary/[0.03] text-[11px] tracking-[0.15em] uppercase text-primary/40 font-light">
                                    {eq}
                                </span>
                            ))}
                        </div>
                    </motion.section>
                )}

                {/* Ingredients */}
                <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.25, ease }}>
                    <p className="text-[8px] tracking-[0.4em] uppercase text-foreground/15 mb-4">Ingredients</p>
                    <div className="space-y-0">
                        {ingredients.map((ing: any, i: number) => (
                            <motion.div key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.06, ease }}
                                className="flex items-center justify-between py-3.5 border-b border-border/30">
                                <div>
                                    <span className="text-[15px] font-light text-foreground/70">{ing.name}</span>
                                    {ing.role && <p className="text-[10px] text-foreground/15 mt-0.5">{ing.role}</p>}
                                </div>
                                <span className="text-[15px] font-serif text-primary/50">{ing.amount}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* Steps */}
                {steps.length > 0 && (
                    <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.35, ease }}>
                        <p className="text-[8px] tracking-[0.4em] uppercase text-foreground/15 mb-4">Preparation</p>
                        <div className="space-y-2">
                            {steps.map((step, i) => {
                                const done = checkedSteps.has(i)
                                return (
                                    <button key={i} onClick={() => toggleStep(i)}
                                        className={`w-full flex items-start gap-4 text-left px-5 py-4 transition-all duration-500 border ${done
                                            ? 'glass-card border-primary/15'
                                            : 'border-border/20 hover:border-border/40 bg-transparent'}`}>
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-500 ${done
                                            ? 'bg-primary text-background'
                                            : 'border border-foreground/10 text-foreground/20'}`}>
                                            {done
                                                ? <Check className="w-3.5 h-3.5" />
                                                : <span className="text-[10px] font-light">{i + 1}</span>}
                                        </span>
                                        <span className={`text-[14px] font-light leading-relaxed transition-all duration-500 ${done ? 'text-foreground/20 line-through' : 'text-foreground/60'}`}>
                                            {step}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>

                        {allDone && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6 text-center py-6 border border-primary/[0.08] bg-primary/[0.03]">
                                <p className="text-[10px] tracking-[0.4em] uppercase text-primary/50">✦ Ready to Serve ✦</p>
                            </motion.div>
                        )}
                    </motion.section>
                )}

                {/* Serving notes */}
                {elixir.recipe?.servingNotes && (
                    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
                        className="flex items-start gap-4 py-5 border-t border-b border-border/20">
                        <AlertTriangle className="w-4 h-4 text-primary/25 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[8px] tracking-[0.3em] uppercase text-primary/25 mb-1">Serving Notes</p>
                            <p className="text-[13px] font-light text-foreground/30 leading-relaxed">{elixir.recipe.servingNotes}</p>
                        </div>
                    </motion.section>
                )}

                {/* Contraindications */}
                {elixir.contraindications?.length > 0 && (
                    <section className="py-4">
                        <p className="text-[8px] tracking-[0.3em] uppercase text-destructive/30 mb-2">⚠ Do not serve if guest reports</p>
                        <p className="text-[13px] font-light text-foreground/20">{elixir.contraindications.join(" · ")}</p>
                    </section>
                )}
            </main>
        </div>
    )
}
