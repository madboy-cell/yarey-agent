"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Activity } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AnalyzingPage() {
    const [status, setStatus] = useState("Connecting to Neural Lattice...");
    const [result, setResult] = useState<any>(null);

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
                    setResult(data.result);
                    setStatus(`Assigned Pillar: ${data.result.pillarName}`);
                }
            } catch (e) {
                console.error(e);
                setStatus("Connection interrupted. Please retry.");
            }
        };

        runAnalysis();

        return () => clearInterval(interval);
    }, [result]);

    // Pillar Details Mapping
    const PILLAR_DETAILS = {
        1: {
            // NERVOUS SYSTEM
            protocol: "Vagus Nerve Stimulation",
            desc: "A targeted manual therapy focusing on the Sternocleidomastoid and Suboccipital muscles. This protocol uses gentle compression and release techniques to stimulating the vagus nerve, signaling the parasympathetic nervous system to lower heart rate and reduce cortisol.",
            benefits: ["Lowers Cortisol", "Increases HRV", "Reduces Anxiety"],
            rotavap: "Velvet Night",
            rotavapDesc: "A potent nervous system downregulator. Lavender hydrosol provides linalool for anxiolytic effects, while Magnesium Glycinate directly relaxes neuromuscular tension.",
            rotavapBenefits: ["Anxiolytic", "Muscle Relaxant", "Sleep Primer"],
            ingredients: ["Lavender Hydrosol", "Mg Glycinate", "Tart Cherry"]
        },
        2: {
            // PHYSICAL REPAIR
            protocol: "Deep Tissue Reconstruction",
            desc: "Focuses on mobilizing lactic acid and breaking down fascial adhesions. We utilize percussive therapy combined with firm myofascial release to increase blood flow to fatigued muscle groups, accelerating the removal of metabolic waste products.",
            benefits: ["Accelerates Recovery", "Reduces Inflammation", "Restores Mobility"],
            rotavap: "Iron Root",
            rotavapDesc: "A powerful systemic anti-inflammatory. Curcumin from Turmeric and Gingerol from Ginger work synergistically to suppress pro-inflammatory cytokines, reducing soreness and joint pain.",
            rotavapBenefits: ["Anti-Inflammatory", "Pain Relief", "Gut Health"],
            ingredients: ["Turmeric Extract", "Ginger Root", "Black Pepper"]
        },
        3: {
            // RESILIENCE
            protocol: "Contrast Therapy Cycle",
            desc: "A rigorous cycle of thermal stress. You will move between the 90°C sauna and 5°C cold plunge in a 3:1 ratio. This vascular pumping action strengthens the endothelial lining of your blood vessels and conditions your autonomic nervous system.",
            benefits: ["Vascular Strength", "Immune Boost", "Mental Fortitude"],
            rotavap: "Clear Sky",
            rotavapDesc: "Designed to support cognitive clarity during stress. L-Theanine promotes alpha-wave production, creating a state of 'relaxed alertness' without caffeine jitters.",
            rotavapBenefits: ["Cognitive Boost", "Stress Reduction", "Alpha Waves"],
            ingredients: ["Lemon Balm", "L-Theanine", "Green Tea"]
        },
        4: {
            // RESPIRATORY
            protocol: "Diaphragmatic Release",
            desc: "Targets the intercostal muscles and the diaphragm itself. Through manual rib-cage mobilization and guided breathwork retention (hypoxia training), we expand lung capacity and improve CO2 tolerance for deeper oxygenation.",
            benefits: ["Lung Expansion", "CO2 Tolerance", "Oxygen Uptake"],
            rotavap: "Open Air",
            rotavapDesc: "A bronchodilatory blend. Menthol from Peppermint and saponins from Mullein help clear mucus pathways and soothe the respiratory tract for easier breathing.",
            rotavapBenefits: ["Bronchodilation", "Mucus Clearance", "O2 Transport"],
            ingredients: ["Eucalyptus", "Peppermint", "Mullein"]
        },
        5: {
            // CIRCADIAN
            protocol: "Circadian Reset",
            desc: "Uses specific wavelengths of light therapy in conjunction with a magnesium transdermal application. This protocol is designed to suppress melatonin during the 'biological day' or promote it during the 'biological night', resetting your internal clock.",
            benefits: ["Sleep Onset", "REM Quality", "Morning Energy"],
            rotavap: "Deep Ocean",
            rotavapDesc: "A complete sleep-architecture optimizier. Apigenin from Chamomile binds to benzodiazepine receptors to induce sedation without grogginess.",
            rotavapBenefits: ["Sedation", "Sleep Architecture", "Deep Rest"],
            ingredients: ["Chamomile", "Reishi Spore", "Glycine"]
        }
    };

    const details = result ? PILLAR_DETAILS[result.pillarId as keyof typeof PILLAR_DETAILS] : null;

    return (
        <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="fixed inset-0 noise z-0 pointer-events-none opacity-[0.03]" />

            {/* Pulse Effect - Change color on success */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div
                    animate={{
                        scale: result ? [1, 1.05, 1] : [1, 1.2, 1],
                        opacity: result ? [0.1, 0.15, 0.1] : [0.1, 0.3, 0.1]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className={`w-[500px] h-[500px] rounded-full blur-[100px] ${result ? 'bg-emerald-500/10' : 'bg-primary/20'}`}
                />
            </div>

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

                        <div className="space-y-8">
                            <div className="p-6 bg-primary/5 rounded-xl border border-primary/10">
                                <label className="text-[10px] text-primary/60 uppercase tracking-widest font-bold mb-3 block flex items-center gap-2">
                                    <Activity className="w-3 h-3" /> Clinical Rationale
                                </label>
                                <p className="text-lg font-light leading-relaxed text-foreground/90 font-serif">
                                    "{result.trigger}"
                                </p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Based on your 14-day history, your body would benefit most from the <strong>{details?.protocol}</strong> protocol.
                                </p>
                            </div>

                            {/* Measured Metrics Snapshot */}
                            <div className="grid grid-cols-4 gap-4 pb-6">
                                <div className="bg-white/50 p-4 rounded-xl border border-white shadow-sm text-center backdrop-blur-sm">
                                    <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">HRV</div>
                                    <div className="text-2xl font-light text-foreground">{Math.round(result.metrics.current.hrv)} <span className="text-[10px] text-muted-foreground font-bold">ms</span></div>
                                </div>
                                <div className="bg-white/50 p-4 rounded-xl border border-white shadow-sm text-center backdrop-blur-sm">
                                    <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">RHR</div>
                                    <div className="text-2xl font-light text-foreground">{Math.round(result.metrics.current.rhr)} <span className="text-[10px] text-muted-foreground font-bold">bpm</span></div>
                                </div>
                                <div className="bg-white/50 p-4 rounded-xl border border-white shadow-sm text-center backdrop-blur-sm">
                                    <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Deep Sleep</div>
                                    <div className="text-2xl font-light text-foreground">{Math.round(result.metrics.current.deepSleep)} <span className="text-[10px] text-muted-foreground font-bold">min</span></div>
                                </div>
                                <div className="bg-white/50 p-4 rounded-xl border border-white shadow-sm text-center backdrop-blur-sm">
                                    <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Resp</div>
                                    <div className="text-2xl font-light text-foreground">{result.metrics.current.respRate.toFixed(1)} <span className="text-[10px] text-muted-foreground font-bold">/m</span></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-border/20 pt-8">
                                {/* Treatment Protocol */}
                                <div className="space-y-4">
                                    <div className="flex flex-col h-full">
                                        <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold block mb-4">Manual Therapy Protocol</label>
                                        <h3 className="text-2xl font-serif text-foreground mb-3">{details?.protocol}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-grow">{details?.desc}</p>

                                        <div className="flex flex-wrap gap-2">
                                            {details?.benefits.map((benefit: string) => (
                                                <span key={benefit} className="text-[10px] px-3 py-1.5 bg-background border border-border rounded-full font-bold uppercase tracking-wider text-foreground/60">{benefit}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Pharmacology */}
                                <div className="space-y-4 md:border-l md:border-border/20 md:pl-8">
                                    <div className="flex flex-col h-full">
                                        <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold block mb-4">Prescribed Rotavap Extraction</label>
                                        <h3 className="text-2xl font-serif text-primary mb-3">"{details?.rotavap}"</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-grow">{details?.rotavapDesc}</p>

                                        <div className="space-y-3">
                                            <div className="flex flex-wrap gap-2">
                                                {details?.rotavapBenefits?.map((benefit: string) => (
                                                    <span key={benefit} className="text-[10px] px-3 py-1.5 bg-primary/5 text-primary border border-primary/10 rounded-full font-bold uppercase tracking-wider">{benefit}</span>
                                                ))}
                                            </div>
                                            <div className="flex flex-wrap gap-1 opacity-60">
                                                {details?.ingredients.map((ing: string, i: number) => (
                                                    <span key={ing} className="text-[10px] font-mono text-muted-foreground">{ing}{i < details.ingredients.length - 1 ? " • " : ""}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Link href="/">
                                <Button className="w-full h-12 rounded-full font-bold tracking-wide" >Return to Sanctuary Home</Button>
                            </Link>
                            <p className="text-[10px] text-center text-muted-foreground mt-4">
                                Please show this screen to your therapist upon arrival.
                            </p>
                        </div>
                    </motion.div>
                )}
            </div>
        </main>
    );
}
