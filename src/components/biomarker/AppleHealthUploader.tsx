"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button"; // Corrected import
import { Upload, X } from "lucide-react";

interface AppleHealthUploaderProps {
    onUploadComplete: (data: any) => void;
    onCancel: () => void;
}

export function AppleHealthUploader({ onUploadComplete, onCancel }: AppleHealthUploaderProps) {
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        setError(null);

        try {
            console.log("Reading file:", file.name);

            // Simulating processing time
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Mock extracted data
            const mockData = {
                source: "apple_health",
                metrics: {
                    hrv: { mean: 45, unit: "ms" },
                    rhr: { mean: 58, unit: "bpm" },
                    sleep: { avgDuration: 7.5, unit: "hours" }
                }
            };

            onUploadComplete(mockData);

        } catch (err) {
            console.error(err);
            setError("Failed to parse Health Export. Please ensure it's a valid XML export.");
        } finally {
            setIsParsing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="bg-card border border-primary/20 p-8 w-full max-w-md relative space-y-6 shadow-2xl rounded-2xl">
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center space-y-2">
                    <h3 className="text-xl font-light text-primary">Apple Health Import</h3>
                    <p className="text-sm text-muted-foreground">
                        Upload your 'export.xml' file from the Apple Health app.
                    </p>
                </div>

                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-primary/20 hover:border-primary/50 transition-colors p-12 flex flex-col items-center justify-center gap-4 cursor-pointer rounded-xl"
                >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                        {isParsing ? "Analyzing Bio-Data..." : "Click to Upload"}
                    </span>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xml"
                    className="hidden"
                />

                {error && (
                    <p className="text-xs text-red-500 text-center">{error}</p>
                )}

                <div className="text-[10px] text-muted-foreground/40 text-center">
                    Note: Large files may take a moment to process.
                </div>
            </div>
        </div>
    );
}
