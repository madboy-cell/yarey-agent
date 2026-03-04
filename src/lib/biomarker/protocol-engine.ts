/**
 * Yarey Sanctuary – Thermal Intelligence Engine v9.0
 * Full WHOOP Intelligence · 6-Dimension Capacity Scoring
 *
 * 6 Dimensions (20+20+20+20+10+10 = 100)
 * 1. CARDIAC READINESS  — RHR + Recovery %
 * 2. NERVOUS SYSTEM     — HRV abs + HRV Δ baseline
 * 3. SLEEP ARCHITECTURE — SWS + REM + efficiency + debt + disturbances
 * 4. RESPIRATORY & IMMUNITY — Resp rate + SpO2 + skin temp
 * 5. PHYSICAL LOAD      — Day strain + workout strain
 * 6. CIRCADIAN RHYTHM   — Sleep consistency + performance + midpoint
 *
 * Illness Early Warning: SpO2 + skin temp + resp rate triangulation
 * Clinical Narrative: 3-sentence doctor-grade insight
 *
 * Research: Søberg, Huberman, Finnish sauna, NIH CWT meta-analysis
 * Equipment: Dry Sauna (60-100°C) | Cold Plunge (10-15°C) | Ice Bath (2-8°C)
 */

// ─── Types ─────────────────────────────────────────────────

export type ColdEquipment = 'none' | 'cold_plunge' | 'ice_bath'
export type Modality = 'sauna_only' | 'contrast' | 'cold_only'
export type Intensity = 'gentle' | 'moderate' | 'intense' | 'extreme'
export type Goal = 'recovery' | 'dopamine' | 'mental_clarity' | 'brown_fat' | 'growth_hormone' | 'resilience' | 'sleep'

export interface Recipe {
    id: string
    name: string
    subtitle: string
    icon: string
    modality: Modality
    intensity: Intensity
    minCapacity: number
    goals: Goal[]
    goalLabels: string[]
    saunaTemp: number
    saunaDuration: number
    coldEquipment: ColdEquipment
    coldTemp: number
    coldDuration: number
    sets: number
    restBetween: number
    endOnCold: boolean
    totalTime: number
    weeklyContribution: { coldMin: number; heatMin: number }
    whyThisWorks: string
    scienceNotes: string[]
    proTip: string
}

export interface MassageProtocol {
    id: string
    name: string
    nameTh: string              // Thai name
    subtitle: string
    detail: string
    modality: 'nuad_thai' | 'tok_sen' | 'herbal_compress' | 'aromatherapy' | 'deep_tissue' | 'craniosacral' | 'lymphatic' | 'sports' | 'royal_thai' | 'foot_reflexology' | 'guasha' | 'cupping' | 'yam_khang'
    pressure: 'feather' | 'light' | 'medium' | 'deep' | 'therapeutic'
    focusAreas: string[]
    duration: number
    rationale: string
    herbs?: string[]            // For herbal treatments
    oilBlend?: string           // For aromatherapy
    thermalPairing?: string     // Best combined with which thermal recipe
    contraindications?: string[]
}

export interface DimensionScore {
    name: string; icon: string; score: number; maxScore: number; insight: string
}

export interface IllnessWarning {
    active: boolean
    severity: 'none' | 'watch' | 'caution' | 'danger'
    signals: string[]
    recommendation: string
}

export interface CapacityAssessment {
    level: number                 // 1-6
    label: string
    totalScore: number            // 0-100
    dimensions: DimensionScore[]  // 6 dimensions
    safetyFlags: string[]
    coldAllowed: boolean
    iceBathAllowed: boolean
    maxSaunaTemp: number
    maxColdDuration: number
    illnessWarning: IllnessWarning
    clinicalNarrative: string
}

export interface FullProtocol {
    capacity: CapacityAssessment
    availableRecipes: Recipe[]
    massage: MassageProtocol
    engineVersion: string
}

/** v9.0 expanded input — new fields optional for backward compat */
export interface CapacityMetrics {
    hrv: number; rhr: number; deepSleep: number; respRate: number
    recoveryScore?: number
    spo2?: number; skinTemp?: number
    remSleep?: number; sleepEfficiency?: number; sleepPerformance?: number
    sleepConsistency?: number; sleepDebtMs?: number; sleepCycles?: number; disturbances?: number
    dayStrain?: number; workoutStrain?: number; workoutSport?: string
}

// ─── v9.0 Six-Dimension Capacity Assessment ────────────────
// 1. Cardiac (20): RHR 12 + Recovery 8
// 2. Nervous (20): HRV abs 12 + HRV Δ 8
// 3. Sleep  (20): SWS 5 + REM 4 + Efficiency 4 + Debt 4 + Disturbances 3
// 4. Resp/Immunity (20): Resp 8 + SpO2 6 + SkinTemp 6
// 5. Physical Load (10): DayStrain 6 + WorkoutStrain 4
// 6. Circadian (10): Consistency 4 + Performance 3 + Midpoint 3
// ────────────────────────────────────────────────────────────

export function assessCapacity(
    metrics: CapacityMetrics,
    hrvDelta: number = 0,
    sleepDelta: number = 0
): CapacityAssessment {
    const flags: string[] = []
    let coldAllowed = true
    let iceBathAllowed = true
    let maxSaunaTemp = 100
    let maxColdDuration = 5
    const recovery = metrics.recoveryScore ?? 50
    const spo2 = metrics.spo2 ?? 0
    const skinTemp = metrics.skinTemp ?? 0
    const dayStrain = metrics.dayStrain ?? 0
    const workoutStrain = metrics.workoutStrain ?? 0
    const remSleep = metrics.remSleep ?? 0
    const sleepEff = metrics.sleepEfficiency ?? 0
    const sleepPerf = metrics.sleepPerformance ?? 0
    const sleepCons = metrics.sleepConsistency ?? 0
    const sleepDebtHrs = (metrics.sleepDebtMs ?? 0) / 3600000
    const disturbances = metrics.disturbances ?? 0

    // ═══ ILLNESS EARLY WARNING ═══
    const illnessSignals: string[] = []
    if (spo2 > 0 && spo2 < 94) illnessSignals.push(`SpO2 ${spo2.toFixed(1)}% — below safe threshold`)
    else if (spo2 > 0 && spo2 < 96) illnessSignals.push(`SpO2 ${spo2.toFixed(1)}% — slightly low, monitor`)
    if (skinTemp > 0 && skinTemp > 34.5) illnessSignals.push(`Skin temp ${skinTemp.toFixed(1)}°C — elevated, possible inflammation`)
    else if (skinTemp > 0 && skinTemp > 34.0) illnessSignals.push(`Skin temp ${skinTemp.toFixed(1)}°C — slightly above normal`)
    if (metrics.respRate > 18) illnessSignals.push(`Resp rate ${metrics.respRate.toFixed(1)}rpm — elevated`)
    if (recovery < 20 && metrics.rhr > 75) illnessSignals.push(`Low recovery + high RHR — systemic stress`)

    let illnessSeverity: 'none' | 'watch' | 'caution' | 'danger' = 'none'
    let illnessRec = ''
    if (illnessSignals.length >= 3) { illnessSeverity = 'danger'; illnessRec = 'Multiple illness signals detected. Cold exposure blocked. Gentle sauna only — focus on rest and hydration.' }
    else if (illnessSignals.length === 2) { illnessSeverity = 'caution'; illnessRec = 'Your body shows early signs of inflammation. Today\'s protocol is adjusted for gentle recovery.' }
    else if (illnessSignals.length === 1) { illnessSeverity = 'watch'; illnessRec = 'One biomarker flag — monitor how you feel. No protocol changes yet.' }

    // ═══ SAFETY GATES ═══
    if (metrics.hrv < 20) { coldAllowed = false; iceBathAllowed = false; maxSaunaTemp = 65; flags.push("HRV critically low (<20ms) — cold blocked, sauna capped 65°C") }
    else if (metrics.hrv < 30 && metrics.rhr > 75) { coldAllowed = false; iceBathAllowed = false; maxSaunaTemp = 75; flags.push("Fragile state (HRV<30 + RHR>75) — cold blocked") }
    else if (metrics.hrv < 35) { iceBathAllowed = false; maxColdDuration = 2; flags.push("Low HRV (<35ms) — ice bath blocked, cold ≤2m") }
    if (metrics.respRate > 18) { coldAllowed = false; iceBathAllowed = false; maxSaunaTemp = 65; flags.push("Elevated resp rate (>18rpm) — possible illness, cold blocked") }
    if (recovery < 20) { coldAllowed = false; iceBathAllowed = false; maxSaunaTemp = 65; flags.push("Recovery critically low (<20%) — rest mode") }
    if (metrics.rhr > 90) { iceBathAllowed = false; maxColdDuration = Math.min(maxColdDuration, 1); flags.push("Elevated RHR (>90bpm) — ice bath blocked") }
    if (illnessSeverity === 'danger') { coldAllowed = false; iceBathAllowed = false; maxSaunaTemp = 65; flags.push("⚠️ Illness warning — all intense protocols blocked") }
    if (dayStrain > 18) { maxColdDuration = Math.min(maxColdDuration, 2); flags.push(`High day strain (${dayStrain.toFixed(1)}) — cold duration limited`) }

    // ═══ DIM 1: CARDIAC READINESS (20pts) ═══
    const rhrS = metrics.rhr <= 50 ? 12 : metrics.rhr <= 55 ? 10 : metrics.rhr <= 60 ? 9 : metrics.rhr <= 65 ? 7 : metrics.rhr <= 70 ? 5 : metrics.rhr <= 80 ? 3 : metrics.rhr <= 90 ? 1 : 0
    const recS = recovery >= 90 ? 8 : recovery >= 75 ? 7 : recovery >= 60 ? 5 : recovery >= 40 ? 3 : recovery >= 20 ? 1 : 0
    const cardiacTotal = rhrS + recS
    const cardiacInsight = cardiacTotal >= 16 ? `RHR ${metrics.rhr}bpm + Recovery ${recovery}% — heart primed for max thermal stress`
        : cardiacTotal >= 10 ? `RHR ${metrics.rhr}bpm + Recovery ${recovery}% — good cardiac readiness`
            : `RHR ${metrics.rhr}bpm + Recovery ${recovery}% — cardiac system under load`

    // ═══ DIM 2: NERVOUS SYSTEM (20pts) ═══
    const hrvAbsS = metrics.hrv >= 100 ? 12 : metrics.hrv >= 80 ? 10 : metrics.hrv >= 60 ? 9 : metrics.hrv >= 45 ? 7 : metrics.hrv >= 35 ? 5 : metrics.hrv >= 25 ? 2 : 0
    const hrvDeltaS = hrvDelta >= 0.20 ? 8 : hrvDelta >= 0.10 ? 7 : hrvDelta >= 0 ? 5 : hrvDelta >= -0.10 ? 3 : hrvDelta >= -0.20 ? 1 : 0
    const nervousTotal = hrvAbsS + hrvDeltaS
    const dp = Math.round(hrvDelta * 100)
    const nervousInsight = nervousTotal >= 16 ? `HRV ${Math.round(metrics.hrv)}ms (${dp >= 0 ? '+' : ''}${dp}%) — ANS has significant reserve`
        : nervousTotal >= 10 ? `HRV ${Math.round(metrics.hrv)}ms (${dp >= 0 ? '+' : ''}${dp}%) — nervous system in good shape`
            : `HRV ${Math.round(metrics.hrv)}ms (${dp >= 0 ? '+' : ''}${dp}%) — ANS under load`

    // ═══ DIM 3: SLEEP ARCHITECTURE (20pts) ═══
    const swsS = metrics.deepSleep >= 120 ? 5 : metrics.deepSleep >= 90 ? 4 : metrics.deepSleep >= 60 ? 3 : metrics.deepSleep >= 30 ? 2 : 1
    const remS = remSleep >= 120 ? 4 : remSleep >= 90 ? 3 : remSleep >= 60 ? 2 : remSleep > 0 ? 1 : 2 // default 2 if no data
    const effS = sleepEff >= 90 ? 4 : sleepEff >= 80 ? 3 : sleepEff >= 70 ? 2 : sleepEff > 0 ? 1 : 2
    const debtS = sleepDebtHrs <= 0.5 ? 4 : sleepDebtHrs <= 1 ? 3 : sleepDebtHrs <= 2 ? 2 : sleepDebtHrs <= 4 ? 1 : 0
    const distS = disturbances <= 5 ? 3 : disturbances <= 10 ? 2 : disturbances <= 15 ? 1 : 0
    const sleepTotal = swsS + remS + effS + debtS + distS
    const sleepInsight = sleepTotal >= 16 ? `${Math.round(metrics.deepSleep)}m SWS + ${remSleep}m REM, ${sleepEff > 0 ? sleepEff + '% eff' : 'good architecture'} — excellent overnight recovery`
        : sleepTotal >= 10 ? `${Math.round(metrics.deepSleep)}m SWS + ${remSleep}m REM${sleepDebtHrs > 1 ? `, ${sleepDebtHrs.toFixed(1)}h debt` : ''} — adequate sleep`
            : `Sleep fragmented: ${Math.round(metrics.deepSleep)}m SWS${disturbances > 10 ? `, ${disturbances} disturbances` : ''}${sleepDebtHrs > 2 ? `, ${sleepDebtHrs.toFixed(1)}h debt` : ''}`

    // ═══ DIM 4: RESPIRATORY & IMMUNITY (20pts) ═══
    const respS = metrics.respRate <= 12 ? 8 : metrics.respRate <= 13 ? 7 : metrics.respRate <= 14 ? 6 : metrics.respRate <= 15 ? 5 : metrics.respRate <= 16 ? 4 : metrics.respRate <= 17 ? 2 : 0
    const spo2S = spo2 === 0 ? 3 : spo2 >= 98 ? 6 : spo2 >= 96 ? 5 : spo2 >= 94 ? 3 : spo2 >= 92 ? 1 : 0  // default 3 if no sensor
    const tempS = skinTemp === 0 ? 3 : skinTemp <= 33.0 ? 6 : skinTemp <= 33.5 ? 5 : skinTemp <= 34.0 ? 4 : skinTemp <= 34.5 ? 2 : 0  // default 3
    const respTotal = respS + spo2S + tempS
    const respInsight = respTotal >= 16 ? `Resp ${metrics.respRate?.toFixed(1)}rpm${spo2 > 0 ? `, SpO2 ${spo2.toFixed(1)}%` : ''}${skinTemp > 0 ? `, skin ${skinTemp.toFixed(1)}°C` : ''} — clear, no illness signals`
        : respTotal >= 10 ? `Resp ${metrics.respRate?.toFixed(1)}rpm — normal respiratory state`
            : `Respiratory/immunity flagged${spo2 > 0 && spo2 < 96 ? `, SpO2 ${spo2.toFixed(1)}%` : ''}${skinTemp > 34 ? `, temp ${skinTemp.toFixed(1)}°C` : ''}`

    // ═══ DIM 5: PHYSICAL LOAD (10pts) — inverted: LOW strain = HIGH score ═══
    const strainS = dayStrain === 0 ? 4 : dayStrain <= 6 ? 6 : dayStrain <= 10 ? 5 : dayStrain <= 14 ? 3 : dayStrain <= 18 ? 1 : 0 // default 4 if no data
    const wkS = workoutStrain === 0 ? 3 : workoutStrain <= 4 ? 4 : workoutStrain <= 8 ? 3 : workoutStrain <= 12 ? 2 : workoutStrain <= 16 ? 1 : 0
    const loadTotal = strainS + wkS
    const loadInsight = dayStrain > 0
        ? (loadTotal >= 8 ? `Day strain ${dayStrain.toFixed(1)} — body has reserve for thermal stress`
            : loadTotal >= 5 ? `Day strain ${dayStrain.toFixed(1)} — moderate load, balanced protocol advised`
                : `Day strain ${dayStrain.toFixed(1)} — high physical load, prioritize recovery`)
        : 'No strain data — using conservative estimate'

    // ═══ DIM 6: CIRCADIAN RHYTHM (10pts) ═══
    const consS = sleepCons === 0 ? 2 : sleepCons >= 85 ? 4 : sleepCons >= 70 ? 3 : sleepCons >= 50 ? 2 : 1
    const perfS = sleepPerf === 0 ? 2 : sleepPerf >= 90 ? 3 : sleepPerf >= 75 ? 2 : 1
    const midS = 3 // midpoint shift needs multi-day tracking; default baseline
    const circTotal = consS + perfS + midS
    const circInsight = sleepCons > 0
        ? (circTotal >= 8 ? `Consistency ${sleepCons}%, performance ${sleepPerf}% — stable circadian rhythm`
            : circTotal >= 5 ? `Consistency ${sleepCons}% — circadian rhythm fair`
                : `Consistency ${sleepCons}% — circadian rhythm drifting, consider morning sauna for reset`)
        : 'No circadian data — using baseline'

    // ═══ TOTAL → LEVEL ═══
    const totalScore = cardiacTotal + nervousTotal + sleepTotal + respTotal + loadTotal + circTotal
    let level: number, label: string
    if (totalScore >= 85) { level = 6; label = "Elite" }
    else if (totalScore >= 70) { level = 5; label = "Peak" }
    else if (totalScore >= 55) { level = 4; label = "Strong" }
    else if (totalScore >= 40) { level = 3; label = "Moderate" }
    else if (totalScore >= 25) { level = 2; label = "Low" }
    else { level = 1; label = "Fragile" }

    // Safety overrides
    if (!coldAllowed && level > 2) { level = 2; label = "Low" }
    if (flags.length >= 2 && level > 1) { level = 1; label = "Fragile" }
    if (illnessSeverity === 'danger' && level > 1) { level = 1; label = "Fragile" }

    const dimensions: DimensionScore[] = [
        { name: "Cardiac", icon: "❤️", score: cardiacTotal, maxScore: 20, insight: cardiacInsight },
        { name: "Nervous System", icon: "🧠", score: nervousTotal, maxScore: 20, insight: nervousInsight },
        { name: "Sleep Architecture", icon: "😴", score: sleepTotal, maxScore: 20, insight: sleepInsight },
        { name: "Respiratory & Immunity", icon: "🫁", score: respTotal, maxScore: 20, insight: respInsight },
        { name: "Physical Load", icon: "💪", score: loadTotal, maxScore: 10, insight: loadInsight },
        { name: "Circadian Rhythm", icon: "🔄", score: circTotal, maxScore: 10, insight: circInsight },
    ]

    // ═══ CLINICAL NARRATIVE ═══
    const s1 = recovery > 0
        ? `Your HRV of ${Math.round(metrics.hrv)}ms${dp !== 0 ? ` (${dp >= 0 ? '+' : ''}${dp}% vs baseline)` : ''} combined with ${recovery}% recovery indicates ${recovery >= 67 ? 'strong autonomic reserve' : recovery >= 33 ? 'moderate readiness' : 'your body is still recovering'}.`
        : `Your HRV of ${Math.round(metrics.hrv)}ms${dp !== 0 ? ` (${dp >= 0 ? '+' : ''}${dp}% vs baseline)` : ''} reflects ${metrics.hrv >= 60 ? 'good' : 'moderate'} nervous system capacity.`

    const s2parts: string[] = []
    if (metrics.deepSleep >= 90) s2parts.push(`${Math.round(metrics.deepSleep)}min deep sleep supports tissue repair`)
    else if (metrics.deepSleep >= 60) s2parts.push(`${Math.round(metrics.deepSleep)}min deep sleep is adequate`)
    else s2parts.push(`${Math.round(metrics.deepSleep)}min deep sleep is below optimal`)
    if (dayStrain > 12) s2parts.push(`day strain of ${dayStrain.toFixed(1)} suggests significant muscular load`)
    else if (dayStrain > 0 && dayStrain <= 6) s2parts.push(`low strain (${dayStrain.toFixed(1)}) means your body has reserve`)
    if (sleepDebtHrs > 2) s2parts.push(`${sleepDebtHrs.toFixed(1)}h sleep debt warrants a gentler approach`)
    const s2 = s2parts.length > 0 ? s2parts.join('; ') + '.' : 'Sleep and load data supports today\'s protocol selection.'

    let s3 = ''
    if (illnessSeverity !== 'none') s3 = illnessRec
    else if (spo2 > 0 && skinTemp > 0) s3 = `SpO2 ${spo2.toFixed(1)}% and skin temp ${skinTemp.toFixed(1)}°C confirm no inflammatory signals — your body is clear for thermal therapy.`
    else s3 = `No immunity concerns detected — your body is ready for today's protocol.`

    const clinicalNarrative = [s1, s2.charAt(0).toUpperCase() + s2.slice(1), s3].join(' ')

    return {
        level, label, totalScore, dimensions, safetyFlags: flags,
        coldAllowed, iceBathAllowed, maxSaunaTemp, maxColdDuration,
        illnessWarning: { active: illnessSeverity !== 'none', severity: illnessSeverity, signals: illnessSignals, recommendation: illnessRec },
        clinicalNarrative,
    }
}
// ─── Recipe Database ───────────────────────────────────────

const ALL_RECIPES: Recipe[] = [
    // ═══ SAUNA ONLY ═══
    {
        id: "S1", name: "Warm Restore", subtitle: "\u0E0B\u0E32\u0E27\u0E19\u0E48\u0E32\u0E2D\u0E38\u0E48\u0E19\u0E40\u0E1A\u0E32\u0E46", icon: "\uD83E\uDDD6",
        modality: "sauna_only", intensity: "gentle", minCapacity: 1,
        goals: ["sleep", "recovery"], goalLabels: ["\uD83D\uDE34 Sleep", "\uD83C\uDFC3 Recovery"],
        saunaTemp: 60, saunaDuration: 15, coldEquipment: "none", coldTemp: 0, coldDuration: 0,
        sets: 1, restBetween: 0, endOnCold: false, totalTime: 15,
        weeklyContribution: { coldMin: 0, heatMin: 15 },
        whyThisWorks: "Even low-temperature sauna gently raises core temp ~0.5\u00B0C, activating modest HSP response and parasympathetic nervous system. Safe for anyone, including those with low recovery.",
        scienceNotes: ["HSP activation begins when core temp rises ~1\u00B0C above baseline", "Safe for all capacity levels"],
        proTip: "Hydrate well. Listen to your body \u2014 exit if dizzy."
    },
    {
        id: "S2", name: "Parasympathetic Reset", subtitle: "\u0E23\u0E35\u0E40\u0E0B\u0E47\u0E15\u0E23\u0E30\u0E1A\u0E1A\u0E1B\u0E23\u0E30\u0E2A\u0E32\u0E17\u0E1E\u0E32\u0E23\u0E32\u0E0B\u0E34\u0E21\u0E1E\u0E32\u0E40\u0E17\u0E15\u0E34\u0E01", icon: "\uD83E\uDDD6",
        modality: "sauna_only", intensity: "gentle", minCapacity: 2,
        goals: ["sleep", "recovery"], goalLabels: ["\uD83D\uDE34 Sleep", "\uD83E\uDDE0 Calm"],
        saunaTemp: 75, saunaDuration: 20, coldEquipment: "none", coldTemp: 0, coldDuration: 0,
        sets: 1, restBetween: 0, endOnCold: false, totalTime: 20,
        weeklyContribution: { coldMin: 0, heatMin: 20 },
        whyThisWorks: "20 min at 75\u00B0C triggers moderate HSP activation and a parasympathetic rebound after exiting. Cortisol drops ~30%. Your nervous system shifts from 'fight' to 'rest' mode.",
        scienceNotes: ["Regular sauna 3-4\u00D7/week \u2192 10-20% HRV improvement over weeks", "Cortisol reduction ~30% post-session"],
        proTip: "Let your body cool naturally after \u2014 this parasympathetic rebound IS the therapy."
    },
    {
        id: "S3", name: "Growth Hormone Boost", subtitle: "\u0E01\u0E23\u0E30\u0E15\u0E38\u0E49\u0E19\u0E42\u0E01\u0E23\u0E17\u0E2E\u0E2D\u0E23\u0E4C\u0E42\u0E21\u0E19 2 \u0E40\u0E17\u0E48\u0E32", icon: "\uD83E\uDDD6",
        modality: "sauna_only", intensity: "moderate", minCapacity: 3,
        goals: ["growth_hormone", "recovery"], goalLabels: ["\uD83D\uDCAA GH 2\u00D7", "\uD83C\uDFC3 Recovery"],
        saunaTemp: 80, saunaDuration: 20, coldEquipment: "none", coldTemp: 0, coldDuration: 0,
        sets: 2, restBetween: 30, endOnCold: false, totalTime: 70,
        weeklyContribution: { coldMin: 0, heatMin: 40 },
        whyThisWorks: "Two 20-minute sessions at 80\u00B0C with 30-min cooling between \u2014 this exact protocol produces a 2\u00D7 GH increase above baseline. Semi-fasted state recommended for maximum effect.",
        scienceNotes: ["Lepp\u00E4luoto et al: 2\u00D7 GH increase with dual 20m sessions at 80\u00B0C", "Semi-fasted state enhances GH response", "HSP accumulation across dual sessions"],
        proTip: "Don't eat 2-3 hours before. The cooling period between rounds is critical \u2014 don't skip it."
    },
    {
        id: "S4", name: "GH Amplifier", subtitle: "\u0E42\u0E01\u0E23\u0E17\u0E2E\u0E2D\u0E23\u0E4C\u0E42\u0E21\u0E19 5 \u0E40\u0E17\u0E48\u0E32", icon: "\uD83E\uDDD6",
        modality: "sauna_only", intensity: "intense", minCapacity: 4,
        goals: ["growth_hormone"], goalLabels: ["\uD83D\uDCAA GH 5\u00D7"],
        saunaTemp: 100, saunaDuration: 15, coldEquipment: "none", coldTemp: 0, coldDuration: 0,
        sets: 2, restBetween: 30, endOnCold: false, totalTime: 60,
        weeklyContribution: { coldMin: 0, heatMin: 30 },
        whyThisWorks: "Two 15-minute sessions at 100\u00B0C with 30-min rest \u2192 5\u00D7 GH increase. Higher temperature compensates for shorter duration. Your body must be well-recovered to handle this intensity.",
        scienceNotes: ["Finnish study: 5-fold GH increase with 2\u00D715m at 100\u00B0C", "Higher temp = stronger HSP and GH signal per minute", "Huberman Lab: confirmed protocol validity"],
        proTip: "Reserve for strong recovery days. Hydrate aggressively. Exit immediately if lightheaded."
    },
    {
        id: "S5", name: "Ultimate GH Marathon", subtitle: "\u0E42\u0E01\u0E23\u0E17\u0E2E\u0E2D\u0E23\u0E4C\u0E42\u0E21\u0E19\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14 16 \u0E40\u0E17\u0E48\u0E32", icon: "\uD83E\uDDD6",
        modality: "sauna_only", intensity: "extreme", minCapacity: 5,
        goals: ["growth_hormone"], goalLabels: ["\uD83D\uDCAA GH 16\u00D7"],
        saunaTemp: 95, saunaDuration: 15, coldEquipment: "none", coldTemp: 0, coldDuration: 0,
        sets: 4, restBetween: 30, endOnCold: false, totalTime: 150,
        weeklyContribution: { coldMin: 0, heatMin: 60 },
        whyThisWorks: "Four 15-minute rounds at 95\u00B0C with cooling between each \u2192 up to 16\u00D7 GH increase. This is the most extreme documented GH protocol. Must be semi-fasted. Once per week MAX to prevent hormonal adaptation.",
        scienceNotes: ["Single study: 16-fold GH increase with 4\u00D730m sessions", "We use 4\u00D715m as a practical adaptation", "Use once per 7-10 days to maintain GH sensitivity", "Semi-fasted state critical for maximum response"],
        proTip: "\u26A0\uFE0F Once per week only. Eat nothing 3 hours before. This is a 2.5-hour commitment. Bring water."
    },

    // ═══ COLD ONLY ═══
    {
        id: "C1", name: "Cold Intro", subtitle: "\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19\u0E40\u0E22\u0E47\u0E19 \u2014 \u0E25\u0E2D\u0E07\u0E2A\u0E31\u0E21\u0E1C\u0E31\u0E2A", icon: "\uD83D\uDCA7",
        modality: "cold_only", intensity: "gentle", minCapacity: 3,
        goals: ["dopamine", "mental_clarity"], goalLabels: ["\u26A1 Dopamine", "\uD83E\uDDE0 Clarity"],
        saunaTemp: 0, saunaDuration: 0, coldEquipment: "cold_plunge", coldTemp: 15, coldDuration: 2,
        sets: 1, restBetween: 0, endOnCold: true, totalTime: 2,
        weeklyContribution: { coldMin: 2, heatMin: 0 },
        whyThisWorks: "15\u00B0C for 2 minutes is the entry point for cold therapy. Norepinephrine begins rising, providing a burst of alertness and focus. Good first cold experience.",
        scienceNotes: ["Cold shock response threshold begins around 15\u00B0C", "Even brief cold exposure activates the sympathetic nervous system"],
        proTip: "Control your breathing. Exhale slowly. The discomfort peaks at 30 seconds then eases."
    },
    {
        id: "C2", name: "Dopamine Protocol", subtitle: "\u0E42\u0E14\u0E1B\u0E32\u0E21\u0E35\u0E19 250% \u2014 \u0E22\u0E32\u0E27\u0E19\u0E32\u0E19 2+ \u0E0A\u0E21.", icon: "\uD83D\uDCA7",
        modality: "cold_only", intensity: "moderate", minCapacity: 3,
        goals: ["dopamine", "mental_clarity", "brown_fat"], goalLabels: ["\u26A1 Dopamine 250%", "\uD83E\uDDE0 Focus", "\uD83D\uDD25 Brown Fat"],
        saunaTemp: 0, saunaDuration: 0, coldEquipment: "cold_plunge", coldTemp: 14, coldDuration: 3,
        sets: 1, restBetween: 0, endOnCold: true, totalTime: 3,
        weeklyContribution: { coldMin: 3, heatMin: 0 },
        whyThisWorks: "14\u00B0C for 2-3 min \u2192 250% dopamine increase that sustains for 2+ hours. Unlike caffeine (which spikes then crashes), cold-induced dopamine has a slow steady rise and remains elevated. S\u00F8berg Principle: do NOT warm up after \u2014 shivering activates brown fat.",
        scienceNotes: ["Czech study: 14\u00B0C immersion \u2192 250% dopamine, sustained hours", "Huberman Lab: dopamine stays elevated 2+ hours post-cold", "S\u00F8berg Principle: self-rewarming \u2192 brown fat activation", "14\u00B0C optimal for brown fat stimulation"],
        proTip: "\u26A1 Do NOT use the sauna or hot shower after. The shivering IS the therapy \u2014 it's burning brown fat."
    },
    {
        id: "C3", name: "Norepinephrine Blast", subtitle: "\u0E19\u0E2D\u0E23\u0E4C\u0E40\u0E2D\u0E1E\u0E34\u0E40\u0E19\u0E1F\u0E23\u0E34\u0E19 300% \u2014 \u0E08\u0E34\u0E15\u0E43\u0E08\u0E04\u0E21\u0E0A\u0E31\u0E14", icon: "\uD83D\uDCA7",
        modality: "cold_only", intensity: "intense", minCapacity: 4,
        goals: ["mental_clarity", "dopamine", "brown_fat"], goalLabels: ["\uD83E\uDDE0 NE 300%", "\u26A1 Dopamine", "\uD83D\uDD25 Brown Fat"],
        saunaTemp: 0, saunaDuration: 0, coldEquipment: "cold_plunge", coldTemp: 10, coldDuration: 3,
        sets: 1, restBetween: 0, endOnCold: true, totalTime: 3,
        weeklyContribution: { coldMin: 3, heatMin: 0 },
        whyThisWorks: "10\u00B0C cold plunge \u2192 200-300% norepinephrine boost. Norepinephrine enhances focus, attention, and alertness. Combined with S\u00F8berg Principle self-rewarming for brown fat activation.",
        scienceNotes: ["200-300% norepinephrine increase at 10\u00B0C", "NE involves in attention, focus, and vigilance", "S\u00F8berg: self-rewarming activates brown adipose tissue"],
        proTip: "Best done in the morning for all-day focus. Breathe through the discomfort \u2014 it passes in 30-60 seconds."
    },
    {
        id: "C4", name: "Ice Bath Challenge", subtitle: "\u0E2D\u0E48\u0E32\u0E07\u0E19\u0E49\u0E33\u0E41\u0E02\u0E47\u0E07 \u2014 CSP + \u0E04\u0E27\u0E32\u0E21\u0E40\u0E02\u0E49\u0E21\u0E41\u0E02\u0E47\u0E07\u0E08\u0E34\u0E15\u0E43\u0E08", icon: "\uD83E\uDDCA",
        modality: "cold_only", intensity: "intense", minCapacity: 4,
        goals: ["resilience", "dopamine", "brown_fat"], goalLabels: ["\u2744\uFE0F Resilience", "\u26A1 Dopamine", "\uD83D\uDD25 Brown Fat"],
        saunaTemp: 0, saunaDuration: 0, coldEquipment: "ice_bath", coldTemp: 6, coldDuration: 2,
        sets: 1, restBetween: 0, endOnCold: true, totalTime: 2,
        weeklyContribution: { coldMin: 2, heatMin: 0 },
        whyThisWorks: "6\u00B0C ice bath activates Cold Shock Proteins (RBM3) for neuroprotection. ~400% norepinephrine surge. Builds mental fortitude through voluntary discomfort. The challenge itself is the training.",
        scienceNotes: ["CSP RBM3 provides neuroprotective benefits at very cold temps", "~400% norepinephrine at 6\u00B0C", "Mental fortitude from voluntary cold exposure (Stress inoculation)"],
        proTip: "Stay still in the water \u2014 movement makes it feel colder. Focus on exhale."
    },
    {
        id: "C5", name: "Extreme Ice", subtitle: "\u0E19\u0E49\u0E33\u0E41\u0E02\u0E47\u0E07\u0E2A\u0E38\u0E14\u0E02\u0E31\u0E49\u0E27 \u2014 530% NE", icon: "\uD83E\uDDCA",
        modality: "cold_only", intensity: "extreme", minCapacity: 5,
        goals: ["resilience", "brown_fat"], goalLabels: ["\u2744\uFE0F Max Resilience", "\uD83D\uDD25 Max Brown Fat"],
        saunaTemp: 0, saunaDuration: 0, coldEquipment: "ice_bath", coldTemp: 3, coldDuration: 2,
        sets: 1, restBetween: 0, endOnCold: true, totalTime: 2,
        weeklyContribution: { coldMin: 2, heatMin: 0 },
        whyThisWorks: "2-4\u00B0C \u2192 up to 530% norepinephrine increase. Maximum cold shock protein activation. This builds extreme mental resilience and maximizes brown fat thermogenesis. Only for peak capacity days.",
        scienceNotes: ["Study: coldest water \u2192 530% NE + 250% dopamine", "Maximum CSP (RBM3) activation for neuroprotection", "Extreme brown fat activation \u2014 body must generate all its own heat"],
        proTip: "\u26A0\uFE0F Peak capacity only. 2 minutes max. Have someone nearby. Absolutely no hot shower after."
    },

    // ═══ CONTRAST ═══
    {
        id: "CT1", name: "Gentle Contrast", subtitle: "\u0E04\u0E2D\u0E19\u0E17\u0E23\u0E32\u0E2A\u0E15\u0E4C\u0E2D\u0E48\u0E2D\u0E19\u0E42\u0E22\u0E19", icon: "\uD83D\uDD04",
        modality: "contrast", intensity: "gentle", minCapacity: 2,
        goals: ["recovery", "sleep"], goalLabels: ["\uD83C\uDFC3 Recovery", "\uD83D\uDE34 Sleep"],
        saunaTemp: 75, saunaDuration: 10, coldEquipment: "cold_plunge", coldTemp: 15, coldDuration: 1,
        sets: 1, restBetween: 5, endOnCold: true, totalTime: 16,
        weeklyContribution: { coldMin: 1, heatMin: 10 },
        whyThisWorks: "Basic vascular pump: vasodilation (heat) \u2192 vasoconstriction (cold). Even one cycle improves circulation and promotes parasympathetic shift. Superior to passive recovery for DOMS.",
        scienceNotes: ["CWT superior to passive recovery (NIH meta-analysis)", "Single cycle vascular pump improves circulation", "Safe for low recovery states"],
        proTip: "End on cold, then let your body warm up naturally."
    },
    {
        id: "CT2", name: "Recovery Contrast", subtitle: "\u0E27\u0E07\u0E08\u0E23\u0E1F\u0E37\u0E49\u0E19\u0E15\u0E31\u0E27 \u2014 \u0E25\u0E49\u0E32\u0E07\u0E01\u0E23\u0E14\u0E41\u0E25\u0E04\u0E15\u0E34\u0E01", icon: "\uD83D\uDD04",
        modality: "contrast", intensity: "moderate", minCapacity: 3,
        goals: ["recovery"], goalLabels: ["\uD83C\uDFC3 Fast Recovery"],
        saunaTemp: 80, saunaDuration: 12, coldEquipment: "cold_plunge", coldTemp: 12, coldDuration: 2,
        sets: 2, restBetween: 3, endOnCold: true, totalTime: 31,
        weeklyContribution: { coldMin: 4, heatMin: 24 },
        whyThisWorks: "Two rounds of vascular cycling. Heat increases blood flow ~40%, delivering nutrients to damaged tissue. Cold flushes metabolic waste and limits inflammation. Best for DOMS from exercise or physical work.",
        scienceNotes: ["Blood flow increases ~40% during heat phase", "CWT reduces DOMS and restores strength faster than passive recovery", "Two cycles double the vascular pump effect"],
        proTip: "Best within 2-6 hours after physical activity. End on cold."
    },
    {
        id: "CT3", name: "Autonomic Training", subtitle: "\u0E1D\u0E36\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E1B\u0E23\u0E30\u0E2A\u0E32\u0E17\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34", icon: "\uD83D\uDD04",
        modality: "contrast", intensity: "moderate", minCapacity: 3,
        goals: ["mental_clarity", "sleep"], goalLabels: ["\uD83E\uDDE0 Autonomic Flex", "\uD83D\uDE34 Sleep"],
        saunaTemp: 85, saunaDuration: 12, coldEquipment: "cold_plunge", coldTemp: 12, coldDuration: 2,
        sets: 2, restBetween: 3, endOnCold: true, totalTime: 31,
        weeklyContribution: { coldMin: 4, heatMin: 24 },
        whyThisWorks: "Heat activates sympathetic (fight), cold forces parasympathetic (rest) via vagus nerve. Repeating this trains your autonomic nervous system to switch faster \u2014 this is 'autonomic flexibility'. Better HRV, better stress response, better sleep.",
        scienceNotes: ["Autonomic flexibility improves with repeated SNS\u2194PNS transitions", "Vagus nerve stimulated during cold phase", "Improved HRV from regular contrast practice"],
        proTip: "Focus on breathing transitions: breathe rapidly in sauna, slow deep breaths in cold."
    },
    {
        id: "CT4", name: "Athlete Recovery", subtitle: "\u0E19\u0E31\u0E01\u0E01\u0E35\u0E2C\u0E32\u0E1F\u0E37\u0E49\u0E19\u0E15\u0E31\u0E27 \u2014 GH + \u0E25\u0E49\u0E32\u0E07\u0E01\u0E23\u0E14", icon: "\uD83D\uDD04",
        modality: "contrast", intensity: "intense", minCapacity: 4,
        goals: ["recovery", "growth_hormone"], goalLabels: ["\uD83C\uDFC3 DOMS Flush", "\uD83D\uDCAA GH 2-5\u00D7"],
        saunaTemp: 90, saunaDuration: 15, coldEquipment: "cold_plunge", coldTemp: 10, coldDuration: 2,
        sets: 3, restBetween: 3, endOnCold: true, totalTime: 60,
        weeklyContribution: { coldMin: 6, heatMin: 45 },
        whyThisWorks: "Three rounds of intense contrast. 45 min total heat triggers cumulative 2-5\u00D7 GH release (interrupted heat sessions enhance GH). 6 min total cold for vascular flush. HSP + CSP both activated \u2014 only contrast does this.",
        scienceNotes: ["Interrupted heat with cooling \u2192 cumulative 2-5\u00D7 GH (superior to continuous)", "45m heat + 6m cold meets S\u00F8berg weekly targets in one session", "Only contrast activates both HSP and CSP simultaneously"],
        proTip: "Marathon runners: this is your protocol. The interrupted heat maximizes GH for tissue repair."
    },
    {
        id: "CT5", name: "Viking Protocol", subtitle: "\u0E44\u0E27\u0E01\u0E34\u0E49\u0E07 \u2014 \u0E0B\u0E32\u0E27\u0E19\u0E48\u0E32 + \u0E19\u0E49\u0E33\u0E41\u0E02\u0E47\u0E07", icon: "\uD83D\uDD04",
        modality: "contrast", intensity: "intense", minCapacity: 4,
        goals: ["resilience", "growth_hormone"], goalLabels: ["\u2744\uFE0F Vascular", "\uD83D\uDCAA GH"],
        saunaTemp: 90, saunaDuration: 15, coldEquipment: "ice_bath", coldTemp: 6, coldDuration: 2,
        sets: 3, restBetween: 3, endOnCold: true, totalTime: 60,
        weeklyContribution: { coldMin: 6, heatMin: 45 },
        whyThisWorks: "Ice bath intensifies the vasoconstriction phase. The temperature differential (90\u00B0C \u2192 6\u00B0C = 84\u00B0 swing) creates maximum vascular pump effect. Trains blood vessel elasticity. HSP from sauna + CSP (RBM3) from ice in same session.",
        scienceNotes: ["84\u00B0C temperature differential = maximum vascular training", "RBM3 (CSP) only activates at temperatures below ~8\u00B0C", "Vascular elasticity improves with repeated extreme contrast"],
        proTip: "The ice bath will feel easier after the sauna \u2014 your body is pre-warmed. But respect the cold."
    },
    {
        id: "CT6", name: "Maximum Protocol", subtitle: "\u0E42\u0E1B\u0E23\u0E42\u0E15\u0E04\u0E2D\u0E25\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14 \u2014 \u0E1E\u0E35\u0E04", icon: "\uD83D\uDD04",
        modality: "contrast", intensity: "extreme", minCapacity: 5,
        goals: ["resilience", "growth_hormone"], goalLabels: ["\u2744\uFE0F Maximum", "\uD83D\uDCAA GH 5\u00D7"],
        saunaTemp: 100, saunaDuration: 15, coldEquipment: "ice_bath", coldTemp: 4, coldDuration: 3,
        sets: 4, restBetween: 3, endOnCold: true, totalTime: 84,
        weeklyContribution: { coldMin: 12, heatMin: 60 },
        whyThisWorks: "Four rounds at extreme temps. 60m sauna total + 12m ice bath total. Exceeds S\u00F8berg weekly targets in one session. Maximum HSP + CSP combined activation. Cumulative ~5\u00D7 GH. Reserve for peak days.",
        scienceNotes: ["96\u00B0C swing (100\u00B0C \u2192 4\u00B0C) = extreme vascular training", "60m heat exceeds S\u00F8berg's 57m weekly target", "12m cold exceeds S\u00F8berg's 11m weekly target", "Cumulative GH from 4 interrupted heat rounds"],
        proTip: "\u26A0\uFE0F Peak capacity only. This is a 90-minute commitment. Hydrate aggressively. Once per week max."
    },
]

// ─── Recipe Filtering ──────────────────────────────────────

export function getAvailableRecipes(capacity: CapacityAssessment): Recipe[] {
    return ALL_RECIPES.filter(r => {
        if (r.minCapacity > capacity.level) return false
        if (r.coldTemp > 0 && !capacity.coldAllowed) return false
        if (r.coldEquipment === 'ice_bath' && !capacity.iceBathAllowed) return false
        if (r.saunaTemp > capacity.maxSaunaTemp) return false
        if (r.coldDuration > capacity.maxColdDuration) return false
        return true
    })
}

export function filterByGoal(recipes: Recipe[], goal: Goal): Recipe[] {
    return recipes.filter(r => r.goals.includes(goal))
}

// ─── Thai Bodywork Treatment Registry ──────────────────────
// 16 modalities · biometric-driven intelligent selection
// Each treatment is a real Thai/Asian healing modality with
// appropriate intensity mapping based on WHOOP data

interface TreatmentEntry {
    treatment: Omit<MassageProtocol, 'id'>
    /** Which pillars this treatment is best for */
    pillars: string[]
    /** Minimum capacity score (0-100) to recommend this */
    minCapacity: number
    /** Maximum capacity score — used for gentle treatments to avoid overuse at high recovery */
    maxCapacity: number
    /** If true, blocked when illness warning is active */
    blockedDuringIllness: boolean
    /** Strain threshold — if dayStrain above this, deprioritize */
    maxStrain: number
}

const TREATMENT_REGISTRY: TreatmentEntry[] = [
    // ═══ GENTLE / RECOVERY (Fragile → Low capacity) ═══
    {
        pillars: ['Nervous System', 'Physical Repair', 'Resilience'],
        minCapacity: 0, maxCapacity: 35, blockedDuringIllness: false, maxStrain: 21,
        treatment: {
            name: "Craniosacral Reset", nameTh: "รีเซ็ตกะโหลก-กระดูกเชิงกราน",
            subtitle: "ฟื้นฟูระบบประสาท",
            detail: "Ultra-gentle holds on the cranium and sacrum — no strokes, no manipulation. 5-minute sustained holds send deep safety signals to the vagus nerve, unwinding protective tension patterns.",
            modality: 'craniosacral', pressure: 'feather',
            focusAreas: ['Occiput', 'Sacrum', 'Temporal Bones', 'Diaphragm'], duration: 60,
            rationale: "When capacity is critically low, the nervous system is in protective mode. Craniosacral therapy uses 5-gram touch pressure to signal safety, activating parasympathetic restoration.",
            thermalPairing: "Warm Restore (gentle sauna only, no cold)",
            contraindications: ['Recent head trauma']
        }
    },
    {
        pillars: ['Physical Repair', 'Nervous System'],
        minCapacity: 0, maxCapacity: 40, blockedDuringIllness: false, maxStrain: 21,
        treatment: {
            name: "Thai Lymphatic Drainage", nameTh: "นวดกระตุ้นน้ำเหลือง",
            subtitle: "ระบายพิษ ลดบวม ฟื้นฟู",
            detail: "Feather-light rhythmic strokes following the lymphatic pathways. Combined with warm herbal compresses on lymph node clusters (neck, armpits, groin). Promotes detoxification and immune support.",
            modality: 'lymphatic', pressure: 'feather',
            focusAreas: ['Cervical Lymph Nodes', 'Axillary Nodes', 'Inguinal Nodes', 'Abdomen'], duration: 60,
            rationale: "Low-capacity bodies accumulate metabolic waste. Lymphatic drainage increases lymph flow by up to 20x, accelerating immune clearance without taxing the nervous system.",
            herbs: ['Ginger root', 'Turmeric'],
            thermalPairing: "Warm Restore or gentle sauna"
        }
    },
    {
        pillars: ['Nervous System', 'Resilience', 'Physical Repair'],
        minCapacity: 0, maxCapacity: 50, blockedDuringIllness: true, maxStrain: 21,
        treatment: {
            name: "Luk Pra Kob", nameTh: "ประคบสมุนไพร",
            subtitle: "ประคบสมุนไพรไทยแท้ 400 ปี",
            detail: "Steamed herbal compresses filled with plai, turmeric, lemongrass, kaffir lime, camphor, and tamarind leaves are pressed and rolled along Sen energy lines. The heat and aromatic herbs penetrate deeply into fascia.",
            modality: 'herbal_compress', pressure: 'medium',
            focusAreas: ['Sen Lines', 'Shoulders', 'Lower Back', 'Abdomen', 'Feet'], duration: 75,
            rationale: "400+ year-old Thai healing tradition. Plai (Zingiber cassumunar) is clinically proven anti-inflammatory. Heat from compresses raises tissue temperature, improving blood flow by ~30% and enabling deeper muscle release.",
            herbs: ['Plai (ไพล)', 'Turmeric (ขมิ้น)', 'Lemongrass (ตะไคร้)', 'Kaffir Lime (มะกรูด)', 'Camphor (การบูร)', 'Tamarind Leaves (ใบมะขาม)'],
            thermalPairing: "Pairs beautifully with gentle-to-moderate sauna"
        }
    },

    // ═══ MODERATE (Low → Strong capacity) ═══
    {
        pillars: ['Nervous System', 'Physical Repair', 'Resilience'],
        minCapacity: 25, maxCapacity: 70, blockedDuringIllness: false, maxStrain: 15,
        treatment: {
            name: "Thai Aromatherapy", nameTh: "นวดอโรมาไทย",
            subtitle: "ผ่อนคลายด้วยสมุนไพรหอม",
            detail: "Medium-pressure oil massage using a custom blend of Thai essential oils — lemongrass for energy, jasmine for calm, plai for anti-inflammation. Long gliding strokes combined with gentle acupressure on key Sen points.",
            modality: 'aromatherapy', pressure: 'medium',
            focusAreas: ['Full Body', 'Shoulders', 'Scalp', 'Feet', 'Hands'], duration: 75,
            rationale: "Lemongrass oil reduces cortisol levels by up to 15%. Combined with medium-pressure effleurage, this balances autonomic function and promotes deep relaxation without overstimulation.",
            oilBlend: 'Thai Serenity (Lemongrass + Jasmine + Plai + Bergamot)',
            thermalPairing: "Works with any thermal protocol"
        }
    },
    {
        pillars: ['Physical Repair', 'Resilience'],
        minCapacity: 30, maxCapacity: 75, blockedDuringIllness: true, maxStrain: 18,
        treatment: {
            name: "Nuad Thai", nameTh: "นวดแผนไทย",
            subtitle: "นวดแผนโบราณ 2,500 ปี",
            detail: "Traditional Thai massage performed on a mat — no oil, fully clothed. Practitioner uses hands, elbows, knees, and feet to apply rhythmic pressure along all 10 Sen energy lines, combined with assisted yoga-like stretches (ฤาษีดัดตน).",
            modality: 'nuad_thai', pressure: 'deep',
            focusAreas: ['10 Sen Energy Lines', 'Legs', 'Back', 'Arms', 'Neck'], duration: 90,
            rationale: "UNESCO Intangible Cultural Heritage (2019). Combines acupressure on the 10 Sen lines with passive stretching, improving flexibility by 15-25% and activating the parasympathetic nervous system through sustained pressure.",
            thermalPairing: "Best before contrast therapy — opens energy channels for thermal benefit",
            contraindications: ['Acute inflammation', 'Skin conditions']
        }
    },
    {
        pillars: ['Physical Repair', 'Nervous System'],
        minCapacity: 30, maxCapacity: 70, blockedDuringIllness: true, maxStrain: 14,
        treatment: {
            name: "Tok Sen", nameTh: "ตอกเส้น",
            subtitle: "การตอกเส้นล้านนา",
            detail: "Ancient Northern Thai (Lanna) technique using a tamarind wood mallet and wedge to rhythmically tap along Sen energy lines. The vibrations travel through soft tissue, releasing deep blockages that hands alone cannot reach.",
            modality: 'tok_sen', pressure: 'therapeutic',
            focusAreas: ['Sen Lines', 'Posterior Chain', 'Shoulders', 'Legs', 'Lower Back'], duration: 60,
            rationale: "The rhythmic tapping at 2-3 Hz creates mechanical vibrations that penetrate 3-5cm deep into fascia, releasing chronic adhesions. Particularly effective for stubborn knots and energy blockages that conventional massage misses.",
            thermalPairing: "Excellent before sauna — prepares tissue for heat absorption",
            contraindications: ['Fractures', 'Blood clotting disorders', 'Pregnancy']
        }
    },
    {
        pillars: ['Resilience', 'Physical Repair'],
        minCapacity: 35, maxCapacity: 80, blockedDuringIllness: true, maxStrain: 14,
        treatment: {
            name: "Thai Sports Massage", nameTh: "นวดสปอร์ตไทย",
            subtitle: "ฟื้นฟูสำหรับนักกีฬา",
            detail: "Deep tissue work targeting major muscle groups with Thai pressure techniques. Combines cross-fiber friction on IT band and thoracolumbar fascia with assisted PNF stretching. Thai elbow and foot walking on posterior chain.",
            modality: 'sports', pressure: 'deep',
            focusAreas: ['Hamstrings', 'Quadriceps', 'IT Band', 'Thoracolumbar Fascia', 'Rotator Cuff', 'Hip Flexors'], duration: 75,
            rationale: "Combines Western sports massage precision with Thai pressure techniques. Cross-fiber friction breaks fascial adhesions while PNF stretching restores neuromuscular communication. Ideal for active recovery.",
            thermalPairing: "Best with contrast therapy to flush metabolic waste post-massage"
        }
    },
    {
        pillars: ['Nervous System', 'Physical Repair', 'Resilience'],
        minCapacity: 20, maxCapacity: 65, blockedDuringIllness: false, maxStrain: 21,
        treatment: {
            name: "Thai Foot Reflexology", nameTh: "นวดเท้าสะท้อน",
            subtitle: "ฝ่าเท้า จุดสะท้อนทั้งร่างกาย",
            detail: "Deep thumb-work on the plantar fascia and 7,000+ nerve endings of the feet. Stimulates organ reflex zones mapped to the 10 Sen lines. Includes lower leg massage and warm herbal foot soak.",
            modality: 'foot_reflexology', pressure: 'deep',
            focusAreas: ['Plantar Fascia', 'Arches', 'Toes', 'Ankle', 'Lower Leg'], duration: 45,
            rationale: "Feet contain reflex zones connected to every major organ via the 10 Sen. Stimulating the plantar vagal pathway activates the parasympathetic system. Thai foot massage has been proven to reduce anxiety scores by 30%.",
            thermalPairing: "Pairs with cold foot soak for maximum circulation"
        }
    },

    // ═══ ADVANCED (Strong → Elite capacity) ═══
    {
        pillars: ['Resilience', 'Physical Repair'],
        minCapacity: 55, maxCapacity: 100, blockedDuringIllness: true, maxStrain: 12,
        treatment: {
            name: "Royal Thai", nameTh: "นวดราชสำนัก",
            subtitle: "นวดแบบราชสำนัก",
            detail: "Court-style Thai massage — only thumbs are used, maintaining a respectful distance. Precise acupressure on all 10 Sen lines with clinical accuracy. No stretching, no walking. The most refined form of Thai bodywork.",
            modality: 'royal_thai', pressure: 'therapeutic',
            focusAreas: ['10 Sen Lines', 'Meridian Points', 'Hands', 'Feet', 'Head'], duration: 90,
            rationale: "Originally performed only for Thai royalty. Uses thumb-only precision on exact Sen points, creating a deeply meditative experience. The restraint in technique allows the body's own healing intelligence to activate.",
            thermalPairing: "Best before any thermal protocol — optimizes energy flow"
        }
    },
    {
        pillars: ['Physical Repair', 'Resilience'],
        minCapacity: 60, maxCapacity: 100, blockedDuringIllness: true, maxStrain: 10,
        treatment: {
            name: "Guasha & Sen Release", nameTh: "กัวซากับเปิดเส้น",
            subtitle: "ขูดพิษ เปิดเส้นเลือด",
            detail: "Buffalo horn or jade Guasha tool is used to scrape along Sen lines and fascial planes. Releases trapped heat (sha), breaks fascial adhesions, and dramatically improves local blood flow. Combined with Thai liniment oil.",
            modality: 'guasha', pressure: 'therapeutic',
            focusAreas: ['Upper Back', 'Neck', 'Shoulders', 'IT Band', 'Calves'], duration: 60,
            rationale: "Guasha increases surface microperfusion by 400% for up to 25 minutes post-treatment. Combined with Thai Sen theory, it targets energy stagnation where fascia has become fibrotic from training or chronic tension.",
            thermalPairing: "Avoid cold immediately after — 30 min rest before contrast therapy",
            contraindications: ['Blood thinners', 'Sunburn', 'Skin lesions']
        }
    },
    {
        pillars: ['Physical Repair', 'Resilience'],
        minCapacity: 50, maxCapacity: 100, blockedDuringIllness: true, maxStrain: 12,
        treatment: {
            name: "Thai Cupping", nameTh: "ครอบแก้ว",
            subtitle: "ดูดพิษ คลายปวด",
            detail: "Silicone or glass cups create controlled suction along the back, shoulders, and legs. Creates controlled microtrauma that triggers a local healing response. Combined with Thai herbal liniment application.",
            modality: 'cupping', pressure: 'therapeutic',
            focusAreas: ['Upper Back', 'Shoulders', 'Lower Back', 'Hamstrings', 'Calves'], duration: 45,
            rationale: "Cupping creates negative pressure (decompressive force) versus massage's compressive force, accessing tissue layers that manual pressure cannot. Increases local blood flow by 300% and activates self-healing inflammatory cascade.",
            herbs: ['Thai liniment (น้ำมันเขียว)', 'Plai oil'],
            thermalPairing: "Best before sauna — heat amplifies cupping's circulation benefit",
            contraindications: ['Blood thinners', 'Skin conditions', 'Varicose veins']
        }
    },
    {
        pillars: ['Resilience'],
        minCapacity: 70, maxCapacity: 100, blockedDuringIllness: true, maxStrain: 8,
        treatment: {
            name: "Performance Deep Tissue", nameTh: "ดีพทิชชู่เพื่อสมรรถภาพ",
            subtitle: "กดลึก ปรับโครงสร้าง",
            detail: "Maximum-intensity deep tissue targeting the full posterior chain. 90-second sustained trigger point holds. Cross-fiber friction on IT band and thoracolumbar fascia. Thai elbow and knee techniques for maximum penetration.",
            modality: 'deep_tissue', pressure: 'deep',
            focusAreas: ['Full Posterior Chain', 'Hip Complex', 'Shoulder Complex', 'Plantar Fascia'], duration: 90,
            rationale: "Only appropriate when capacity is high (level 4+) and strain is low. Peak recovery allows the body to absorb intense mechanical work, breaking fascial restrictions and expanding range of motion.",
            thermalPairing: "Combine with intense contrast therapy for maximum adaptation",
            contraindications: ['Low recovery', 'Recent injury']
        }
    },
    {
        pillars: ['Nervous System', 'Resilience', 'Physical Repair'],
        minCapacity: 40, maxCapacity: 90, blockedDuringIllness: false, maxStrain: 16,
        treatment: {
            name: "Herbal Steam & Press", nameTh: "อบไอน้ำสมุนไพรและกดจุด",
            subtitle: "อบสมุนไพร + กดจุด",
            detail: "Begin with Thai herbal steam tent (10 min) using lemongrass, kaffir lime, and eucalyptus to open pores and respiratory passages. Followed by targeted acupressure on 10 primary Sen points and warm herbal compress application.",
            modality: 'herbal_compress', pressure: 'medium',
            focusAreas: ['Full Body Steam', 'Sen Points', 'Chest', 'Sinuses', 'Back', 'Feet'], duration: 90,
            rationale: "Herbal steam opens the respiratory tract (crucial when respRate is elevated) while the aromatic herbs provide anti-inflammatory benefits. The subsequent acupressure targets specific energy blockages revealed by biometric data.",
            herbs: ['Lemongrass (ตะไคร้)', 'Kaffir Lime Leaves (ใบมะกรูด)', 'Eucalyptus', 'Galangal (ข่า)', 'Pandan Leaves (ใบเตย)'],
            thermalPairing: "Can replace sauna as thermal component"
        }
    },
]

// ─── Intelligent Treatment Selector ────────────────────────

function buildMassage(
    pillar: string,
    severity: 'mild' | 'moderate' | 'severe',
    capacity?: CapacityAssessment
): MassageProtocol {
    const capScore = capacity?.totalScore ?? (severity === 'severe' ? 20 : severity === 'moderate' ? 50 : 75)
    const dayStrain = (capacity as any)?.dayStrain ?? 10
    const illnessActive = capacity?.illnessWarning?.active ?? false

    // Filter treatments based on biometric fitness
    const eligible = TREATMENT_REGISTRY.filter(t => {
        if (capScore < t.minCapacity || capScore > t.maxCapacity) return false
        if (illnessActive && t.blockedDuringIllness) return false
        if (dayStrain > t.maxStrain) return false
        if (!t.pillars.includes(pillar) && !t.pillars.includes('Resilience')) return false
        return true
    })

    // Score each eligible treatment
    const scored = eligible.map(t => {
        let score = 0
        // Pillar match is highest priority
        if (t.pillars.includes(pillar)) score += 10
        // Prefer treatments whose capacity range centers near client's score
        const rangeMid = (t.minCapacity + t.maxCapacity) / 2
        score += 5 - Math.abs(capScore - rangeMid) / 20
        // Severity alignment
        if (severity === 'severe' && t.treatment.pressure === 'feather') score += 5
        if (severity === 'severe' && t.treatment.pressure === 'light') score += 3
        if (severity === 'mild' && (t.treatment.pressure === 'deep' || t.treatment.pressure === 'therapeutic')) score += 3
        // Thai authenticity bonus (cultural value)
        if (['nuad_thai', 'tok_sen', 'herbal_compress', 'royal_thai', 'foot_reflexology', 'cupping', 'guasha'].includes(t.treatment.modality)) score += 2
        return { ...t, score }
    })

    scored.sort((a, b) => b.score - a.score)

    const best = scored[0]?.treatment
    if (!best) {
        // Ultimate fallback — always available
        return {
            id: 'massage', name: 'Thai Aromatherapy', nameTh: 'นวดอโรมาไทย',
            subtitle: 'ผ่อนคลายด้วยสมุนไพรหอม',
            detail: 'Gentle aromatherapy massage with Thai essential oils for universal comfort.',
            modality: 'aromatherapy', pressure: 'medium',
            focusAreas: ['Full Body'], duration: 60,
            rationale: 'Universal fallback — aromatherapy is safe and beneficial at any capacity level.',
        }
    }

    return { id: 'massage', ...best }
}

// ─── Public API ────────────────────────────────────────────

export function generateFullProtocol(
    metrics: CapacityMetrics,
    pillar: string,
    severity: 'mild' | 'moderate' | 'severe',
    hrvDelta: number,
    sleepDelta: number = 0
): FullProtocol {
    const capacity = assessCapacity(metrics, hrvDelta, sleepDelta)
    const availableRecipes = getAvailableRecipes(capacity)
    const massage = buildMassage(pillar, severity, capacity)
    return { capacity, availableRecipes, massage, engineVersion: "v9.0-full-intelligence" }
}

// ─── Legacy Compatibility (used by members/page.tsx) ──────

export interface ProtocolItem {
    id: string; category: string; icon: string; title: string; detail: string
    benefits: string[]; tailoredFor: string; tag?: string; tagColor?: string
    recipe?: { modality: string; saunaTemp: number; saunaDuration: number; coldType: string; coldTemp: number; coldDuration: number; sets: number; restBetween: number; endOnCold: boolean; notes?: string }
}

export function generateProtocol(
    metrics: any, pillarName: string, severity: 'mild' | 'moderate' | 'severe' = 'mild'
): ProtocolItem[] {
    const full = generateFullProtocol(metrics, pillarName, severity, 0, 0)
    const topRecipe = full.availableRecipes[full.availableRecipes.length - 1] || full.availableRecipes[0]
    if (!topRecipe) return []
    return [
        { id: 'massage', category: 'Massage', icon: '\u270B', title: full.massage.name, detail: full.massage.detail, benefits: [], tailoredFor: pillarName },
        {
            id: 'thermal', category: 'Thermal', icon: topRecipe.icon, title: topRecipe.name, detail: topRecipe.whyThisWorks,
            benefits: topRecipe.goalLabels, tailoredFor: pillarName,
            tag: topRecipe.intensity, tagColor: topRecipe.intensity === 'extreme' ? 'red' : topRecipe.intensity === 'intense' ? 'red' : 'amber',
            recipe: {
                modality: topRecipe.modality, saunaTemp: topRecipe.saunaTemp, saunaDuration: topRecipe.saunaDuration,
                coldType: topRecipe.coldEquipment, coldTemp: topRecipe.coldTemp, coldDuration: topRecipe.coldDuration,
                sets: topRecipe.sets, restBetween: topRecipe.restBetween, endOnCold: topRecipe.endOnCold, notes: topRecipe.proTip
            }
        }
    ]
}
