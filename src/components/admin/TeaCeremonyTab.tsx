"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Sparkles, Leaf, GraduationCap, Clock, Thermometer,
    AlertTriangle, ChevronDown, ChevronUp, Coffee, Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirestoreCRUD, useFirestoreCollection } from "@/hooks/useFirestore"

// ─── Types ─────────────────────────────────────────────
interface Tea {
    id: string
    name: string
    type: string
    origin: string
    description: string
    benefit: string
    ingredients: { name: string; amount: string; role: string }[]
    brewing: { temperature: string; steepTime: string; portions: string; notes?: string }
    science: { ingredient: string; mechanism: string; reference: string }[]
    targetMetrics?: Record<string, string>
    treatmentScores: Record<string, number>  // e.g. { "Ice Bath": 95, "Massage": 72 }
    contraindications?: string[]
    color: string
    active: boolean
}

// ─── Treatment definitions ─────────────────────────────
const TREATMENTS = [
    { key: "Massage", icon: "✋", label: "Massage" },
    { key: "Deep Tissue", icon: "💪", label: "Deep Tissue" },
    { key: "Ice Bath", icon: "🧊", label: "Ice Bath" },
    { key: "Contrast", icon: "🔥", label: "Contrast" },
    { key: "Craniosacral", icon: "🧠", label: "Craniosacral" },
    { key: "Sound", icon: "🔔", label: "Sound Bath" },
    { key: "Red Light", icon: "🔴", label: "Red Light" },
    { key: "Evening", icon: "🌙", label: "Evening" },
    { key: "Morning", icon: "☀️", label: "Morning" },
]

const BENEFIT_COLORS: Record<string, string> = {
    "Stress Relief": "text-indigo-400",
    "Anti-Inflammation": "text-amber-400",
    "Recovery": "text-emerald-400",
    "Deep Sleep": "text-purple-400",
    "Focus": "text-green-400",
    "Digestive": "text-yellow-400",
    "Circulation": "text-rose-400",
    "Muscle Repair": "text-orange-400",
    "Calm Clarity": "text-amber-300",
    "Emotional Balance": "text-pink-400",
    "Thermogenesis": "text-lime-400",
    "Antioxidant": "text-fuchsia-400",
}

function getScoreColor(score: number): string {
    if (score >= 90) return "text-emerald-400 bg-emerald-500/15 border-emerald-500/25"
    if (score >= 70) return "text-primary bg-primary/15 border-primary/25"
    if (score >= 50) return "text-foreground/40 bg-foreground/5 border-foreground/10"
    return "text-foreground/20 bg-foreground/[0.02] border-foreground/5"
}

function getScoreLabel(score: number): string {
    if (score >= 90) return "Perfect match"
    if (score >= 75) return "Great match"
    if (score >= 50) return "Good option"
    return "Mild benefit"
}

// ─── Component ─────────────────────────────────────────
export function TeaCeremonyTab() {
    const { data: teas } = useFirestoreCollection("teas")
    const teaOps = useFirestoreCRUD("teas")
    const [selectedTreatment, setSelectedTreatment] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [showScience, setShowScience] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false })

    const showToast = (msg: string) => {
        setToast({ message: msg, visible: true })
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000)
    }

    const allTeas = teas as Tea[]

    // Score-based ranking
    const ranked = selectedTreatment
        ? allTeas
            .filter(t => t.active !== false)
            .map(t => ({
                tea: t,
                score: t.treatmentScores?.[selectedTreatment!] ?? 50,
            }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
        : []

    return (
        <div className="space-y-0">
            {/* ─── HEADER ─── */}
            <div className="mb-8">
                <h2 className="font-serif text-2xl text-foreground">The Tea Ceremony</h2>
                <p className="text-xs text-foreground/25 mt-1">Tap the treatment → ranked tea recommendations</p>
            </div>

            {/* ─── TREATMENT SELECTOR ─── */}
            <div className="mb-6">
                <p className="text-[8px] tracking-[0.4em] uppercase text-foreground/15 font-bold mb-3">
                    {selectedTreatment ? "Selected treatment" : "What did the guest just finish?"}
                </p>
                <div className="flex flex-wrap gap-2">
                    {TREATMENTS.map(t => {
                        const isActive = selectedTreatment === t.key
                        return (
                            <button key={t.key}
                                onClick={() => {
                                    setSelectedTreatment(isActive ? null : t.key)
                                    setShowScience(null)
                                }}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-300 ${isActive
                                    ? "bg-primary/15 border-primary/30 shadow-lg shadow-primary/5 scale-[1.02]"
                                    : "bg-card/30 border-border/15 hover:border-border/30"}`}>
                                <span className="text-base">{t.icon}</span>
                                <span className={`text-[10px] uppercase tracking-wider font-bold ${isActive ? "text-primary" : "text-foreground/20"}`}>
                                    {t.label}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* ─── RANKED RESULTS ─── */}
            <AnimatePresence mode="wait">
                {selectedTreatment && ranked.length > 0 ? (
                    <motion.div
                        key={selectedTreatment}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="space-y-3">

                        <p className="text-[8px] tracking-[0.3em] uppercase text-foreground/12 mb-1">
                            {ranked.length} tea{ranked.length > 1 ? 's' : ''} ranked for {selectedTreatment}
                        </p>

                        {ranked.map(({ tea, score }, i) => {
                            const isFirst = i === 0
                            const isExpanded = expandedId === tea.id || (isFirst && expandedId === null)
                            const scienceOpen = showScience === tea.id

                            return (
                                <motion.div key={tea.id}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className={`bg-gradient-to-br ${tea.color} rounded-xl border overflow-hidden transition-all ${isFirst ? 'border-primary/25' : 'border-border/15'}`}>

                                    {/* Compact header — always visible */}
                                    <button onClick={() => setExpandedId(isExpanded ? (isFirst ? '__none__' : null) : tea.id)}
                                        className="w-full px-4 py-3 flex items-center gap-3 text-left">
                                        {/* Score */}
                                        <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center border flex-shrink-0 ${getScoreColor(score)}`}>
                                            <span className="text-base font-serif font-bold leading-none">{score}</span>
                                        </div>

                                        {/* Name + info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                {isFirst && <span className="text-[7px] bg-primary/20 text-primary px-1 py-0.5 rounded font-bold uppercase tracking-wider">Top</span>}
                                                <h3 className="font-serif text-base text-foreground truncate">{tea.name}</h3>
                                            </div>
                                            <p className="text-[9px] text-foreground/20 truncate">{tea.type} · {tea.brewing.temperature} · {tea.brewing.steepTime}</p>
                                        </div>

                                        {/* Benefit tag */}
                                        <span className={`text-[8px] font-bold flex-shrink-0 ${BENEFIT_COLORS[tea.benefit] || 'text-foreground/30'}`}>
                                            {tea.benefit}
                                        </span>

                                        <ChevronDown className={`w-3.5 h-3.5 text-foreground/15 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Expanded details */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                                className="overflow-hidden">
                                                <div className="px-4 pb-4 pt-1 border-t border-white/[0.04]">
                                                    {/* Description */}
                                                    <p className="text-[11px] text-foreground/25 mb-3">{tea.description}</p>

                                                    {/* Brewing */}
                                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                                        <div className="bg-background/15 rounded-lg p-2 text-center">
                                                            <p className="font-serif text-foreground/50 text-sm">{tea.brewing.temperature}</p>
                                                            <p className="text-[7px] text-foreground/10 uppercase">Temp</p>
                                                        </div>
                                                        <div className="bg-background/15 rounded-lg p-2 text-center">
                                                            <p className="font-serif text-foreground/50 text-sm">{tea.brewing.steepTime}</p>
                                                            <p className="text-[7px] text-foreground/10 uppercase">Steep</p>
                                                        </div>
                                                        <div className="bg-background/15 rounded-lg p-2 text-center">
                                                            <p className="font-serif text-foreground/50 text-sm">{tea.brewing.portions}</p>
                                                            <p className="text-[7px] text-foreground/10 uppercase">Serve</p>
                                                        </div>
                                                    </div>

                                                    {/* Ingredients — compact */}
                                                    <div className="mb-3">
                                                        {tea.ingredients.map(ing => (
                                                            <div key={ing.name} className="flex justify-between py-1 border-b border-white/[0.03]">
                                                                <span className="text-[11px] text-foreground/35">{ing.name}</span>
                                                                <span className="text-[11px] font-serif text-primary/30">{ing.amount}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Brewing note */}
                                                    {tea.brewing.notes && (
                                                        <div className="flex items-start gap-2 bg-primary/[0.04] border border-primary/8 rounded-lg px-2.5 py-1.5 mb-3">
                                                            <AlertTriangle className="w-2.5 h-2.5 text-primary/20 flex-shrink-0 mt-0.5" />
                                                            <p className="text-[9px] text-primary/25">{tea.brewing.notes}</p>
                                                        </div>
                                                    )}

                                                    {/* Contraindications */}
                                                    {tea.contraindications && tea.contraindications.length > 0 && (
                                                        <div className="bg-red-500/[0.04] border border-red-500/10 rounded-lg px-2.5 py-1.5 mb-3">
                                                            <span className="text-[8px] text-red-400/35">⚠ {tea.contraindications.join(" · ")}</span>
                                                        </div>
                                                    )}

                                                    {/* Other treatment scores */}
                                                    <div className="mb-2">
                                                        <p className="text-[7px] tracking-[0.2em] uppercase text-foreground/10 mb-1">Other treatments</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {TREATMENTS.filter(t => t.key !== selectedTreatment).map(t => {
                                                                const s = tea.treatmentScores?.[t.key] ?? 0
                                                                return (
                                                                    <span key={t.key} className={`px-1.5 py-0.5 rounded text-[7px] border ${getScoreColor(s)}`}>
                                                                        {t.icon} {s}
                                                                    </span>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Science + Delete */}
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => setShowScience(scienceOpen ? null : tea.id)}
                                                            className="flex-1 flex items-center justify-between py-1 text-foreground/12 hover:text-foreground/25 transition-colors">
                                                            <span className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.2em] font-bold">
                                                                <GraduationCap className="w-3 h-3" />Science
                                                            </span>
                                                            {scienceOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                        </button>
                                                        <button onClick={async () => {
                                                            if (!confirm(`Delete "${tea.name}"?`)) return
                                                            await teaOps.remove(tea.id)
                                                            showToast(`🗑 "${tea.name}" deleted`)
                                                        }} className="p-1.5 rounded-lg text-foreground/10 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <AnimatePresence>
                                                        {scienceOpen && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: "auto", opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden space-y-1.5 pt-2">
                                                                {tea.science.map((ref, j) => (
                                                                    <div key={j} className="border-l-2 border-primary/10 pl-2">
                                                                        <p className="text-[9px] text-foreground/25">
                                                                            <strong className="text-foreground/35">{ref.ingredient}</strong> — {ref.mechanism}
                                                                        </p>
                                                                        <p className="text-[7px] text-foreground/10 italic">{ref.reference}</p>
                                                                    </div>
                                                                ))}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )
                        })}
                    </motion.div>

                ) : selectedTreatment && ranked.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-center py-12 text-foreground/15">
                        <Coffee className="w-8 h-8 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No teas scored for this treatment yet</p>
                        <p className="text-[10px] text-foreground/10 mt-1">Discover new teas in the Discover tab</p>
                    </motion.div>

                ) : !selectedTreatment && allTeas.length > 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4">
                        <p className="text-[8px] tracking-[0.4em] uppercase text-foreground/15 font-bold mb-3">
                            All teas · {allTeas.filter(t => t.active !== false).length}
                        </p>
                        <div className="space-y-2">
                            {allTeas.filter(t => t.active !== false).map(tea => (
                                <div key={tea.id} className={`bg-gradient-to-br ${tea.color} rounded-xl border border-border/15 px-4 py-3 flex items-center justify-between`}>
                                    <div className="flex items-center gap-3">
                                        <Leaf className="w-3 h-3 text-primary/20" />
                                        <div>
                                            <p className="font-serif text-base text-foreground/70">{tea.name}</p>
                                            <p className="text-[9px] text-foreground/20">{tea.type} · {tea.origin}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[9px] font-bold ${BENEFIT_COLORS[tea.benefit] || 'text-foreground/30'}`}>{tea.benefit}</span>
                                        <span className="text-[9px] text-foreground/15">{tea.brewing.temperature} · {tea.brewing.steepTime}</span>
                                        <button onClick={async (e) => {
                                            e.stopPropagation()
                                            if (!confirm(`Delete "${tea.name}"?`)) return
                                            await teaOps.remove(tea.id)
                                            showToast(`🗑 "${tea.name}" deleted`)
                                        }} className="p-1 rounded-lg text-foreground/10 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            {/* Empty state */}
            {allTeas.length === 0 && (
                <div className="text-center py-16 text-foreground/15">
                    <Coffee className="w-10 h-10 mx-auto mb-4 opacity-15" />
                    <p className="text-sm mb-1">No teas yet</p>
                    <p className="text-[11px] text-foreground/10">Go to the Discover tab to create AI-powered tea recipes</p>
                </div>
            )}

            {/* Toast */}
            <AnimatePresence>
                {toast.visible && (
                    <motion.div
                        initial={{ opacity: 0, y: 40, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3.5 bg-[#0c2627] border border-primary/30 rounded-2xl shadow-2xl shadow-black/50 backdrop-blur-xl">
                        <p className="text-sm text-foreground font-medium">{toast.message}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
