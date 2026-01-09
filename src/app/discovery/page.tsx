"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowRight, Flame, Snowflake, User, Users, FlaskConical } from "lucide-react"

// Types
// Types
type Mood = "All" | "Restoration" | "Energy" | "Stillness"

interface Service {
    id: string
    title: string
    description: string
    duration: string
    price: string
    moods: Mood[]
    features: string[]
    icon: React.ElementType
}

const SERVICES: Service[] = [
    {
        id: "thermal-contrast",
        title: "Nordic-Thai Contrast",
        description: "A guided cycle of intense heat (Sauna) and shock cooling (Ice Bath). Designed to regulate the nervous system and stimulate circulatory exchange.",
        duration: "60 min",
        price: "฿1,200",
        moods: ["Energy"],
        features: ["90°C Finnish Sauna", "5°C Ice Plunge", "Breath Coaching"],
        icon: Snowflake
    },
    {
        id: "rotavap-ginger",
        title: "The Alchemist’s Massage",
        description: "Signature oil massage using a hyper-concentrated ginger and turmeric essence distilled at room temperature. Intense molecular relief for the soft tissues.",
        duration: "90 min",
        price: "฿2,800",
        moods: ["Restoration", "Energy"],
        features: ["Rotavap Extraction", "Molecular Infusion", "Warm Compress"],
        icon: FlaskConical
    },
    {
        id: "botanical-slumber",
        title: "Deep Stillness Ritual",
        description: "A total sensory surrender. Includes a warm magnesium foot soak, rhythmic lavender oil application, and focused sound-frequency therapy.",
        duration: "120 min",
        price: "฿3,500",
        moods: ["Stillness"],
        features: ["Magnesium Soak", "Vibrational Sound", "Butterfly Pea Mist"],
        icon: User
    },
    {
        id: "duet-sensory",
        title: "Shared Transition",
        description: "Private suite ritual for two. Self-guided exfoliation followed by a rhythmic aromatherapy journey designed for shared grounding.",
        duration: "150 min",
        price: "฿6,500",
        moods: ["Stillness", "Restoration"],
        features: ["Private Suite", "Aromatherapy Duo", "Herbal Infusion"],
        icon: Users
    }
]

export default function DiscoveryPage() {
    const [activeMood, setActiveMood] = useState<Mood>("All")

    const filteredServices = SERVICES.filter(service =>
        activeMood === "All" || service.moods.includes(activeMood)
    )

    return (
        <div className="min-h-screen bg-background py-32 aura-bg">
            <div className="fixed inset-0 noise z-0 pointer-events-none opacity-[0.03]" />
            <Container className="relative z-10">
                {/* Header */}
                <header className="mb-24 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-[10px] uppercase tracking-[0.5em] text-primary/60 font-medium"
                    >
                        Foundation • Sequence • Clarity
                    </motion.div>
                    <h1 className="text-5xl md:text-8xl font-serif text-foreground tracking-tighter lowercase leading-none">The Ritual Map.</h1>
                </header>

                {/* Mood Filter */}
                <div className="flex flex-wrap gap-12 mb-24 border-b border-border/40 pb-8">
                    {(["All", "Restoration", "Energy", "Stillness"] as Mood[]).map((mood) => (
                        <button
                            key={mood}
                            onClick={() => setActiveMood(mood)}
                            className={`
                                text-[10px] uppercase tracking-[0.4em] font-bold transition-all duration-500
                                ${activeMood === mood
                                    ? "text-primary border-b-2 border-primary pb-8 -mb-[33px]"
                                    : "text-foreground/60 hover:text-primary"}
                            `}
                        >
                            {mood}
                        </button>
                    ))}
                </div>

                {/* Service Grid */}
                <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 gap-12"
                >
                    <AnimatePresence mode="popLayout">
                        {filteredServices.map((service) => (
                            <motion.div
                                key={service.id}
                                layout
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.8 }}
                            >
                                <div className="group border border-border/60 bg-white/50 backdrop-blur-sm p-10 md:p-16 flex flex-col gap-12 hover:border-primary/30 hover:bg-white transition-all rounded-[3.5rem] shadow-sm hover:shadow-2xl hover:shadow-primary/10">
                                    <div className="flex justify-between items-start">
                                        <div className="w-16 h-16 rounded-full border border-border flex items-center justify-center shrink-0 group-hover:bg-primary/5 transition-colors">
                                            <service.icon className="w-6 h-6 text-primary/60 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] uppercase tracking-[0.3em] text-foreground/60 font-bold mb-1">{service.duration}</div>
                                            <div className="text-lg font-serif text-primary">{service.price}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <h3 className="text-4xl font-serif text-foreground tracking-tight leading-tight uppercase">{service.title}</h3>
                                        <p className="text-foreground/70 font-light leading-relaxed text-lg min-h-[80px]">{service.description}</p>

                                        <div className="grid grid-cols-1 gap-4 pt-4">
                                            {service.features.map(f => (
                                                <div key={f} className="flex items-center gap-4 border-l border-primary/20 pl-4">
                                                    <span className="text-[10px] uppercase tracking-[0.2em] text-foreground/70 font-bold">
                                                        {f}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-10">
                                            <Link href="/booking">
                                                <Button size="lg" className="w-full md:w-auto px-12 py-8 rounded-full text-[10px] uppercase tracking-[0.4em] font-bold bg-foreground text-background hover:scale-[1.02] transition-all">
                                                    Inquire Ritual
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            </Container>
        </div>
    )
}
