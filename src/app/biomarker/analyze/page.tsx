"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Activity, Hand, Thermometer, Droplet, GlassWater, Sun, X, ChevronRight, Info } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AnalyzingPage() {
    const [status, setStatus] = useState("Connecting to Neural Lattice...");
    const [result, setResult] = useState<any>(null);
    const [score, setScore] = useState<number>(0);
    const [protocol, setProtocol] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    // Health Score Algorithm
    const calculateHealthScore = (metrics: any) => {
        // HRV: 20-100 range -> 0-100 pts
        const hrvScore = Math.min(100, Math.max(0, (metrics.hrv - 20) * 1.25));

        // RHR: 90-40 range (lower is better)
        const rhrScore = Math.min(100, Math.max(0, (90 - metrics.rhr) * 2));

        // Deep Sleep: 30-120 mins -> 0-100 pts
        const sleepScore = Math.min(100, Math.max(0, (metrics.deepSleep - 30) * 1.1));

        return Math.round((hrvScore * 0.4) + (rhrScore * 0.3) + (sleepScore * 0.3));
    }

    // Dynamic Protocol Generator
    const generateProtocol = (metrics: any, pillarName: string) => {
        const isLowHRV = metrics.hrv < 40;
        const isHighStress = metrics.rhr > 75;
        const isPoorSleep = metrics.deepSleep < 60;

        return [
            {
                id: 'massage',
                category: 'Manual Therapy',
                icon: Hand,
                title: pillarName === "Nervous System" ? "Vagus Nerve Release" :
                    pillarName === "Physical Repair" ? "Deep Tissue & Percussion" : "Lymphatic Drainage",
                detail: isHighStress ? "Focus on Cranial-Sacral hold to downregulate sympathetic drive." : "Targeted myofascial release for structural alignment.",
                benefits: ["Systemic Release", "Fascial Unwinding", "Structural Balance"]
            },
            {
                id: 'contrast',
                category: 'Contrast Therapy',
                icon: Thermometer,
                title: isLowHRV ? "Soft Restore" : "Viking Protocol",
                tag: isLowHRV ? "Low Intensity" : "High Intensity",
                tagColor: isLowHRV ? "emerald" : "red",
                detail: isLowHRV ? "15m Sauna (60°C) → 2m Cool Air → Rest" : "15m Sauna (90°C) → 3m Ice Bath (5°C) → Repeat 3x",
                benefits: isLowHRV ? ["Gently Boosts Circulation", "Parasympathetic Safety"] : ["Hormetic Stress Response", "Dopamine Spike"]
            },
            {
                id: 'iv',
                category: 'IV Prescription',
                icon: Droplet,
                title: isPoorSleep ? "Deep Sleep Infusion" : isHighStress ? "Neuro-Calm" : "Mito-Charge",
                detail: isPoorSleep ? "Magnesium, Glycine, Zinc" : isHighStress ? "B-Complex, Taurine, Vit-C" : "NAD+, Glutathione",
                benefits: ["100% Bioavailability", "Cellular Hydration", "Rapid Repletion"]
            },
            {
                id: 'elixir',
                category: 'Botanical Elixir',
                icon: GlassWater,
                title: isHighStress ? "The Grounding" : "The Clarity",
                detail: isHighStress ? "Celery, Green Apple, Ashwagandha" : "Beetroot, Ginger, Lion's Mane",
                benefits: ["Gut-Brain Axis", "Adaptogenic Support", "Raw Enzymes"]
            },
            {
                id: 'lifestyle',
                category: 'Lifestyle',
                icon: Sun,
                title: isPoorSleep ? "Sleep Hygiene" : "Circadian Reset",
                detail: isPoorSleep ? "Complete digital blackout 90m before bed. Take Magnesium Glycinate." : "View morning sunlight for 10m within 30m of waking.",
                benefits: ["Habit Stacking", "Long-term Adherence", "Bio-Rhythm Sync"]
            }
        ];
    }

    useEffect(() => {
        if (result) return; // Stop the cycle if we have a result

        const steps = [
            "Accessing Recovery Data...",
            "Calculating HRV Baseline...",
            "Mapping Circadian Rhythms...",
            "Identifying Pillar Resonance..."
        ];

        let i = 0;
        const interval = setInterval(() => {
            setStatus(steps[i++ % steps.length]);
        }, 2000);

        // Trigger Analysis (Simulated latency)
        const runAnalysis = async () => {
            // Mock Input Data (Randomized for variety)
            const randomCase = Math.random();
            let mockMetrics;

            if (randomCase > 0.66) {
                // High Stress Case (Low HRV, High RHR)
                mockMetrics = {
                    hrv: 25 + Math.random() * 10,
                    rhr: 65 + Math.random() * 5,
                    deepSleep: 45 + Math.random() * 15,
                    respRate: 16 + Math.random() * 2,
                    sleepMidpoint: 170
                };
            } else if (randomCase > 0.33) {
                // Sleep Deprived Case
                mockMetrics = {
                    hrv: 45 + Math.random() * 5,
                    rhr: 55 + Math.random() * 5,
                    deepSleep: 20 + Math.random() * 20, // Very low deep sleep
                    respRate: 14.5,
                    sleepMidpoint: 240 // Late sleep
                };
            } else {
                // Good/Resilient Case
                mockMetrics = {
                    hrv: 65 + Math.random() * 15,
                    rhr: 48 + Math.random() * 4,
                    deepSleep: 100 + Math.random() * 20,
                    respRate: 13.5,
                    sleepMidpoint: 160
                };
            }

            try {
                await new Promise(r => setTimeout(r, 6000)); // Wait for vibe

                const res = await fetch('/api/biomarker/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentMetrics: mockMetrics })
                });

                const data = await res.json();
                if (data.success) {
                    const finalMetrics = mockMetrics || data.result.metrics.current;
                    const calculatedScore = calculateHealthScore(finalMetrics);
                    const generatedProtocol = generateProtocol(finalMetrics, data.result.pillarName);

                    setResult(data.result);
                    setScore(calculatedScore);
                    setProtocol(generatedProtocol);
                    setStatus(`Analysis Complete. Health Score: ${calculatedScore}`);

                    // Save to History (if member exists)
                    const email = localStorage.getItem("yarey_member_email");
                    if (email) {
                        try {
                            const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
                            const { db } = await import("@/lib/firebase");

                            // Sanitize protocol to remove React Components (icons) which cause Firestore crash
                            const sanitizedProtocol = generatedProtocol.map(({ icon, ...rest }: any) => rest);

                            await addDoc(collection(db, "biomarker_logs"), {
                                email,
                                score: calculatedScore,
                                metrics: finalMetrics,
                                pillar: data.result.pillarName,
                                protocol: sanitizedProtocol,
                                timestamp: serverTimestamp()
                            });
                            console.log("Biomarker history saved.");
                        } catch (err) {
                            console.error("Failed to save history", err);
                        }
                    }
                }
            } catch (e) {
                console.error(e);
                setStatus("Connection interrupted. Please retry.");
            }
        };

        runAnalysis();

        return () => clearInterval(interval);
    }, [result]);






    return (
        <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden" >
            <div className="fixed inset-0 noise z-0 pointer-events-none opacity-[0.03]" />

            {/* Pulse Effect - Change color on success */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" >
                <motion.div
                    animate={{
                        scale: result ? [1, 1.05, 1] : [1, 1.2, 1],
                        opacity: result ? [0.1, 0.15, 0.1] : [0.1, 0.3, 0.1]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className={`w-[500px] h-[500px] rounded-full blur-[100px] ${result ? 'bg-emerald-500/10' : 'bg-primary/20'}`}
                />
            </div >

            <div className="z-10 w-full max-w-md space-y-8">

                {!result ? (
                    // LOADING STATE
                    <div className="flex flex-col items-center text-center space-y-8">
                        {/* Using custom SVG or Lucide loader */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        >
                            <Loader2 className="w-12 h-12 text-primary opacity-80" />
                        </motion.div>
                        <h2 className="text-xl font-light tracking-wide font-serif">{status}</h2>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">Do not close this window</p>
                    </div>
                ) : (
                    // SUCCESS STATE (Detailed Result)
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card/70 backdrop-blur-md border border-primary/10 p-8 rounded-2xl shadow-2xl space-y-6"
                    >
                        <div className="text-center space-y-2 border-b border-primary/10 pb-6">
                            <div className="flex items-center justify-center gap-2 text-emerald-500 mb-2">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="text-[10px] uppercase tracking-widest font-mono">Analysis Verified</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-serif text-primary">{result.pillarName}</h1>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Assigned Pillar</p>
                        </div>

                        {/* Health Score Banner */}
                        <div className="bg-[#0c2627] border border-[#D1C09B]/30 p-8 rounded-2xl text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D1C09B] to-transparent opacity-50"></div>
                            <h2 className="text-[#D1C09B] font-serif text-xl mb-2">Overall Health Score</h2>
                            <div className="text-6xl font-light text-white mb-2">{score} <span className="text-xl text-white/40">/ 100</span></div>
                            <div className="text-xs text-white/60 uppercase tracking-widest">Calculated from HRV, RHR & Sleep</div>
                        </div>

                        {/* 5-Dimensional Protocol Grid - Responsive Horizontal Scroll */}
                        <div className="flex overflow-x-auto pb-8 snap-x snap-mandatory gap-4 -mx-6 px-6 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0 lg:px-0 lg:mx-0 no-scrollbar">
                            {protocol && protocol.map((item: any) => (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedItem(item)}
                                    className="min-w-[85vw] md:min-w-[320px] lg:min-w-0 snap-center bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4 hover:bg-white/10 transition-all group cursor-pointer active:scale-95"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <div className="p-1 rounded-full bg-white/5 text-white/40 group-hover:text-white transition-colors">
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-[10px] uppercase tracking-widest text-primary/60 font-bold mb-1">{item.category}</div>
                                        <div className="text-xl font-serif text-white leading-tight min-h-[3.5rem] flex items-center">{item.title}</div>
                                    </div>

                                    {item.tag && (
                                        <span className={`inline-block text-[9px] px-2 py-1 rounded-full border uppercase tracking-wider font-bold ${item.tagColor === 'red' ? 'border-red-500 text-red-300 bg-red-500/10' : 'border-emerald-500 text-emerald-300 bg-emerald-500/10'}`}>
                                            {item.tag}
                                        </span>
                                    )}

                                    <div className="text-xs text-white/50 leading-relaxed border-t border-white/5 pt-4">
                                        {item.detail}
                                    </div>
                                    <div className="text-[10px] text-primary/40 font-bold uppercase tracking-widest pt-2">Tap for Details</div>
                                </div>
                            ))}
                        </div>

                        {/* DETAIL MODAL OVERLAY */}
                        <AnimatePresence>
                            {selectedItem && (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-50 bg-[#051818]/95 backdrop-blur-xl flex items-center justify-center p-6"
                                    onClick={() => setSelectedItem(null)}
                                >
                                    <motion.div
                                        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                                        className="w-full max-w-lg bg-[#0c2627] border border-[#D1C09B]/20 rounded-3xl p-8 relative shadow-2xl overflow-hidden"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={() => setSelectedItem(null)}
                                            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>

                                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6 mx-auto">
                                            <selectedItem.icon className="w-8 h-8" />
                                        </div>

                                        <div className="text-center space-y-2 mb-8">
                                            <div className="text-xs uppercase tracking-[0.2em] text-primary/60 font-bold">{selectedItem.category}</div>
                                            <h3 className="text-3xl font-serif text-white">{selectedItem.title}</h3>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="bg-white/5 p-6 rounded-xl border border-white/5">
                                                <div className="flex items-center gap-2 text-xs text-white/40 uppercase tracking-widest font-bold mb-3">
                                                    <Info className="w-3 h-3" /> Prescription
                                                </div>
                                                <p className="text-lg font-light text-white/90 leading-relaxed">
                                                    {selectedItem.detail}
                                                </p>
                                            </div>

                                            <div>
                                                <div className="text-xs text-white/40 uppercase tracking-widest font-bold mb-3">Therapeutic Benefits</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedItem.benefits.map((benefit: string) => (
                                                        <span key={benefit} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                                                            {benefit}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-white/5 text-center">
                                            <p className="text-[10px] text-white/30 uppercase tracking-widest max-w-xs mx-auto">
                                                This recommendation is dynamically tailored to your biological data.
                                            </p>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>


                        <div className="pt-4">
                            <Link href="/members">
                                <Button className="w-full h-12 rounded-full font-bold tracking-wide" >Return to Member Portal</Button>
                            </Link>
                            <p className="text-[10px] text-center text-muted-foreground mt-4">
                                Please show this screen to your therapist upon arrival.
                            </p>
                        </div>
                    </motion.div>
                )
                }
            </div >
        </main >
    );
}
