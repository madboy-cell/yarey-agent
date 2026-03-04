import { NextResponse } from 'next/server'
import { generateClinicalInsight, type ClinicalInput } from '@/lib/gemini/clinical-intelligence'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

export async function POST(request: Request) {
    try {
        const body: ClinicalInput & { sessionId?: string } = await request.json()

        if (!body.hrv || !body.pillar) {
            return NextResponse.json({ error: 'Missing required biometric data' }, { status: 400 })
        }

        // Cache key: same client + same day + same recovery = same insight
        const today = new Date().toISOString().split('T')[0]
        const cacheKey = `clinical_${body.sessionId || 'anon'}_${today}_${body.recoveryScore}`

        // Check cache first
        try {
            const cached = await getDoc(doc(db, 'clinical_insights', cacheKey))
            if (cached.exists()) {
                return NextResponse.json({ success: true, insight: cached.data(), cached: true })
            }
        } catch { /* cache miss */ }

        // Generate with Gemini
        const insight = await generateClinicalInsight(body)

        // Cache result
        try {
            await setDoc(doc(db, 'clinical_insights', cacheKey), {
                ...insight,
                sessionId: body.sessionId,
                recoveryScore: body.recoveryScore,
                capacityScore: body.capacityScore,
            })
        } catch { /* non-critical */ }

        return NextResponse.json({ success: true, insight, cached: false })

    } catch (error: any) {
        console.error('[Clinical API] Error:', error.message)
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to generate clinical insight'
        }, { status: 500 })
    }
}
