import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';



const SYSTEM_PROMPT = `You are the Yarey Sanctuary Body Oracle — a mystical wellness advisor who reads biometric data the way a fortune teller reads tarot cards.

Your tone is: wise, warm, slightly mystical, grounded in real data but phrased like a body fortune reading.

You will receive a guest's WHOOP biometric data including:
- Recovery score, HRV, resting heart rate, deep sleep, respiratory rate
- Their wellness "pillar" (what their body needs most)
- Severity level (mild/moderate/severe)
- Specific protocol recommendations (massage + contrast therapy)

Your job is to write a "Body Reading" (ดวงร่างกาย) that:

1. **Opening line in Thai** — mystical but warm, like a fortune teller opening. Reference the body, not stars. Examples:
   - "วันนี้ร่างกายของคุณกระซิบบอกว่า..." (Today your body whispers...)
   - "พลังงานภายในของคุณเผยให้เห็นว่า..." (Your inner energy reveals...)
   - "จังหวะการเต้นของหัวใจบอกเล่าเรื่องราวว่า..." (The rhythm of your heart tells a story...)

2. **2-3 sentences in Thai** explaining what their body is going through in a mystical-but-accurate way. Reference actual metrics but don't use numbers — use feelings and metaphors.

3. **A prescription line in Thai** that connects to their actual massage + contrast protocol, phrased as guidance from the body oracle.

4. **English subtitle** — a single concise English sentence capturing the essence.

Rules:
- NEVER use clinical language (don't say "HRV", "baseline", "sympathetic nervous system")
- DO reference the body as if it has its own wisdom and voice
- Keep it to 4-6 sentences max (Thai), then 1 English sentence
- Make it something a Thai person would screenshot and share on LINE
- Each reading should feel unique and personal
- If recovery is high (>67%), be celebratory. If low (<34%), be nurturing and protective.
- Always frame the protocols as the body's own desire, not a prescription

Format your response as:
THAI: [the Thai reading]
EN: [one English sentence]`;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { metrics, pillar, severity, trigger, protocol, sessionId } = body;

        if (!metrics || !pillar) {
            return NextResponse.json({ error: 'Missing metrics or pillar' }, { status: 400 });
        }

        // Check cache — don't regenerate for same day + same recovery score
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `insight_${sessionId || 'anon'}_${today}`;

        try {
            const cached = await getDoc(doc(db, 'wellness_insights', cacheKey));
            if (cached.exists()) {
                return NextResponse.json({ success: true, insight: cached.data(), cached: true });
            }
        } catch {
            // Cache miss or error — continue to generate
        }

        // Build the prompt
        const recoveryScore = metrics.recoveryScore || 0;
        const contrastItem = protocol?.find((p: any) => p.id === 'contrast');
        const massageItem = protocol?.find((p: any) => p.id === 'massage');

        const userPrompt = `Guest biometric reading for today:

Recovery: ${recoveryScore}% (${recoveryScore >= 67 ? 'High — body is thriving' : recoveryScore >= 34 ? 'Moderate — body is managing' : 'Low — body needs deep care'})
Heart rhythm quality: ${metrics.hrv > 60 ? 'Strong and resilient' : metrics.hrv > 40 ? 'Slightly tense' : 'Under significant stress'}
Resting heartbeat: ${metrics.rhr < 55 ? 'Calm and steady' : metrics.rhr < 65 ? 'Slightly elevated' : 'Racing, needs calming'}
Deep sleep quality: ${metrics.deepSleep > 60 ? 'Abundant restoration' : metrics.deepSleep > 40 ? 'Moderate rest' : 'Insufficient healing sleep'}
Breathing rhythm: ${metrics.respRate < 14 ? 'Deep and peaceful' : metrics.respRate < 16 ? 'Normal' : 'Shallow and stressed'}
${metrics.spo2 ? `Blood oxygen: ${metrics.spo2 > 97 ? 'Pure and vibrant' : metrics.spo2 > 95 ? 'Adequate flow' : 'Below optimal — body craving deeper breaths'}` : ''}
${metrics.skinTemp ? `Skin warmth: ${metrics.skinTemp > 34 ? 'Running warm — inner fire is active' : 'Cool and balanced'}` : ''}
${metrics.dayStrain ? `Physical exertion: ${metrics.dayStrain > 14 ? 'The body has pushed hard today' : metrics.dayStrain > 8 ? 'Moderate activity' : 'Gentle day, energy preserved'}` : ''}
${metrics.remSleep ? `Dream sleep: ${metrics.remSleep > 90 ? 'Rich dreaming, mind is processing deeply' : metrics.remSleep > 50 ? 'Moderate dream cycles' : 'Minimal dreaming — mind is restless'}` : ''}
${metrics.sleepDebt ? `Sleep debt: ${metrics.sleepDebt > 3 ? 'Significant debt accumulated — body is calling for rest' : 'Well-rested'}` : ''}

Wellness Pillar: ${pillar} (${severity})
Body's signal: ${trigger}
${body.illnessWarning?.active ? `⚠️ The body is showing early signs of illness (${body.illnessWarning.severity}): ${body.illnessWarning.signals?.join(', ')}` : ''}

Today's prescribed massage: ${massageItem?.title || 'Restorative massage'}
Today's contrast recipe: ${contrastItem?.title || 'Standard contrast'} — ${contrastItem?.recipe ? `Sauna ${contrastItem.recipe.saunaTemp}°C for ${contrastItem.recipe.saunaDuration}min${contrastItem.recipe.coldDuration > 0 ? ` → Cold ${contrastItem.recipe.coldTemp}°C for ${contrastItem.recipe.coldDuration}min, ${contrastItem.recipe.sets} sets` : ', warm rest only — no cold'}` : 'gentle thermal therapy'}

Write the body reading now.`;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent({
            contents: [
                { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }] }
            ],
            generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 500,
            }
        });

        const text = result.response.text();

        // Parse Thai and English
        let thai = '';
        let en = '';

        const thaiMatch = text.match(/THAI:\s*([\s\S]*?)(?=EN:|$)/i);
        const enMatch = text.match(/EN:\s*(.*)/i);

        if (thaiMatch) thai = thaiMatch[1].trim();
        if (enMatch) en = enMatch[1].trim();

        // Fallback if parsing fails
        if (!thai) {
            thai = text.replace(/THAI:|EN:.*/gi, '').trim();
        }
        if (!en) {
            en = 'Your body has spoken — listen and restore.';
        }

        const insight = {
            thai,
            en,
            pillar,
            severity,
            recoveryScore,
            generatedAt: new Date().toISOString(),
        };

        // Cache it
        try {
            await setDoc(doc(db, 'wellness_insights', cacheKey), insight);
        } catch {
            // Caching failed — non critical
        }

        return NextResponse.json({ success: true, insight, cached: false });

    } catch (error: any) {
        console.error('Insight generation error:', error.message);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to generate insight',
            fallback: {
                thai: 'วันนี้ร่างกายของคุณต้องการการพักผ่อน จงฟังเสียงของร่างกาย',
                en: 'Your body asks for restoration today.',
                pillar: 'General',
                severity: 'mild',
                recoveryScore: 0,
                generatedAt: new Date().toISOString(),
            }
        }, { status: 500 });
    }
}
