"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { FlaskConical, RefreshCw, Sparkles, ArrowRight } from "lucide-react"

// Ingredient Data
const INGREDIENTS = [
    { id: "ginger", name: "Thai Ginger", color: "bg-amber-400", hex: "#fbbf24", benefit: "Warmth & Circulation" },
    { id: "lemongrass", name: "Lemongrass", color: "bg-lime-400", hex: "#a3e635", benefit: "Clarity & Refresh" },
    { id: "butterfly", name: "Blue Pea", color: "bg-indigo-400", hex: "#818cf8", benefit: "Antioxidant" },
    { id: "chili", name: "Bird Chili", color: "bg-red-500", hex: "#ef4444", benefit: "Deep Heat Pain Relief" },
]

export default function LabPage() {
    const [selected, setSelected] = useState<string[]>([])
    const [isBlending, setIsBlending] = useState(false)
    const [result, setResult] = useState<string | null>(null)

    const toggleIngredient = (id: string) => {
        if (result) return
        if (selected.includes(id)) {
            setSelected(selected.filter(i => i !== id))
        } else {
            if (selected.length < 2) {
                setSelected([...selected, id])
            }
        }
    }

    const blend = () => {
        setIsBlending(true)
        setTimeout(() => {
            setIsBlending(false)
            if (selected.includes("chili")) setResult("The 'Fire-Walker' Essence")
            else if (selected.includes("butterfly")) setResult("The 'Calm-Mind' Extract")
            else setResult("The 'Vitality-Root' Concentrate")
        }, 4000) // Longer visual for the diagram
    }

    const reset = () => {
        setSelected([])
        setResult(null)
    }

    const getBlendColor = () => {
        if (selected.length === 0) return "#e2e8f0"
        const first = INGREDIENTS.find(i => i.id === selected[0])
        return first?.hex || "#e2e8f0"
    }

    return (
        <div className="min-h-screen bg-background py-16">
            <Container className="max-w-2xl text-center">
                <header className="mb-12">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <FlaskConical className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-4xl font-serif text-primary mb-2">The Alchemist's Lab</h1>
                    <p className="text-muted-foreground">
                        Select 2 botanicals to run through the Rotary Evaporator.
                    </p>
                </header>

                {/* Diagram Area */}
                <div className="relative h-80 mb-12 w-full max-w-lg mx-auto bg-white/50 backdrop-blur-sm rounded-3xl border border-secondary/20 p-4">

                    <AnimatePresence>
                        {result && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 flex flex-col items-center justify-center bg-primary/95 backdrop-blur-md rounded-3xl z-20 shadow-xl border border-primary/50"
                            >
                                <Sparkles className="w-12 h-12 text-amber-300 mb-4 animate-pulse" />
                                <h3 className="text-2xl font-serif text-primary-foreground mb-1">{result}</h3>
                                <p className="text-xs text-primary-foreground/80 uppercase tracking-widest mb-6">Extraction Complete</p>
                                <div className="flex gap-4">
                                    <Button
                                        onClick={reset}
                                        variant="outline"
                                        size="sm"
                                        className="border-primary-foreground/30 text-primary hover:bg-white hover:text-primary-foreground"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" /> Reset
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="bg-white text-primary hover:bg-white/90"
                                    >
                                        Pre-Order Extraction <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* SVG Diagram - Zoomed/Cropped ViewBox for better scale */}
                    <svg viewBox="40 20 320 230" className="w-full h-full">
                        <defs>
                            <linearGradient id="glass" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="white" stopOpacity="0.1" />
                            </linearGradient>
                            <linearGradient id="liquid-shine" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="white" stopOpacity="0" />
                                <stop offset="50%" stopColor="white" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="white" stopOpacity="0" />
                            </linearGradient>
                        </defs>

                        {/* MACHINE BASE */}
                        <g transform="translate(50, 220)">
                            <rect x="0" y="0" width="100" height="20" rx="4" fill="#64748b" />
                            <rect x="25" y="-10" width="50" height="10" fill="#94a3b8" />
                            <path d="M10 -10 L90 -10 L85 0 L15 0 Z" fill="#bae6fd" opacity="0.5" />
                            <text x="50" y="15" textAnchor="middle" fontSize="10" fill="white" fontFamily="sans-serif">HEATHING BATH</text>
                        </g>

                        {/* CONDENSER COLUMN */}
                        <g transform="translate(180, 50)">
                            <rect x="0" y="0" width="20" height="150" rx="5" fill="none" stroke="#475569" strokeWidth="2" />
                            {/* Cooling Coils */}
                            <path d="M5 10 Q15 15 5 20 T5 30 T5 40 T5 50 T5 60" fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.6" />
                        </g>

                        {/* EVAPORATION FLASK ASSEMBLY */}
                        {/* Parent Group: Positions the assembly at the connection point (190, 140) and sets angle (-30deg) */}
                        <g transform="translate(190, 140) rotate(-30)">

                            {/* The Neck (Static relative to assembly) */}
                            <rect x="-60" y="-6" width="60" height="12" fill="#cbd5e1" opacity="0.8" />

                            {/* The Spinning Flask */}
                            {/* We put the content in a group to apply 'spin' visual effects if needed, 
                                but in 2D profile a sphere doesn't change shape. 
                                We animate the liquid to show turbulence. */}
                            <g transform="translate(-80, 0)">
                                {/* Flask Body */}
                                <circle cx="0" cy="0" r="35" fill="url(#glass)" stroke="#475569" strokeWidth="2" />

                                {/* Liquid Content */}
                                <g>
                                    <circle cx="0" cy="0" r="30" fill={getBlendColor()} fillOpacity="0.8" />

                                    {/* Spinning/Turbulence Effect Overlay */}
                                    {isBlending && (
                                        <motion.circle
                                            cx="0" cy="0" r="30"
                                            fill="url(#liquid-shine)"
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                        />
                                    )}
                                </g>
                            </g>
                        </g>

                        {/* RECEIVING FLASK */}
                        <g transform="translate(220, 160)">
                            <path d="M-10 -40 L0 0 L10 -40" fill="none" stroke="#475569" strokeWidth="2" />
                            <circle cx="0" cy="20" r="30" fill="url(#glass)" stroke="#475569" strokeWidth="2" />

                            {/* Drip Animation */}
                            {isBlending && (
                                <motion.circle
                                    cx="0" cy="-30" r="4" fill="#f59e0b"
                                    animate={{ cy: 40, opacity: [1, 0] }}
                                    transition={{ repeat: Infinity, duration: 0.8 }}
                                />
                            )}

                            {/* Accumulated Extract */}
                            {isBlending && (
                                <motion.path
                                    d="M-25 20 Q0 45 25 20"
                                    fill="#f59e0b"
                                    opacity="0.8"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 0.8 }}
                                    transition={{ duration: 4 }}
                                />
                            )}

                            <text x="0" y="65" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="sans-serif">EXTRACT</text>
                        </g>

                        {/* Connecting Line */}
                        <line x1="130" y1="140" x2="180" y2="140" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4" opacity="0.5" />
                    </svg>

                </div>

                {/* Ingredient Selection */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {INGREDIENTS.map(ing => (
                        <button
                            key={ing.id}
                            onClick={() => toggleIngredient(ing.id)}
                            disabled={!!result || (selected.length >= 2 && !selected.includes(ing.id))}
                            className={`
                p-4 rounded-xl border text-left transition-all
                ${selected.includes(ing.id)
                                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                                    : "border-border hover:border-primary/50 bg-card"}
                ${(!!result || (selected.length >= 2 && !selected.includes(ing.id))) ? "opacity-50 cursor-not-allowed" : ""}
              `}
                        >
                            <div className={`w-8 h-8 rounded-full ${ing.color} mb-3 shadow-inner`} />
                            <div className="font-medium text-foreground">{ing.name}</div>
                            <div className="text-xs text-muted-foreground">{ing.benefit}</div>
                        </button>
                    ))}
                </div>

                <div className="mt-8">
                    <Button
                        size="lg"
                        onClick={blend}
                        disabled={selected.length < 2 || isBlending || !!result}
                        className="w-full sm:w-auto px-12"
                    >
                        {isBlending ? "Activate Evaporator" : "Start Extraction"}
                    </Button>
                </div>

            </Container>
        </div>
    )
}
