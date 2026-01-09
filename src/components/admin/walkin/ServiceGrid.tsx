import React from 'react'
import { motion } from "framer-motion"
import { Sparkles, Wind, Waves, Moon, Hand } from "lucide-react"

interface Treatment {
    id: string
    title: string
    category: string
    duration_min: number
    price_thb: number
    description: string
    active: boolean
}

interface ServiceGridProps {
    treatments: Treatment[]
    onSelect: (treatment: Treatment) => void
}

export function ServiceGrid({ treatments, onSelect }: ServiceGridProps) {
    const categories = Array.from(new Set(treatments.map(t => t.category)))

    const getIcon = (cat: string) => {
        if (cat === "Nordic Zone") return <Wind className="w-4 h-4" />
        if (cat === "Massage") return <Hand className="w-4 h-4" />
        if (cat === "Rest") return <Moon className="w-4 h-4" />
        return <Sparkles className="w-4 h-4" />
    }

    // New Style: Dark Card with Category Accent Line
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
                            {treatments.filter(t => t.category === cat && t.active).map(t => (
                                <motion.button
                                    whileHover={{ y: -2, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)" }}
                                    whileTap={{ scale: 0.98 }}
                                    key={t.id}
                                    onClick={() => onSelect(t)}
                                    className={`relative p-5 rounded-xl border border-white/5 bg-[#081C1C] text-left transition-all group hover:bg-[#0F2E2E] hover:border-primary/30 border-l-[3px] shadow-lg ${getAccentColor(t.category)}`}
                                >
                                    <div className="flex flex-col h-full justify-between gap-4">
                                        <div className="font-serif text-lg leading-tight text-foreground group-hover:text-white transition-colors">
                                            {t.title}
                                        </div>
                                        <div className="flex justify-between items-end border-t border-white/5 pt-3">
                                            <span className="text-xs font-bold text-foreground/40">{t.duration_min} min</span>
                                            <span className="text-sm font-mono font-medium text-primary">฿{t.price_thb.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Magical Glow Effect on Hover */}
                                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                </motion.button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
