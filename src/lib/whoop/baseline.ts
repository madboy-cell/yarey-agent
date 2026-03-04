/**
 * Yarey Sanctuary – WHOOP Baseline Calculator
 * v9.0 — Full Biometric Intelligence
 *
 * Extracts EVERY data point WHOOP provides:
 *   Recovery: HRV, RHR, Recovery %, SpO2, Skin Temp
 *   Sleep:    SWS, REM, Light, Efficiency %, Performance %, Consistency %,
 *             Debt, Cycles, Disturbances, Resp Rate, Nap
 *   Cycle:    Day Strain, kJ, Avg/Max HR
 *   Workout:  Activity Strain, Sport Name, HR Zones
 *
 * 14-day window with graceful degradation.
 */

const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer'
const BASELINE_DAYS = 14
const MINIMUM_QUALITY_DAYS = 5
const DEFAULT_SLEEP_MIDPOINT = 180
const DEFAULT_AGE = 35

// ─── Exported Types ──────────────────────────

export interface UserProfile {
    age: number
    fitnessLevel: 'sedentary' | 'moderate' | 'athletic' | 'elite'
    sex?: 'male' | 'female'
}

/** Full daily snapshot – every metric for one physiological cycle */
export interface WhoopDaySnapshot {
    date: string

    // Recovery
    hrv: number
    rhr: number
    recoveryScore: number
    spo2: number          // blood oxygen %  (0 if unavailable)
    skinTemp: number      // skin temperature °C  (0 if unavailable)

    // Sleep architecture
    deepSleep: number     // SWS minutes
    remSleep: number      // REM minutes
    lightSleep: number    // light sleep minutes
    totalSleep: number    // total in-bed minutes
    awakeDuration: number // awake-in-bed minutes
    sleepCycles: number
    disturbances: number
    sleepEfficiency: number   // %
    sleepPerformance: number  // %
    sleepConsistency: number  // %
    sleepDebtMs: number       // accumulated debt (millis)
    respRate: number
    sleepMidpoint: number     // minutes from midnight
    isNap: boolean

    // Cycle (day strain)
    dayStrain: number        // 0-21 scale
    dayCalories: number      // kilojoules
    dayAvgHR: number
    dayMaxHR: number

    // Latest workout (if any)
    workoutStrain: number
    workoutSport: string
    workoutDurationMin: number
}

/** Backward-compatible alias */
export type WhoopMetricsCombined = WhoopDaySnapshot

export interface BaselineAverage {
    hrv: number
    rhr: number
    deepSleep: number
    remSleep: number
    respRate: number
    sleepMidpoint: number
    spo2: number
    skinTemp: number
    dayStrain: number
    sleepEfficiency: number
    sleepPerformance: number
    sleepConsistency: number
}

export interface BaselineResult {
    currentValue: WhoopDaySnapshot
    fourteenDayAverage: BaselineAverage
    percentChange: {
        hrv: number
        deepSleep: number
        strain: number
        spo2: number
        skinTemp: number
    }
    history: WhoopDaySnapshot[]
    meta: {
        daysUsed: number
        status: 'stable' | 'partial' | 'insufficient_data' | 'needs_manual_calibration'
        message?: string
    }
    needsManualCalibration?: boolean
}

// ─── Manual Baseline (Fallback) ──────────────

const FITNESS_MULTIPLIERS = {
    sedentary: { hrv: 0.75, rhr: 10, deepSleep: -10 },
    moderate: { hrv: 1, rhr: 0, deepSleep: 0 },
    athletic: { hrv: 1.25, rhr: -8, deepSleep: 10 },
    elite: { hrv: 1.5, rhr: -15, deepSleep: 15 },
} as const

export function getManualBaseline(profile: UserProfile): BaselineAverage {
    const base = { hrv: 55, rhr: 60, deepSleep: 60, respRate: 14.5, sleepMidpoint: DEFAULT_SLEEP_MIDPOINT }
    const ageFactor = Math.max(0, profile.age - 30)
    base.hrv = Math.max(25, base.hrv - ageFactor * 0.8)
    base.rhr = Math.min(80, base.rhr + ageFactor * 0.3)
    const m = FITNESS_MULTIPLIERS[profile.fitnessLevel]
    base.hrv *= m.hrv; base.rhr += m.rhr; base.deepSleep += m.deepSleep
    if (profile.fitnessLevel === 'elite') base.respRate = 13.5
    if (profile.sex === 'female') { base.rhr += 3; base.hrv *= 0.92 }
    return {
        hrv: Math.round(base.hrv), rhr: Math.round(base.rhr),
        deepSleep: Math.round(base.deepSleep), remSleep: 90,
        respRate: parseFloat(base.respRate.toFixed(1)),
        sleepMidpoint: base.sleepMidpoint,
        spo2: 97, skinTemp: 33.5, dayStrain: 8,
        sleepEfficiency: 85, sleepPerformance: 80, sleepConsistency: 75,
    }
}

// ─── Helpers ─────────────────────────────────

function sleepMidpoint(start: string, end: string): number {
    const s = new Date(start), e = new Date(end)
    const mid = new Date((s.getTime() + e.getTime()) / 2)
    return mid.getHours() * 60 + mid.getMinutes()
}

function pctChange(current: number, avg: number): number {
    return avg === 0 ? 0 : parseFloat((((current - avg) / avg) * 100).toFixed(1))
}

function milliToMin(ms: number): number { return Math.round(ms / 60000) }

function baselineStatus(days: number) {
    if (days < MINIMUM_QUALITY_DAYS) return { status: 'insufficient_data' as const, message: `Only ${days} days available — accuracy improves with more data.` }
    if (days < BASELINE_DAYS) return { status: 'partial' as const, message: `${days}-day baseline; full 14-day baseline building…` }
    return { status: 'stable' as const }
}

// ─── Data Fetching ───────────────────────────

async function fetchAllWhoopData(token: string, startISO: string, endISO: string) {
    const headers = { Authorization: `Bearer ${token}` }
    const [recRes, sleepRes, cycleRes, workoutRes] = await Promise.all([
        fetch(`${WHOOP_API_BASE}/v2/recovery?start=${startISO}&end=${endISO}`, { headers }),
        fetch(`${WHOOP_API_BASE}/v2/activity/sleep?start=${startISO}&end=${endISO}`, { headers }),
        fetch(`${WHOOP_API_BASE}/v2/cycle?start=${startISO}&end=${endISO}`, { headers }),
        fetch(`${WHOOP_API_BASE}/v2/activity/workout?start=${startISO}&end=${endISO}`, { headers }),
    ])

    if (!recRes.ok || !sleepRes.ok) {
        throw new Error(`WHOOP API Error: Recovery(${recRes.status}) Sleep(${sleepRes.status})`)
    }

    const [recData, sleepData] = await Promise.all([recRes.json(), sleepRes.json()])
    // Cycle & workout are bonus — don't fail if unavailable
    const cycleData = cycleRes.ok ? await cycleRes.json() : { records: [] }
    const workoutData = workoutRes.ok ? await workoutRes.json() : { records: [] }

    return {
        recoveries: recData.records || [],
        sleeps: sleepData.records || [],
        cycles: cycleData.records || [],
        workouts: workoutData.records || [],
    }
}

// ─── Data Processing ─────────────────────────

function processRecords(
    recoveries: any[], sleeps: any[], cycles: any[], workouts: any[]
): WhoopDaySnapshot[] {
    // Build lookup maps
    const sleepMap = new Map<number, any>()
    for (const s of sleeps) { if (s.cycle_id) sleepMap.set(s.cycle_id, s) }

    const cycleMap = new Map<number, any>()
    for (const c of cycles) { if (c.id) cycleMap.set(c.id, c) }

    // Group workouts by cycle
    const workoutByCycle = new Map<string, any>()
    for (const w of workouts) {
        // Try to match by date (same day)
        const dateKey = w.start ? w.start.split('T')[0] : ''
        if (dateKey && (!workoutByCycle.has(dateKey) || (w.score?.strain || 0) > (workoutByCycle.get(dateKey)?.score?.strain || 0))) {
            workoutByCycle.set(dateKey, w) // keep highest-strain workout per day
        }
    }

    const days: WhoopDaySnapshot[] = []

    for (const rec of recoveries) {
        if ((rec.score_state !== 'SCORED' && rec.state !== 'SCORED') || rec.score?.user_calibrating) continue

        const sleep = sleepMap.get(rec.cycle_id)
        if (!sleep) continue

        const cycle = cycleMap.get(rec.cycle_id)
        const recDate = (rec.date || rec.updated_at || '').split('T')[0]
        const workout = workoutByCycle.get(recDate)

        const stages = sleep.score?.stage_summary || {}
        const sleepNeeded = sleep.score?.sleep_needed || {}

        days.push({
            date: rec.date || rec.updated_at || '',

            // Recovery
            hrv: rec.score?.hrv_rmssd_milli || 0,
            rhr: rec.score?.resting_heart_rate || 0,
            recoveryScore: rec.score?.recovery_score || 0,
            spo2: rec.score?.spo2_percentage || 0,
            skinTemp: rec.score?.skin_temp_celsius || 0,

            // Sleep architecture
            deepSleep: milliToMin(stages.total_slow_wave_sleep_time_milli || stages.slow_wave_sleep_milli || 0),
            remSleep: milliToMin(stages.total_rem_sleep_time_milli || 0),
            lightSleep: milliToMin(stages.total_light_sleep_time_milli || 0),
            totalSleep: milliToMin(stages.total_in_bed_time_milli || 0),
            awakeDuration: milliToMin(stages.total_awake_time_milli || 0),
            sleepCycles: stages.sleep_cycle_count || 0,
            disturbances: stages.disturbance_count || 0,
            sleepEfficiency: sleep.score?.sleep_efficiency_percentage || 0,
            sleepPerformance: sleep.score?.sleep_performance_percentage || 0,
            sleepConsistency: sleep.score?.sleep_consistency_percentage || 0,
            sleepDebtMs: sleepNeeded.need_from_sleep_debt_milli || 0,
            respRate: sleep.score?.respiratory_rate || 0,
            sleepMidpoint: sleep.start && sleep.end ? sleepMidpoint(sleep.start, sleep.end) : DEFAULT_SLEEP_MIDPOINT,
            isNap: sleep.nap || false,

            // Cycle
            dayStrain: cycle?.score?.strain || 0,
            dayCalories: cycle?.score?.kilojoule || 0,
            dayAvgHR: cycle?.score?.average_heart_rate || 0,
            dayMaxHR: cycle?.score?.max_heart_rate || 0,

            // Workout
            workoutStrain: workout?.score?.strain || 0,
            workoutSport: workout?.sport_name || '',
            workoutDurationMin: workout?.start && workout?.end
                ? Math.round((new Date(workout.end).getTime() - new Date(workout.start).getTime()) / 60000)
                : 0,
        })
    }

    return days
}

// ─── Calibration Fallback ────────────────────

function emptySnapshot(): WhoopDaySnapshot {
    return {
        date: '', hrv: 0, rhr: 0, recoveryScore: 0, spo2: 0, skinTemp: 0,
        deepSleep: 0, remSleep: 0, lightSleep: 0, totalSleep: 0, awakeDuration: 0,
        sleepCycles: 0, disturbances: 0, sleepEfficiency: 0, sleepPerformance: 0,
        sleepConsistency: 0, sleepDebtMs: 0, respRate: 0, sleepMidpoint: DEFAULT_SLEEP_MIDPOINT,
        isNap: false, dayStrain: 0, dayCalories: 0, dayAvgHR: 0, dayMaxHR: 0,
        workoutStrain: 0, workoutSport: '', workoutDurationMin: 0,
    }
}

function manualCalibrationResponse(current?: WhoopDaySnapshot, message?: string): BaselineResult {
    const baseline = getManualBaseline({ age: DEFAULT_AGE, fitnessLevel: 'moderate' })
    return {
        currentValue: current || emptySnapshot(),
        fourteenDayAverage: baseline,
        percentChange: { hrv: 0, deepSleep: 0, strain: 0, spo2: 0, skinTemp: 0 },
        history: current ? [current] : [],
        meta: { daysUsed: 0, status: 'needs_manual_calibration', message: message || 'Please complete a brief intake to personalize your experience.' },
        needsManualCalibration: true,
    }
}

// ─── Main Export ─────────────────────────────

export async function calculateSevenDayBaseline(accessToken: string): Promise<BaselineResult> {
    const end = new Date()
    const start = new Date(); start.setDate(start.getDate() - BASELINE_DAYS)

    const { recoveries, sleeps, cycles, workouts } = await fetchAllWhoopData(accessToken, start.toISOString(), end.toISOString())
    const days = processRecords(recoveries, sleeps, cycles, workouts)

    if (days.length === 0) return manualCalibrationResponse()

    const [current, ...rest] = days
    if (rest.length === 0) return manualCalibrationResponse(current, "Only today's data available — intake needed for baseline.")

    const hist = rest.slice(0, BASELINE_DAYS)
    const n = hist.length

    // Compute averages
    const sum = (fn: (d: WhoopDaySnapshot) => number) => hist.reduce((a, d) => a + fn(d), 0) / n

    const avg: BaselineAverage = {
        hrv: Math.round(sum(d => d.hrv)),
        rhr: Math.round(sum(d => d.rhr)),
        deepSleep: Math.round(sum(d => d.deepSleep)),
        remSleep: Math.round(sum(d => d.remSleep)),
        respRate: parseFloat(sum(d => d.respRate).toFixed(1)),
        sleepMidpoint: Math.round(sum(d => d.sleepMidpoint)),
        spo2: parseFloat(sum(d => d.spo2).toFixed(1)),
        skinTemp: parseFloat(sum(d => d.skinTemp).toFixed(2)),
        dayStrain: parseFloat(sum(d => d.dayStrain).toFixed(1)),
        sleepEfficiency: Math.round(sum(d => d.sleepEfficiency)),
        sleepPerformance: Math.round(sum(d => d.sleepPerformance)),
        sleepConsistency: Math.round(sum(d => d.sleepConsistency)),
    }

    const { status, message } = baselineStatus(n)

    return {
        currentValue: current,
        fourteenDayAverage: avg,
        percentChange: {
            hrv: pctChange(current.hrv, avg.hrv),
            deepSleep: pctChange(current.deepSleep, avg.deepSleep),
            strain: pctChange(current.dayStrain, avg.dayStrain),
            spo2: avg.spo2 > 0 ? pctChange(current.spo2, avg.spo2) : 0,
            skinTemp: avg.skinTemp > 0 ? pctChange(current.skinTemp, avg.skinTemp) : 0,
        },
        history: days,
        meta: { daysUsed: n, status, message },
        needsManualCalibration: false,
    }
}
