/**
 * Yarey Sanctuary — Gemini Clinical Intelligence v1.0
 * AI-powered clinical narrative + protocol reasoning
 * 
 * Uses Gemini 2.0 Flash for fast, intelligent health insights
 * Designed to feel like a real wellness doctor analyzing your data
 */

import { GoogleGenerativeAI } from '@google/generative-ai'


// ─── Types ──────────────────────────────────────────────────

export interface ClinicalInput {
    // biometrics
    hrv: number; rhr: number; deepSleep: number; respRate: number
    recoveryScore: number
    spo2?: number; skinTemp?: number
    remSleep?: number; sleepEfficiency?: number; sleepPerformance?: number
    sleepConsistency?: number; sleepDebtMs?: number; disturbances?: number
    dayStrain?: number; workoutStrain?: number; workoutSport?: string
    // engine output
    capacityScore: number; capacityLevel: number; capacityLabel: string
    dimensions: { name: string; score: number; maxScore: number }[]
    illnessWarning?: { active: boolean; severity: string; signals: string[] }
    safetyFlags: string[]
    // analysis
    pillar: string; severity: string; trigger?: string
    // baseline
    hrvDelta?: number; sleepDelta?: number
    baselineHrv?: number; baselineDeepSleep?: number
    // protocol
    massageName?: string; massagePressure?: string
    recipeName?: string; recipeModality?: string; recipeIntensity?: string
    recipeSaunaTemp?: number; recipeColdTemp?: number; recipeTotalTime?: number
}

export interface ClinicalOutput {
    narrative: string           // 3-5 sentence clinical insight (EN)
    narrativeTh: string         // Thai version
    protocolReasoning: string   // WHY this specific protocol
    protocolReasoningTh: string
    actionItems: string[]       // 2-3 actionable takeaways
    riskLevel: 'green' | 'amber' | 'red'
    generatedAt: string
}

// ─── System Prompts ─────────────────────────────────────────

const CLINICAL_SYSTEM = `You are a board-certified sports medicine physician and wellness specialist with 20 years of experience in biometric-driven recovery optimization. You consult for elite athletes and wellness resorts.

You will receive a client's complete biometric profile from WHOOP wearable data, including:
- Cardiac metrics (HRV, RHR, Recovery %)
- Sleep architecture (SWS, REM, efficiency, debt, disturbances)
- Respiratory & immunity (SpO2, skin temperature, respiratory rate)
- Physical load (day strain, workout strain)
- Circadian rhythm (consistency, performance)
- A capacity assessment with 6 scored dimensions
- Any illness early warning signals
- Recommended massage and thermal protocols

Your task is to generate a clinical narrative that:
1. Sounds like a real doctor's consultation note — professional, specific, data-driven
2. Connects multiple data points to tell a coherent physiological story
3. Identifies the MOST important insight the client should know TODAY
4. Is concise (3-5 sentences) but dense with clinical intelligence
5. Never uses generic filler — every sentence must reference actual data

You must respond in this exact JSON format:
{
  "narrative": "English clinical narrative (3-5 sentences)",
  "narrativeTh": "Thai clinical narrative (3-5 sentences, professional/warm tone, use ท่าน not คุณ)",
  "protocolReasoning": "English: 2-3 sentences explaining WHY these specific protocols were selected based on the biometric data. Connect the dots between data and treatment.",
  "protocolReasoningTh": "Thai version of protocol reasoning",
  "actionItems": ["2-3 specific actionable items for the client today"],
  "riskLevel": "green|amber|red based on overall health signals"
}

Rules:
- If SpO2 < 96% or skin temp elevated or multiple illness signals → riskLevel "red" and mention it prominently
- If recovery < 33% or HRV significantly below baseline → riskLevel "amber" 
- Reference specific numbers when impactful (e.g., "Your HRV of 82ms is 15% above your baseline")
- For Thai: use ท่าน (formal you), keep medical terms in English when no Thai equivalent
- Make the protocol reasoning feel like the doctor is personally selecting the treatment
- actionItems should be practical: "Hydrate 500ml before session", "Avoid caffeine after 2pm today"`

// ─── Main Functions ─────────────────────────────────────────

export async function generateClinicalInsight(input: ClinicalInput): Promise<ClinicalOutput> {
    const sleepDebtHrs = (input.sleepDebtMs || 0) / 3600000

    const userPrompt = `Client Biometric Profile:

CARDIAC: HRV ${Math.round(input.hrv)}ms${input.hrvDelta ? ` (${input.hrvDelta > 0 ? '+' : ''}${Math.round(input.hrvDelta * 100)}% vs 14-day baseline of ${Math.round(input.baselineHrv || input.hrv)}ms)` : ''}, RHR ${Math.round(input.rhr)}bpm, Recovery ${input.recoveryScore}%

SLEEP ARCHITECTURE: Deep/SWS ${Math.round(input.deepSleep)}min${input.remSleep ? `, REM ${Math.round(input.remSleep)}min` : ''}${input.sleepEfficiency ? `, Efficiency ${input.sleepEfficiency}%` : ''}${sleepDebtHrs > 0 ? `, Sleep Debt ${sleepDebtHrs.toFixed(1)}hrs` : ''}${input.disturbances ? `, ${input.disturbances} disturbances` : ''}${input.sleepConsistency ? `, Consistency ${input.sleepConsistency}%` : ''}

RESPIRATORY & IMMUNITY: Resp Rate ${input.respRate?.toFixed(1)}rpm${input.spo2 ? `, SpO2 ${input.spo2.toFixed(1)}%` : ''}${input.skinTemp ? `, Skin Temp ${input.skinTemp.toFixed(1)}°C` : ''}

PHYSICAL LOAD: ${input.dayStrain ? `Day Strain ${input.dayStrain.toFixed(1)}/21` : 'No strain data'}${input.workoutStrain ? `, Workout Strain ${input.workoutStrain.toFixed(1)}` : ''}${input.workoutSport ? ` (${input.workoutSport})` : ''}

CAPACITY ASSESSMENT: Score ${input.capacityScore}/100, Level ${input.capacityLevel} (${input.capacityLabel})
Dimensions: ${input.dimensions.map(d => `${d.name} ${d.score}/${d.maxScore}`).join(', ')}

${input.illnessWarning?.active ? `⚠️ ILLNESS WARNING (${input.illnessWarning.severity}): ${input.illnessWarning.signals.join('; ')}` : 'No illness signals detected.'}
${input.safetyFlags.length > 0 ? `Safety Flags: ${input.safetyFlags.join('; ')}` : ''}

ANALYSIS: Primary pillar = ${input.pillar} (${input.severity})${input.trigger ? `, Trigger: ${input.trigger}` : ''}

PRESCRIBED PROTOCOL:
- Massage: ${input.massageName || 'Standard'} (${input.massagePressure || 'medium'} pressure)
- Thermal: ${input.recipeName || 'Standard protocol'}${input.recipeModality ? ` (${input.recipeModality})` : ''}${input.recipeSaunaTemp ? `, Sauna ${input.recipeSaunaTemp}°C` : ''}${input.recipeColdTemp ? `, Cold ${input.recipeColdTemp}°C` : ''}${input.recipeTotalTime ? `, ${input.recipeTotalTime}min total` : ''}

Generate the clinical insight now. Respond ONLY with valid JSON.`

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: CLINICAL_SYSTEM + '\n\n' + userPrompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 800,
                responseMimeType: 'application/json',
            }
        })

        const text = result.response.text()
        const parsed = JSON.parse(text)

        return {
            narrative: parsed.narrative || '',
            narrativeTh: parsed.narrativeTh || '',
            protocolReasoning: parsed.protocolReasoning || '',
            protocolReasoningTh: parsed.protocolReasoningTh || '',
            actionItems: parsed.actionItems || [],
            riskLevel: parsed.riskLevel || 'green',
            generatedAt: new Date().toISOString(),
        }
    } catch (error: any) {
        console.error('[Gemini Clinical] Error:', error.message)
        // Return template fallback — never leave user without insight
        return buildFallbackInsight(input)
    }
}

// ─── Weekly Trend Analysis ──────────────────────────────────

export interface TrendInput {
    clientName: string
    sessions: {
        date: string
        recoveryScore: number
        hrv: number
        rhr: number
        deepSleep: number
        dayStrain?: number
        capacityScore: number
        spo2?: number
        sleepDebtMs?: number
    }[]
}

export async function generateWeeklyTrendReport(input: TrendInput): Promise<string> {
    if (input.sessions.length < 3) return ''

    const dataRows = input.sessions
        .map(s => `${s.date}: Recovery ${s.recoveryScore}%, HRV ${Math.round(s.hrv)}ms, RHR ${Math.round(s.rhr)}bpm, SWS ${Math.round(s.deepSleep)}m${s.dayStrain ? `, Strain ${s.dayStrain.toFixed(1)}` : ''}, Capacity ${s.capacityScore}/100${s.spo2 ? `, SpO2 ${s.spo2.toFixed(1)}%` : ''}`)
        .join('\n')

    const prompt = `You are a sports medicine physician reviewing weekly biometric trends for a wellness resort client.

Client: ${input.clientName}
Sessions (${input.sessions.length} data points):
${dataRows}

Write a 3-4 sentence professional trend analysis in English. Identify:
1. The dominant trend (improving, declining, stable)
2. Any concerning patterns (overtraining, sleep degradation, potential illness)
3. One specific recommendation for the coming week

Be specific with numbers and percentages. Keep it concise and actionable.`

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 300 },
        })
        return result.response.text().trim()
    } catch (error: any) {
        console.error('[Gemini Trend] Error:', error.message)
        return ''
    }
}

// ─── Fallback (when Gemini fails) ───────────────────────────

function buildFallbackInsight(input: ClinicalInput): ClinicalOutput {
    const recovery = input.recoveryScore
    const dp = input.hrvDelta ? Math.round(input.hrvDelta * 100) : 0

    const s1 = `Your HRV of ${Math.round(input.hrv)}ms${dp ? ` (${dp >= 0 ? '+' : ''}${dp}% vs baseline)` : ''} combined with ${recovery}% recovery indicates ${recovery >= 67 ? 'strong autonomic reserve' : recovery >= 33 ? 'moderate readiness' : 'your body is still recovering'}.`
    const s2 = input.deepSleep >= 90 ? `${Math.round(input.deepSleep)}min of deep sleep supports excellent tissue repair.` : `${Math.round(input.deepSleep)}min of deep sleep is ${input.deepSleep >= 60 ? 'adequate' : 'below optimal'}.`
    const s3 = input.illnessWarning?.active ? input.illnessWarning.signals[0] || 'Monitor your health closely today.' : 'No immunity concerns detected.'

    return {
        narrative: [s1, s2, s3].join(' '),
        narrativeTh: '',
        protocolReasoning: `Today's ${input.massageName || 'massage'} protocol was selected based on your ${input.pillar} pillar analysis.`,
        protocolReasoningTh: '',
        actionItems: ['Hydrate well before and after your session', 'Listen to your body during treatment'],
        riskLevel: input.illnessWarning?.active ? 'red' : recovery < 33 ? 'amber' : 'green',
        generatedAt: new Date().toISOString(),
    }
}
