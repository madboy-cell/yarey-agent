"use client"

import { motion } from "framer-motion"
import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Share2, Moon, Activity, Thermometer, Droplets } from "lucide-react"
import Link from "next/link"

export default function SummaryPage() {
    return (
        <div className="min-h-screen bg-background py-12">
            <Container className="max-w-md">

                {/* Nav */}
                <div className="flex items-center justify-between mb-8">
                    <Link href="/profile">
                        <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" /> Profile</Button>
                    </Link>
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Post-Session Report</span>
                </div>

                {/* Header */}
                <header className="mb-8 text-center">
                    <h1 className="text-3xl font-serif text-primary mb-2">Recovery Insights</h1>
                    <p className="text-muted-foreground text-sm">Session: Thermal Contrast & Deep Tissue</p>
                    <p className="text-xs text-muted-foreground/60">Oct 24, 2026 • 2:00 PM</p>
                </header>

                {/* Main Score Card */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mb-8"
                >
                    <Card className="border-none bg-primary text-primary-foreground overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -translate-y-10 translate-x-10" />
                        <div className="relative p-8 text-center">
                            <div className="text-sm font-medium opacity-80 uppercase tracking-wider mb-2">Nervous System Shift</div>
                            <div className="text-6xl font-serif mb-2 flex items-baseline justify-center gap-2">
                                +42<span className="text-2xl">%</span>
                            </div>
                            <p className="text-sm opacity-90 max-w-[200px] mx-auto">Shifted from Sympathetic (Stress) to Parasympathetic (Rest) dominance.</p>
                        </div>

                        {/* Graph Visualization */}
                        <div className="h-16 bg-white/10 flex items-end px-8 gap-1 pt-4">
                            {[30, 45, 35, 60, 75, 50, 80, 95, 85, 90, 100].map((h, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    transition={{ delay: i * 0.05, duration: 0.5 }}
                                    className="flex-1 bg-white/40 rounded-t-sm"
                                />
                            ))}
                        </div>
                    </Card>
                </motion.div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="p-4 border-none bg-orange-50/50">
                            <Thermometer className="w-5 h-5 text-orange-500 mb-2" />
                            <div className="text-2xl font-serif text-primary">4:1</div>
                            <div className="text-xs text-muted-foreground font-medium uppercase">Contrast Ratio</div>
                            <p className="text-[10px] text-muted-foreground mt-1">45m Heat / 11m Cold</p>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="p-4 border-none bg-indigo-50/50">
                            <Moon className="w-5 h-5 text-indigo-500 mb-2" />
                            <div className="text-2xl font-serif text-primary">+14<span className="text-sm">ms</span></div>
                            <div className="text-xs text-muted-foreground font-medium uppercase">HRV Boost</div>
                            <p className="text-[10px] text-muted-foreground mt-1">Est. tonight</p>
                        </Card>
                    </motion.div>
                </div>

                {/* AI Prescription */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mb-8"
                >
                    <h3 className="text-lg font-serif text-primary mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Recommended Recovery
                    </h3>
                    <div className="space-y-3">
                        <div className="flex gap-4 p-4 bg-white border border-border/50 rounded-xl items-center">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <Droplets className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="font-medium text-primary">Hydration Protocol</div>
                                <div className="text-xs text-muted-foreground">Core temp raised 1.2°C. Drink 500ml electrolyte water before bed.</div>
                            </div>
                        </div>
                        <div className="flex gap-4 p-4 bg-white border border-border/50 rounded-xl items-center">
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                <Moon className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <div className="font-medium text-primary">Sleep Window</div>
                                <div className="text-xs text-muted-foreground">Melatonin peak expected at 10:30 PM. Avoid screens after 9:00 PM.</div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Share */}
                <div className="text-center">
                    <Button variant="outline" className="gap-2 w-full">
                        <Share2 className="w-4 h-4" /> Share My Vitals
                    </Button>
                </div>

            </Container>
        </div>
    )
}
