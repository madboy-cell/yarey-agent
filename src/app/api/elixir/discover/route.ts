import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const dynamic = "force-dynamic"

const SYSTEM_PROMPT = `You are a world-class botanical pharmacologist and functional medicine formulator at a premium wellness sanctuary. You specialize in creating therapeutic cold-pressed juice elixirs and herbal tonics that target specific physiological markers.

Your formulations must be:
1. SCIENTIFICALLY GROUNDED — cite actual research (peer-reviewed studies, pubmed references) for each ingredient's efficacy
2. BIOMETRICALLY TARGETED — specify which health metrics each recipe improves (HRV, Resting Heart Rate, Deep Sleep, Respiratory Rate, Cortisol, Inflammation markers)
3. LUXURY SPA QUALITY — names should be evocative and premium (e.g. "The Grounding", "Nocturne", "The Forge")
4. PRACTICAL — include exact amounts, preparation steps, and timing
5. SAFE — note any contraindications or allergens
6. COST-ANALYZED — estimate ingredient costs based on Thai Makro/Tops/Lazada bulk prices in Thai Baht (THB). Calculate cost per batch and per serving.

When generating recipes, output ONLY valid JSON (no markdown, no code fences) as an array of objects with this exact structure:
[
  {
    "title": "The Elixir Name",
    "subtitle": "Functional Category",
    "description": "One-line poetic description of the elixir's purpose",
    "benefit": "Primary benefit category (e.g. Deep Sleep, Focus, Recovery, Anxiety Relief, Anti-Inflammation)",
    "ingredients": [
      { "name": "Ingredient Name", "amount": "250g", "role": "What it does in the formula", "estimatedCostTHB": 25 }
    ],
    "extraIngredientsNeeded": [
      { "name": "Optional Extra", "amount": "5g", "reason": "Why this enhances the formula", "estimatedCostTHB": 15 }
    ],
    "recipe": {
      "prepTime": "5 min",
      "servingSize": "250ml",
      "batchSize": "1L",
      "portionsPerBatch": 4,
      "equipment": ["Cold-press juicer", "Fine mesh strainer"],
      "steps": [
        "Step 1 description",
        "Step 2 description"
      ],
      "servingNotes": "Best consumed on empty stomach, 30 min before treatment",
      "shelfLife": "Consume within 4 hours for maximum efficacy"
    },
    "costing": {
      "batchCostTHB": 120,
      "costPerServingTHB": 30,
      "suggestedPriceTHB": 280,
      "marginPercent": 89,
      "priceNote": "Based on Thai Makro bulk pricing, March 2026 estimates"
    },
    "science": [
      {
        "ingredient": "Ashwagandha",
        "mechanism": "Reduces cortisol by 28% via HPA axis modulation",
        "reference": "Chandrasekhar et al., 2012 - Indian J Psychol Med"
      }
    ],
    "targetMetrics": {
      "hrv": "increase",
      "rhr": "decrease",
      "deepSleep": "increase",
      "respRate": "decrease",
      "cortisol": "decrease",
      "inflammation": "decrease"
    },
    "contraindications": ["Pregnancy", "Blood thinners"],
    "color": "from-emerald-500/20 to-emerald-900/20"
  }
]

For costing:
- Use realistic Thai Makro/Tops bulk prices (e.g. ginger ~60 THB/kg, turmeric ~80 THB/kg, celery ~45 THB/bunch, green apple ~120 THB/kg)
- Specialty items like ashwagandha, lion's mane, reishi powder use Lazada/iHerb Thailand prices
- Calculate cost per the exact amount used in the recipe, not per package
- suggestedPriceTHB should target 65-80% profit margin (luxury spa positioning)
- portionsPerBatch = batchSize / servingSize

Color options: emerald (calming), amber (warming/anti-inflammatory), indigo (cognitive), purple (sleep), rose (circulation), teal (immunity), cyan (hydration).

Generate 2-3 unique recipes.`

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || ''
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY env var not set" }, { status: 500 })
    }

    const body = await request.json()
    const { ingredients, goal, existingElixirs } = body

    if (!ingredients || !ingredients.length) {
      return NextResponse.json({ error: "No ingredients provided" }, { status: 400 })
    }

    // Build the prompt
    let userPrompt = `I have these ingredients available at my spa:\n${ingredients.map((i: string) => `- ${i}`).join("\n")}\n\n`

    if (goal) {
      userPrompt += `The staff wants to focus on this wellness goal: ${goal}\n\n`
    }

    if (existingElixirs?.length) {
      userPrompt += `We already have these elixirs on our menu (avoid duplicating them):\n${existingElixirs.map((e: string) => `- ${e}`).join("\n")}\n\n`
    }

    userPrompt += `Create 2-3 NEW unique therapeutic elixir recipes using primarily these available ingredients. You may suggest 1-2 extra ingredients per recipe that would enhance the formula (mark these as "extraIngredientsNeeded"). Each recipe must be scientifically backed with real research references.`

    // Call Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }] }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    })

    const text = result.response.text()

    // Parse the JSON response
    let recipes
    try {
      recipes = JSON.parse(text)
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        recipes = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("Failed to parse AI response as JSON")
      }
    }

    return NextResponse.json({
      success: true,
      recipes,
      ingredientsUsed: ingredients,
      goal: goal || "General wellness",
    })
  } catch (err: any) {
    console.error("Elixir discovery error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
