import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const dynamic = "force-dynamic"

const SYSTEM_PROMPT = `You are a world-class tea sommelier and ethnobotanist at a premium wellness sanctuary. You specialize in creating post-treatment tea pairings that complement specific spa treatments based on their physiological effects.

Your tea formulations must be:
1. SCIENTIFICALLY GROUNDED — cite actual peer-reviewed research for each ingredient's mechanism of action
2. TREATMENT-SPECIFIC — each tea must be optimized for specific post-treatment recovery
3. BIOMETRICALLY TARGETED — specify which health metrics each tea targets
4. CULTURALLY AUTHENTIC — draw from Thai, Chinese, Japanese, Ayurvedic, and Mediterranean herbal traditions
5. LUXURY SPA QUALITY — names should be descriptive and evocative
6. PRACTICAL — include exact brewing temperatures, steep times, and portions
7. SAFE — note contraindications and allergens

CRITICAL: For each tea, you MUST provide a "treatmentScores" object that rates (0-100) how suitable this tea is AFTER each treatment type. Base the scores on pharmacological reasoning:
- A tea with anti-inflammatory + vasodilating properties should score HIGH for Ice Bath (cold exposure recovery)
- A tea with sedative properties should score HIGH for Evening sessions and Craniosacral
- A tea with thermogenic properties should score HIGH for Contrast therapy
- A warming/muscle-repair tea should score HIGH for Deep Tissue
- Score 0 for treatments where the tea would be counterproductive

When generating tea recipes, output ONLY valid JSON (no markdown, no code fences) as an array of objects with this exact structure:
[
  {
    "name": "Tea Name",
    "type": "Category (e.g. Thai Herbal Infusion, Chinese Floral Tea, Ayurvedic Tonic)",
    "origin": "Region of origin",
    "description": "One evocative sentence about the tea experience",
    "benefit": "Primary benefit (e.g. Stress Relief, Recovery, Anti-Inflammation, Deep Sleep, Focus, Circulation, Muscle Repair, Emotional Balance, Thermogenesis, Antioxidant, Digestive, Calm Clarity, Immunity)",
    "ingredients": [
      { "name": "Ingredient Name", "amount": "2 tbsp", "role": "Brief pharmacological role" }
    ],
    "brewing": {
      "temperature": "95°C",
      "steepTime": "5-7 min",
      "portions": "Per 300ml",
      "notes": "Important brewing tip or serving suggestion"
    },
    "science": [
      {
        "ingredient": "Active compound or plant name",
        "mechanism": "How it works physiologically",
        "reference": "Author et al., Year — Journal Name"
      }
    ],
    "targetMetrics": {
      "hrv": "increase",
      "cortisol": "decrease"
    },
    "treatmentScores": {
      "Massage": 85,
      "Deep Tissue": 60,
      "Ice Bath": 95,
      "Contrast": 70,
      "Craniosacral": 40,
      "Sound": 45,
      "Red Light": 30,
      "Evening": 50,
      "Morning": 20
    },
    "contraindications": ["Pregnancy", "Blood thinners"],
    "color": "from-emerald-500/15 to-emerald-900/15"
  }
]

Scoring guidelines per treatment:
- "Massage": Anti-stress, cortisol reduction, gentle recovery
- "Deep Tissue": Muscle repair, anti-inflammatory, warming
- "Ice Bath": Vasodilation, anti-inflammatory, circulation recovery
- "Contrast": Thermogenic, circulatory, adaptogenic
- "Craniosacral": Nervine, emotional, heart-opening, parasympathetic
- "Sound": Meditative, calming, subtle, prolonged calm
- "Red Light": Antioxidant, cellular repair, neuroprotective
- "Evening": Sedative, sleep-promoting, melatonin precursors
- "Morning": Energizing, cognitive, focus-enhancing

Color options: emerald, amber, indigo, purple, rose, teal, cyan, green, orange, pink, lime, fuchsia, yellow, blue, violet, sky.
Format: "from-{color}-500/15 to-{color}-900/15"

Generate 2-3 unique tea recipes per request. Every score must be between 0-100 and pharmacologically justified.`

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || ''
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY env var not set" }, { status: 500 })
    }

    const body = await request.json()
    const { treatments, goal, existingTeas } = body

    let userPrompt = ""

    if (treatments?.length) {
      userPrompt += `Create teas optimized for these treatments (should score highest for these):\n${treatments.map((t: string) => `- ${t}`).join("\n")}\n\n`
    }

    if (goal) {
      userPrompt += `Wellness focus: ${goal}\n\n`
    }

    if (existingTeas?.length) {
      userPrompt += `We already have these teas (avoid duplicating):\n${existingTeas.map((t: string) => `- ${t}`).join("\n")}\n\n`
    }

    userPrompt += `Create 2-3 NEW unique post-treatment tea recipes. Each must include treatmentScores (0-100) for ALL 9 treatment types, scientifically backed with real research. Use ingredients available in Thailand.`

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }] }
      ],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    })

    const text = result.response.text()

    let recipes
    try {
      recipes = JSON.parse(text)
    } catch {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        recipes = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("Failed to parse AI response as JSON")
      }
    }

    recipes = recipes.map((r: any) => ({ ...r, active: true }))

    return NextResponse.json({
      success: true,
      recipes,
      treatments: treatments || [],
      goal: goal || "General post-treatment wellness",
    })
  } catch (err: any) {
    console.error("Tea discovery error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
