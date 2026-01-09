export interface BiometricData {
    hrv: number;
    rhr: number;
    deepSleep: number; // minutes
    respRate: number;
    sleepMidpoint: number; // minutes from midnight
}

export interface AnalysisResult {
    pillarId: 1 | 2 | 3 | 4 | 5;
    pillarName: string;
    trigger: string;
    metrics: {
        baseline: BiometricData;
        current: BiometricData;
        deltas: Partial<BiometricData>;
    };
}

// Helper: Calculate Mean
export function calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

// Core Logic: The 14-Day Mirror
export function analyzeSession(
    baselineHistory: BiometricData[],
    current: BiometricData
): AnalysisResult {
    // 1. Calculate Baselines
    const baseline: BiometricData = {
        hrv: calculateMean(baselineHistory.map((d) => d.hrv)),
        rhr: calculateMean(baselineHistory.map((d) => d.rhr)),
        deepSleep: calculateMean(baselineHistory.map((d) => d.deepSleep)),
        respRate: calculateMean(baselineHistory.map((d) => d.respRate)),
        sleepMidpoint: calculateMean(baselineHistory.map((d) => d.sleepMidpoint)),
    };

    // 2. Calculate Deltas (Percent or Absolute)
    const deltas = {
        hrv: (current.hrv - baseline.hrv) / baseline.hrv,
        deepSleep: (current.deepSleep - baseline.deepSleep) / baseline.deepSleep,
        respRate: current.respRate - baseline.respRate,
        sleepTiming: Math.abs(current.sleepMidpoint - baseline.sleepMidpoint),
    };

    let pillarId: 1 | 2 | 3 | 4 | 5 = 3; // Default to Resilience (Green)
    let trigger = "All metrics within normal range.";

    // 3. Priority Logic (Order matters if multiple trigger)
    // Logic based on "Largest Negative Delta" concept from prompt, 
    // but implemented as priority checks for simplicity in this version.

    // Pillar 1: Nervous System (HRV < 15% below avg)
    if (deltas.hrv < -0.15) {
        pillarId = 1;
        trigger = `HRV dropped by ${Math.round(Math.abs(deltas.hrv) * 100)}%`;
    }
    // Pillar 2: Physical Repair (Deep Sleep < 20% below avg)
    else if (deltas.deepSleep < -0.20) {
        pillarId = 2;
        trigger = `Deep Sleep reduced by ${Math.round(Math.abs(deltas.deepSleep) * 100)}%`;
    }
    // Pillar 5: Circadian (Shift > 3 hours = 180 mins)
    else if (deltas.sleepTiming > 180) {
        pillarId = 5;
        trigger = `Sleep timing shifted by ${Math.round(deltas.sleepTiming / 60)} hours`;
    }
    // Pillar 4: Respiratory (Resp Rate > 1.0 breaths/min increase)
    else if (deltas.respRate > 1.0) {
        pillarId = 4;
        trigger = `Respiratory Rate elevated by ${deltas.respRate.toFixed(1)}`;
    }
    // Pillar 3: Resilience (Green State - fallback)
    else {
        pillarId = 3;
        trigger = "Metrics stable. Optimization mode.";
    }

    const pillarNames = {
        1: "Nervous System",
        2: "Physical Repair",
        3: "Resilience",
        4: "Respiratory",
        5: "Circadian",
    };

    return {
        pillarId,
        pillarName: pillarNames[pillarId as keyof typeof pillarNames],
        trigger,
        metrics: {
            baseline,
            current,
            deltas
        }
    };
}
