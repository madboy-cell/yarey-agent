import { NextResponse } from "next/server";
import { analyzeSession, BiometricData } from "@/lib/biomarker/analysis";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

// Mock Data Generation for Demo
const generateHistory = (): BiometricData[] => {
    return Array.from({ length: 14 }).map(() => ({
        hrv: 40 + Math.random() * 20,
        rhr: 55 + Math.random() * 5,
        deepSleep: 60 + Math.random() * 30,
        respRate: 14 + Math.random() * 2,
        sleepMidpoint: 180 + Math.random() * 30, // 3 AM +/- 30m
    }));
};

export async function POST(request: Request) {
    try {
        const { currentMetrics } = await request.json();

        // In production, fetch 14-day history from Firestore
        const history = generateHistory();

        // Determine the result
        const result = analyzeSession(history, currentMetrics);

        // Save result to Firestore
        const sessionData = {
            guestName: "Guest " + Math.floor(Math.random() * 1000), // Mock guest name for now
            createdAt: Date.now(),
            expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h TTL
            status: "pillar_assigned", // Skip 'analyzing' since we just finished
            pillarID: result.pillarId,
            metrics: {
                baseline: result.metrics.baseline,
                intake: result.metrics.current,
                delta: result.metrics.deltas
            },
            output: {
                trigger: result.trigger,
                pillarName: result.pillarName
            }
        };

        const docRef = await addDoc(collection(db, "sessions"), sessionData);
        console.log("Session Saved:", docRef.id);

        return NextResponse.json({ success: true, sessionId: docRef.id, result });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: "Analysis failed" }, { status: 500 });
    }
}
