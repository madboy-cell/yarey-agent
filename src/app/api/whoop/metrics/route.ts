import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { generateSimulatedMetrics } from '@/lib/whoop/simulator';
import { calculateSevenDayBaseline } from '@/lib/whoop/baseline';

const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer';

// Token Refresh Helper
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string } | null> {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('client_id', process.env.WHOOP_CLIENT_ID || '');
    params.append('client_secret', process.env.WHOOP_CLIENT_SECRET || '');

    try {
        const response = await fetch(`${'https://api.prod.whoop.com/oauth/oauth2/token'}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        if (!response.ok) {
            console.error('Failed to refresh token:', await response.text());
            return null;
        }

        const data = await response.json();
        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token
        };
    } catch (error) {
        console.error('Error refreshing token:', error);
        return null;
    }
}

// Helper to fetch valid cached data if API fails
async function getCachedData(sessionId: string, emailHint?: string) {
    try {
        let email = emailHint;

        if (!email) {
            // Try to find email from session doc
            const sessionDoc = await getDoc(doc(db, 'whoop_sessions', sessionId));
            if (sessionDoc.exists() && sessionDoc.data().email) {
                email = sessionDoc.data().email;
            } else {
                // sessionId might itself be an email
                email = sessionId.includes('@') ? sessionId : undefined;
            }
        }

        if (!email) return null;

        const logsRef = collection(db, 'biomarker_logs');
        const q = query(
            logsRef,
            where('userEmail', '==', email),
            orderBy('timestamp', 'desc'),
            limit(1)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;

        const data = snapshot.docs[0].data();
        return {
            metrics: data.metrics,
            score_state: 'CACHED',
            last_synced: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString()
        };
    } catch (err) {
        console.error("Failed to fetch cached data", err);
        return null;
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
        return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    try {
        // 1. Get Session & Tokens — try doc ID first, then email query
        let sessionRef;
        let sessionDoc;
        let resolvedSessionId = sessionId;

        const directRef = doc(db, 'whoop_sessions', sessionId);
        const directSnap = await getDoc(directRef);

        if (directSnap.exists()) {
            sessionRef = directRef;
            sessionDoc = directSnap;
            console.log(`[WHOOP] Session found by doc ID: ${sessionId}`);
        } else {
            // sessionId might be an email — query by email field
            const q = query(collection(db, 'whoop_sessions'), where('email', '==', sessionId));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                console.log(`[WHOOP] No session found for: ${sessionId}`);
                return NextResponse.json({ error: 'Session not found' }, { status: 404 });
            }
            const found = snapshot.docs.find(d => d.data().status === 'active') || snapshot.docs[0];
            resolvedSessionId = found.id;
            sessionRef = doc(db, 'whoop_sessions', resolvedSessionId);
            sessionDoc = found;
            console.log(`[WHOOP] Session found by email query, doc ID: ${resolvedSessionId}`);
        }

        if (!sessionDoc.exists()) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        let { access_token, refresh_token } = sessionDoc.data();

        // 2. Define Refresh Logic
        const handleRefresh = async () => {
            const newTokens = await refreshAccessToken(refresh_token);
            if (!newTokens) throw new Error("Failed to refresh token");

            await updateDoc(sessionRef, {
                access_token: newTokens.access_token,
                refresh_token: newTokens.refresh_token,
                updatedAt: new Date().toISOString()
            });
            return newTokens.access_token;
        }

        // 3. Helper to Fetch Baseline (with 1 Retry)
        const fetchBaseline = async (token: string, retrying = false): Promise<any> => {
            try {
                return await calculateSevenDayBaseline(token);
            } catch (error: any) {
                // Check if 401
                if (error.message && error.message.includes('401') && !retrying) {
                    const newToken = await handleRefresh();
                    return fetchBaseline(newToken, true);
                }
                throw error;
            }
        };

        // 4. Execute Fetch
        console.log(`[WHOOP] Fetching live baseline from WHOOP API...`);
        const baselineData = await fetchBaseline(access_token);

        // 5. Transform for Response
        const current = baselineData.currentValue;
        console.log(`[WHOOP] Live data received — ${baselineData.history?.length || 0} days, recovery: ${current?.recoveryScore}%`);

        // Fallback for missing/empty current data
        if (!current || !current.date) {
            throw new Error("No valid WHOOP data found in baseline extraction.");
        }

        return NextResponse.json({
            success: true,
            metrics: {
                hrv: current.hrv,
                rhr: current.rhr,
                recoveryScore: current.recoveryScore,
                deepSleep: current.deepSleep,
                respRate: current.respRate,
                sleepMidpoint: current.sleepMidpoint || 180,
                // v9.0 — full WHOOP intelligence
                spo2: current.spo2 || 0,
                skinTemp: current.skinTemp || 0,
                remSleep: current.remSleep || 0,
                lightSleep: current.lightSleep || 0,
                totalSleep: current.totalSleep || 0,
                sleepEfficiency: current.sleepEfficiency || 0,
                sleepPerformance: current.sleepPerformance || 0,
                sleepConsistency: current.sleepConsistency || 0,
                sleepDebtMs: current.sleepDebtMs || 0,
                sleepCycles: current.sleepCycles || 0,
                disturbances: current.disturbances || 0,
                dayStrain: current.dayStrain || 0,
                dayCalories: current.dayCalories || 0,
                dayAvgHR: current.dayAvgHR || 0,
                dayMaxHR: current.dayMaxHR || 0,
                workoutStrain: current.workoutStrain || 0,
                workoutSport: current.workoutSport || '',
                workoutDurationMin: current.workoutDurationMin || 0,
            },
            score_state: 'SCORED',
            last_synced: new Date().toISOString(),
            dataSource: 'whoop_v2_live',
            baseline: {
                average: baselineData.fourteenDayAverage,
                percentChange: baselineData.percentChange,
                meta: baselineData.meta
            },
            history: baselineData.history || [],
            needsManualCalibration: baselineData.needsManualCalibration || false
        });

    } catch (error: any) {
        console.error("❌ WHOOP V2 API/Baseline Error:", error.message);

        // 6. Fallback: Try Cache first, then Simulation
        const cached = await getCachedData(sessionId);

        if (cached) {
            console.log(`[WHOOP] ⚠️ Using CACHED data for ${sessionId}`);
            return NextResponse.json({
                success: true,
                ...cached,
                dataSource: 'firestore_cache'
            });
        }

        console.log(`[WHOOP] ⚠️ Using SIMULATED data for ${sessionId}`);
        const simMetrics = generateSimulatedMetrics(new Date(), sessionId);

        return NextResponse.json({
            success: true,
            metrics: simMetrics,
            score_state: 'SCORED',
            last_synced: new Date().toISOString(),
            dataSource: 'whoop_simulated',
            baseline: {
                average: { hrv: 65, deepSleep: 45 },
                percentChange: { hrv: 0, deepSleep: 0 },
                meta: { status: 'simulated' }
            }
        });
    }
}
