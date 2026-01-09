"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, Watch } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AppleHealthUploader } from "@/components/biomarker/AppleHealthUploader";
import { useRouter } from "next/navigation";

export default function GuestSyncPage() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [showAppleUpload, setShowAppleUpload] = useState(false);
    const router = useRouter();

    const handleWhoopSync = () => {
        setIsSyncing(true);
        // Mock Redirect for now or actual sync logic if available
        // window.location.href = "/api/auth/whoop/login"; 
        alert("WHOOP Sync simulated. Redirecting...");
        setTimeout(() => router.push("/biomarker/analyze"), 1000);
    };

    const handleAppleSuccess = (data: any) => {
        console.log("Apple Data:", data);
        setShowAppleUpload(false);
        // Redirect to analyzing
        router.push("/biomarker/analyze");
    };

    return (
        <main className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            <div className="fixed inset-0 noise z-0 pointer-events-none opacity-[0.03]" />

            <header className="p-6 md:p-12 z-10">
                <Link href="/" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 text-xs tracking-widest uppercase">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Sanctuary
                </Link>
            </header>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex-1 flex flex-col items-center justify-center p-6 space-y-12 z-10 max-w-xl mx-auto w-full"
            >
                <div className="text-center space-y-4">
                    <h1 className="text-3xl md:text-5xl font-light text-primary font-serif">Biometric Introspection</h1>
                    <p className="text-muted-foreground leading-relaxed">
                        Sync your wearable data to reveal your current physiological state. This interaction is ephemeral; data is analyzed and then discarded.
                    </p>
                </div>

                <div className="bg-[#0c2627] backdrop-blur-md border border-primary/20 p-8 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.4)] w-full space-y-8">
                    <div className="space-y-4">
                        <Button
                            variant="secondary"
                            size="lg"
                            onClick={handleWhoopSync}
                            disabled={isSyncing}
                            className="w-full flex items-center justify-between group h-16 rounded-xl px-6 bg-[#121212] hover:bg-[#202020] border border-white/10 shadow-lg transition-all"
                        >
                            <span className="flex items-center gap-4">
                                <Activity className="w-5 h-5 text-primary" />
                                <div className="text-left">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Recommended</div>
                                    <div className="text-sm font-medium text-white">Sync via WHOOP</div>
                                </div>
                            </span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300 text-white">→</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => setShowAppleUpload(true)}
                            className="w-full flex items-center justify-between group h-16 rounded-xl px-6 bg-white hover:bg-gray-100 border border-transparent shadow-sm transition-all"
                        >
                            <span className="flex items-center gap-4">
                                <Watch className="w-5 h-5 text-black" />
                                <div className="text-left">
                                    <div className="text-sm font-medium text-black">Apple Health Import</div>
                                </div>
                            </span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300 text-black">→</span>
                        </Button>
                    </div>

                    {/* Developer Demo Button - Subtle */}
                    <div className="pt-4 border-t border-white/10 text-center">
                        <Link href="/biomarker/analyze" className="inline-block group">
                            <span className="text-[10px] uppercase tracking-widest text-foreground/30 group-hover:text-primary transition-colors cursor-pointer flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/20 group-hover:bg-primary transition-colors"></span>
                                Internal Testing Protocol
                            </span>
                        </Link>
                    </div>
                </div>

                <div className="text-[10px] text-muted-foreground/40 uppercase tracking-widest text-center max-w-xs leading-relaxed">
                    By syncing, you agree to the ephemeral processing of your health data for the duration of your treatment. Data is wiped post-analysis.
                </div>
            </motion.div>

            {showAppleUpload && (
                <AppleHealthUploader
                    onUploadComplete={handleAppleSuccess}
                    onCancel={() => setShowAppleUpload(false)}
                />
            )}
        </main>
    );
}
