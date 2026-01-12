import { NextResponse } from "next/server";
import { analyzeSession, BiometricData } from "@/lib/biomarker/analysis";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { getWhoopMetrics } from "@/lib/whoop/api";

// Fallback Mock Data Generation (for guests without WHOOP)
const generateMockHistory = (): BiometricData[] => {
    return Array.from({ length: 14 }).map(() => ({
        hrv: 40 + Math.random() * 20,
        rhr: 55 + Math.random() * 5,
        deepSleep: 60 + Math.random() * 30,
        respRate: 14 + Math.random() * 2,
        sleepMidpoint: 180 + Math.random() * 30, // 3 AM +/- 30m
    }));
};

// Transform WHOOP API data to our BiometricData format
const transformWhoopData = (recovery: any[], sleep: any[]): BiometricData[] => {
    // Combine and align by date
    const combined: BiometricData[] = [];

    for (let i = 0; i < Math.min(recovery.length, 14); i++) {
        const rec = recovery[i] || {};
        const slp = sleep[i] || {};

        combined.push({
            hrv: rec.score?.hrv_rmssd_milli || 45,
            rhr: rec.score?.resting_heart_rate || 58,
            deepSleep: (slp.score?.stage_summary?.slow_wave_sleep_milli || 3600000) / 60000, // Convert ms to minutes
            respRate: slp.score?.respiratory_rate || 15,
            sleepMidpoint: 180, // Default 3 AM (could calculate from sleep start/end)
        });
    }

    // Pad with mock data if we have less than 14 days
    while (combined.length < 14) {
        combined.push({
            hrv: 40 + Math.random() * 20,
            rhr: 55 + Math.random() * 5,
            deepSleep: 60 + Math.random() * 30,
            respRate: 14 + Math.random() * 2,
            sleepMidpoint: 180 + Math.random() * 30,
        });
    }

    return combined;
};

export async function POST(request: Request) {
    try {
        const { currentMetrics, clientEmail, whoopSessionId } = await request.json();

        let history: BiometricData[];
        let dataSource: "whoop" | "manual" | "mock" = "mock";

        // 1. Try to fetch real WHOOP data if session ID provided
        if (whoopSessionId) {
            try {
                // Fetch the WHOOP session from Firestore
                const sessionsRef = collection(db, "whoop_sessions");
                const sessionQuery = query(sessionsRef, where("__name__", "==", whoopSessionId));
                const sessionSnap = await getDocs(sessionQuery);

                if (!sessionSnap.empty) {
                    const whoopSession = sessionSnap.docs[0].data();
                    const whoopData = await getWhoopMetrics(whoopSession.access_token, 14);
                    history = transformWhoopData(whoopData.recovery, whoopData.sleep);
                    dataSource = "whoop";
                    console.log("✅ Using real WHOOP data for analysis");
                } else {
                    history = generateMockHistory();
                    console.log("⚠️ WHOOP session not found, using mock data");
                }
            } catch (whoopError) {
                console.error("WHOOP fetch error:", whoopError);
                history = generateMockHistory();
            }
        } else {
            // No WHOOP session - use mock data
            history = generateMockHistory();
            console.log("ℹ️ No WHOOP session, using mock data");
        }

        // 2. Analyze using the 14-Day Mirror algorithm
        const result = analyzeSession(history, currentMetrics);

        // 3. Save result to Firestore
        const sessionData = {
            guestName: "Guest " + Math.floor(Math.random() * 1000),
            email: clientEmail || null,
            dataSource,
            createdAt: Date.now(),
            expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h TTL
            status: "pillar_assigned",
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
        console.log("Session Saved:", docRef.id, "| Data Source:", dataSource);

        return NextResponse.json({
            success: true,
            sessionId: docRef.id,
            result,
            dataSource
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: "Analysis failed" }, { status: 500 });
    }
}
