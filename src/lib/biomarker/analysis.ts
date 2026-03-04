/**
 * Yarey Sanctuary - Bio-Intelligence Analysis
 * v5.0 - 3 Pillar System
 * 
 * Pillars:
 * 1. Nervous System  — HRV drop, RHR spike, resp rate elevation
 * 2. Physical Repair — Deep sleep deficit, HRV secondary, RHR tertiary
 * 3. Resilience      — Body is strong, all metrics near baseline
 */

export const THRESHOLDS = {
    HRV_DROP_NERVOUS: -0.15,
    DEEP_SLEEP_DROP_REPAIR: -0.20,
    RHR_SPIKE_STRESS: 0.10,
    RESP_RATE_SPIKE: 1.0,
} as const

export interface BiometricData {
    hrv: number
    rhr: number
    deepSleep: number
    respRate: number
    sleepMidpoint: number
}

export interface AnalysisResult {
    pillarId: 1 | 2 | 3
    pillarName: string
    trigger: string
    severity: 'mild' | 'moderate' | 'severe'
    scores: Record<string, number>
    metrics: {
        baseline: BiometricData
        current: BiometricData
        deltas: ReturnType<typeof calculateDeltas>
    }
}

export const PILLAR_NAMES: Record<number, string> = {
    1: "Nervous System",
    2: "Physical Repair",
    3: "Resilience"
}

const DEFAULT_BASELINE: BiometricData = {
    hrv: 60, deepSleep: 75, rhr: 55, respRate: 14.5, sleepMidpoint: 180
}

export function calculateMean(values: number[]): number {
    return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length
}

export function calculateDeltas(current: BiometricData, baseline: BiometricData) {
    return {
        hrv: baseline.hrv === 0 ? 0 : (current.hrv - baseline.hrv) / baseline.hrv,
        rhr: baseline.rhr === 0 ? 0 : (current.rhr - baseline.rhr) / baseline.rhr,
        deepSleep: baseline.deepSleep === 0 ? 0 : (current.deepSleep - baseline.deepSleep) / baseline.deepSleep,
        respRate: current.respRate - baseline.respRate,
    }
}

/**
 * 3-pillar weighted scoring.
 * Nervous System absorbs respiratory signals.
 * Physical Repair absorbs circadian signals (poor sleep → poor repair).
 * Resilience = body is strong (inverse of other scores).
 */
function scorePillars(
    deltas: ReturnType<typeof calculateDeltas>,
    recoveryScore?: number
): { pillarId: 1 | 2 | 3; trigger: string; severity: 'mild' | 'moderate' | 'severe'; scores: Record<string, number> } {

    // Recovery amplifier: low recovery = worse scores
    const recoveryAmp = recoveryScore !== undefined
        ? 1.5 - (recoveryScore / 100)
        : 1.0

    // Nervous System: HRV drop + RHR spike + resp rate (absorbed from old Respiratory pillar)
    const nervousScore = (
        (deltas.hrv < 0 ? Math.abs(deltas.hrv) / 0.15 : 0) * 0.45 +
        (deltas.rhr > 0 ? (deltas.rhr / 0.10) : 0) * 0.30 +
        (deltas.respRate > 0 ? (deltas.respRate / 1.0) : 0) * 0.25
    ) * recoveryAmp

    // Physical Repair: Deep sleep drop + HRV secondary (absorbed Circadian — sleep issues = repair issues)
    const repairScore = (
        (deltas.deepSleep < 0 ? Math.abs(deltas.deepSleep) / 0.20 : 0) * 0.55 +
        (deltas.hrv < 0 ? Math.abs(deltas.hrv) / 0.30 : 0) * 0.25 +
        (deltas.rhr > 0 ? (deltas.rhr / 0.15) : 0) * 0.20
    ) * recoveryAmp

    // Resilience: body is strong — inverse of stress signals
    const maxStress = Math.max(nervousScore, repairScore)
    const resilienceScore = maxStress < 0.5 ? (1 - maxStress) : 0

    const scores: Record<string, number> = {
        "Nervous System": Math.round(nervousScore * 100) / 100,
        "Physical Repair": Math.round(repairScore * 100) / 100,
        "Resilience": Math.round(resilienceScore * 100) / 100,
    }

    // Pick the winner
    const entries: [string, number][] = [
        ["Nervous System", nervousScore],
        ["Physical Repair", repairScore],
        ["Resilience", resilienceScore],
    ]
    entries.sort((a, b) => b[1] - a[1])
    const [winnerName, winnerScore] = entries[0]

    const pillarMap: Record<string, 1 | 2 | 3> = {
        "Nervous System": 1, "Physical Repair": 2, "Resilience": 3
    }

    const severity: 'mild' | 'moderate' | 'severe' =
        winnerScore >= 1.5 ? 'severe' :
            winnerScore >= 0.8 ? 'moderate' : 'mild'

    // Trigger descriptions
    const triggers: string[] = []
    if (deltas.hrv < THRESHOLDS.HRV_DROP_NERVOUS)
        triggers.push(`HRV ${Math.round(Math.abs(deltas.hrv) * 100)}% below baseline`)
    if (deltas.rhr > THRESHOLDS.RHR_SPIKE_STRESS)
        triggers.push(`RHR ${Math.round(deltas.rhr * 100)}% above baseline`)
    if (deltas.deepSleep < THRESHOLDS.DEEP_SLEEP_DROP_REPAIR)
        triggers.push(`Deep sleep ${Math.round(Math.abs(deltas.deepSleep) * 100)}% below baseline`)
    if (deltas.respRate > THRESHOLDS.RESP_RATE_SPIKE)
        triggers.push(`Resp rate elevated +${deltas.respRate.toFixed(1)} rpm`)

    const trigger = triggers.length > 0
        ? triggers.join('. ')
        : "Your body is balanced — focus on building resilience and capacity."

    return {
        pillarId: pillarMap[winnerName] || 3,
        trigger,
        severity,
        scores,
    }
}

/**
 * Quick pillar name from metrics.
 */
export function simulateAnalysis(
    metrics: any,
    realBaseline?: Partial<BiometricData>
): string {
    const baseline = buildBaseline(realBaseline)
    const current = buildCurrent(metrics)
    const deltas = calculateDeltas(current, baseline)
    const { pillarId } = scorePillars(deltas, metrics.recoveryScore)
    return PILLAR_NAMES[pillarId]
}

/**
 * Full analysis with severity, trigger, and scores.
 */
export function fullAnalysis(
    metrics: any,
    realBaseline?: Partial<BiometricData>
): { pillar: string; severity: 'mild' | 'moderate' | 'severe'; trigger: string; scores: Record<string, number> } {
    const baseline = buildBaseline(realBaseline)
    const current = buildCurrent(metrics)
    const deltas = calculateDeltas(current, baseline)
    const result = scorePillars(deltas, metrics.recoveryScore)
    return {
        pillar: PILLAR_NAMES[result.pillarId],
        severity: result.severity,
        trigger: result.trigger,
        scores: result.scores,
    }
}

// ─── Internal Helpers ───

function buildBaseline(realBaseline?: Partial<BiometricData>): BiometricData {
    return realBaseline
        ? {
            hrv: realBaseline.hrv || DEFAULT_BASELINE.hrv,
            rhr: realBaseline.rhr || DEFAULT_BASELINE.rhr,
            deepSleep: realBaseline.deepSleep || DEFAULT_BASELINE.deepSleep,
            respRate: realBaseline.respRate || DEFAULT_BASELINE.respRate,
            sleepMidpoint: realBaseline.sleepMidpoint || DEFAULT_BASELINE.sleepMidpoint,
        }
        : DEFAULT_BASELINE
}

function buildCurrent(metrics: any): BiometricData {
    return {
        hrv: metrics.hrv,
        rhr: metrics.rhr,
        deepSleep: metrics.deepSleep,
        respRate: metrics.respRate,
        sleepMidpoint: metrics.sleepMidpoint || 180,
    }
}
