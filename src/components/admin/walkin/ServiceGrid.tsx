import React, { useState } from 'react'
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Wind, Moon, Hand, X } from "lucide-react"
import { Treatment, TreatmentVariant } from "@/types"
import { getVariants, priceRange, durationRange } from "@/lib/treatments"

interface ServiceGridProps {
    treatments: Treatment[]
    onSelect: (treatment: Treatment & { selectedVariant?: TreatmentVariant }) => void
}

export function ServiceGrid({ treatments, onSelect }: ServiceGridProps) {
    const [variantPicker, setVariantPicker] = useState<Treatment | null>(null)
    const categories = Array.from(new Set(treatments.map(t => t.category)))

    const getIcon = (cat: string) => {
        if (cat === "Nordic Zone") return <Wind className="w-4 h-4" />
        if (cat === "Massage") return <Hand className="w-4 h-4" />
        if (cat === "Rest") return <Moon className="w-4 h-4" />
        return <Sparkles className="w-4 h-4" />
    }

    const getAccentColor = (cat: string) => {
        if (cat === "Nordic Zone") return "border-l-blue-400"
        if (cat === "Massage") return "border-l-orange-400"
        if (cat === "Rest") return "border-l-purple-400"
        return "border-l-emerald-400"
    }

    const getTextAccent = (cat: string) => {
        if (cat === "Nordic Zone") return "text-blue-300"
        if (cat === "Massage") return "text-orange-300"
        if (cat === "Rest") return "text-purple-300"
        return "text-emerald-300"
    }

    const handleTreatmentClick = (t: Treatment) => {
        const variants = getVariants(t)
        if (variants.length === 1) {
            // Single variant — select immediately
            onSelect({ ...t, selectedVariant: variants[0] })
        } else {
            // Multiple variants — show picker
            setVariantPicker(t)
        }
    }

    const handleVariantSelect = (t: Treatment, v: TreatmentVariant) => {
        onSelect({
            ...t,
            duration_min: v.duration_min,
            price_thb: v.price_thb,
            selectedVariant: v,
        })
        setVariantPicker(null)
    }

    return (
        <div className="h-full overflow-y-auto p-6 pb-32">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary/60 mb-8 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Select Ritual
            </h2>

            <div className="space-y-10">
                {categories.map(cat => (
                    <div key={cat}>
                        <h3 className={`text-xs font-bold mb-4 flex items-center gap-2 uppercase tracking-widest ${getTextAccent(cat)}`}>
                            {getIcon(cat)} {cat}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {treatments.filter(t => t.category === cat && t.active).map(t => {
                                const variants = getVariants(t)
                                return (
                                    <motion.button
                                        whileHover={{ y: -2, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)" }}
                                        whileTap={{ scale: 0.98 }}
                                        key={t.id}
                                        onClick={() => handleTreatmentClick(t)}
                                        className={`relative p-5 rounded-xl border border-border/30 bg-card text-left transition-all group hover:bg-card/80 hover:border-primary/30 border-l-[3px] shadow-lg ${getAccentColor(t.category)}`}
                                    >
                                        <div className="flex flex-col h-full justify-between gap-4">
                                            <div className="font-serif text-lg leading-tight text-white/90 group-hover:text-white transition-colors">
                                                {t.title}
                                                {variants.length > 1 && (
                                                    <span className="ml-2 text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase font-sans">
                                                        {variants.length} options
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-end border-t border-white/5 pt-3">
                                                <span className="text-xs font-bold text-foreground/40">{durationRange(t)}</span>
                                                <span className="text-sm font-mono font-medium text-primary">{priceRange(t)}</span>
                                            </div>
                                        </div>
                                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    </motion.button>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Variant Picker Modal */}
            <AnimatePresence>
                {variantPicker && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setVariantPicker(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 10 }}
                            className="bg-card rounded-2xl p-6 border border-primary/20 max-w-sm w-full mx-4"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-serif text-lg">{variantPicker.title}</h3>
                                <button onClick={() => setVariantPicker(null)}>
                                    <X className="w-4 h-4 text-white/40" />
                                </button>
                            </div>
                            <p className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold mb-3">Select Duration</p>
                            <div className="space-y-2">
                                {getVariants(variantPicker).map((v, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleVariantSelect(variantPicker, v)}
                                        className="w-full p-4 rounded-xl border border-border/30 bg-secondary/50 hover:bg-primary/10 hover:border-primary/30 transition-all text-left flex justify-between items-center group"
                                    >
                                        <div>
                                            <span className="text-sm font-bold text-foreground">{v.duration_min} min</span>
                                            {v.label && <span className="text-[10px] text-foreground/40 ml-2">{v.label}</span>}
                                        </div>
                                        <span className="text-sm font-mono text-primary group-hover:text-primary/80">
                                            ฿{v.price_thb.toLocaleString()}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
