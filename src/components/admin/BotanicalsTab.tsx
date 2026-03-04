"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus, Edit2, Trash2, Save, Sparkles, X, FlaskConical,
    Clock, Beaker, ChefHat, BookOpen, Wand2, AlertTriangle,
    ChevronDown, ChevronUp, Target, Search, Loader2, Package,
    ExternalLink, GraduationCap, Leaf, Coffee, Key
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirestoreCRUD, useFirestoreCollection } from "@/hooks/useFirestore"
import { TeaCeremonyTab } from "./TeaCeremonyTab"

// ─── Types ─────────────────────────────────────────────
interface Ingredient {
    name: string
    amount: string
    role: string
    reason?: string
    estimatedCostTHB?: number
}

interface Costing {
    batchCostTHB: number
    costPerServingTHB: number
    suggestedPriceTHB: number
    marginPercent: number
    priceNote?: string
}

interface RecipeStep {
    prepTime?: string
    servingSize?: string
    batchSize?: string
    portionsPerBatch?: number
    equipment?: string[]
    steps?: string[]
    servingNotes?: string
    shelfLife?: string
}

interface ScienceRef {
    ingredient: string
    mechanism: string
    reference: string
}

interface Elixir {
    id: string
    title: string
    subtitle: string
    description: string
    benefit: string
    ingredients: string[] | Ingredient[]
    recipe?: RecipeStep
    science?: ScienceRef[]
    targetMetrics?: Record<string, string>
    contraindications?: string[]
    color: string
    active: boolean
    price?: number
    prepTime?: string
    timesServed?: number
    costing?: Costing
}

interface DiscoveredRecipe {
    title: string
    subtitle: string
    description: string
    benefit: string
    ingredients: Ingredient[]
    extraIngredientsNeeded?: Ingredient[]
    recipe: RecipeStep
    science: ScienceRef[]
    targetMetrics: Record<string, string>
    contraindications: string[]
    color: string
    costing?: Costing
}

interface BotanicalsTabProps {
    elixirs: Elixir[]
}

// ─── Constants ─────────────────────────────────────────
const SEED_ELIXIRS = [
    {
        title: "The Grounding", subtitle: "Stress Modulation",
        description: "A dense, root-heavy extraction designed to lower cortisol and anchor the nervous system.",
        ingredients: [
            { name: "Ashwagandha Root", amount: "5g", role: "Adaptogen — HPA axis modulation" },
            { name: "Celery", amount: "300g", role: "Apigenin source — anxiolytic" },
            { name: "Green Apple", amount: "1 medium", role: "Sweetener + quercetin" },
        ],
        recipe: {
            prepTime: "5 min", servingSize: "250ml", equipment: ["Cold-press juicer", "Fine mesh strainer"],
            steps: ["Wash celery and apple thoroughly", "Cold-press celery first, then apple", "Stir in ashwagandha powder until dissolved", "Strain through fine mesh", "Serve immediately over ice"],
            servingNotes: "Best 30 min before treatment. Not recommended on full stomach."
        },
        science: [
            { ingredient: "Ashwagandha", mechanism: "Reduces cortisol by 28% via HPA axis modulation", reference: "Chandrasekhar et al., 2012 — Indian J Psychol Med" },
            { ingredient: "Apigenin (Celery)", mechanism: "GABAergic anxiolytic activity, promotes calm without sedation", reference: "Salehi et al., 2019 — Molecules" },
        ],
        targetMetrics: { hrv: "increase", rhr: "decrease", cortisol: "decrease" },
        contraindications: ["Pregnancy", "Thyroid medication"],
        benefit: "Anxiety Relief", color: "from-emerald-500/20 to-emerald-900/20", active: true, price: 280, prepTime: "5 min"
    },
    {
        title: "The Flame", subtitle: "Systemic Anti-Inflammation",
        description: "Hyper-concentrated curcumin and bromelain. Reduces soft tissue inflammation immediately.",
        ingredients: [
            { name: "Turmeric Root", amount: "30g (fresh)", role: "Curcumin — COX-2 inhibitor" },
            { name: "Ginger", amount: "20g", role: "Gingerol — TNF-α suppressor" },
            { name: "Pineapple Core", amount: "100g", role: "Bromelain — proteolytic enzyme" },
            { name: "Black Pepper", amount: "Pinch", role: "Piperine — 2000% curcumin bioavailability increase" },
        ],
        recipe: {
            prepTime: "4 min", servingSize: "200ml", equipment: ["Cold-press juicer", "Mortar & pestle"],
            steps: ["Peel and slice turmeric and ginger", "Cold-press turmeric, ginger, and pineapple core", "Crack black pepper and stir into juice", "Rest 2 minutes for piperine activation", "Serve in a small glass — this is concentrated"],
            servingNotes: "Warning: stains surfaces. Serve with napkin. Best post-treatment."
        },
        science: [
            { ingredient: "Curcumin", mechanism: "Inhibits NF-κB pathway, reducing IL-6 and TNF-α", reference: "Hewlings & Kalman, 2017 — Foods" },
            { ingredient: "Piperine", mechanism: "Increases curcumin bioavailability by 2000%", reference: "Shoba et al., 1998 — Planta Med" },
        ],
        targetMetrics: { inflammation: "decrease", rhr: "decrease" },
        contraindications: ["Blood thinners", "Gallstones"],
        benefit: "Anti-Inflammation", color: "from-amber-500/20 to-amber-900/20", active: true, price: 250, prepTime: "4 min"
    },
    {
        title: "The Sedative", subtitle: "Deep Sleep Induction",
        description: "Natural melatonin and GABA support. Prepares the body for deep-wave sleep cycles.",
        ingredients: [
            { name: "Tart Cherry", amount: "200g", role: "Natural melatonin precursor" },
            { name: "Reishi Mushroom", amount: "3g (extract)", role: "GABAergic — promotes slow-wave sleep" },
            { name: "Chamomile", amount: "5g (steeped)", role: "Apigenin — benzodiazepine receptor agonist" },
        ],
        recipe: {
            prepTime: "8 min", servingSize: "250ml", equipment: ["Blender", "Tea strainer", "Small pot"],
            steps: ["Steep chamomile in 50ml hot water for 5 min", "Blend tart cherries until smooth", "Strain chamomile, combine with cherry blend", "Stir in reishi extract powder", "Serve warm or at room temperature"],
            servingNotes: "Serve 1 hour before bed. Best in evening treatment packages."
        },
        science: [
            { ingredient: "Tart Cherry", mechanism: "Contains natural melatonin — increases sleep time by 84 min", reference: "Howatson et al., 2012 — Eur J Nutrition" },
            { ingredient: "Reishi", mechanism: "Increases total sleep time and NREM sleep in animal models", reference: "Cui et al., 2012 — J Ethnopharmacol" },
        ],
        targetMetrics: { deepSleep: "increase", hrv: "increase", cortisol: "decrease" },
        contraindications: ["Pregnancy", "Autoimmune conditions"],
        benefit: "Deep Sleep", color: "from-purple-500/20 to-purple-900/20", active: true, price: 320, prepTime: "8 min"
    },
    {
        title: "The Clarity", subtitle: "Cognitive Perfusion",
        description: "Polyphenol-rich blend increasing cerebral blood flow. Clears fog, sharpens focus.",
        ingredients: [
            { name: "Lion's Mane", amount: "3g (extract)", role: "NGF stimulator — neurogenesis" },
            { name: "Beetroot", amount: "200g", role: "Nitrates → nitric oxide → cerebral blood flow" },
            { name: "Blueberry", amount: "100g", role: "Anthocyanins — neuroprotective" },
        ],
        recipe: {
            prepTime: "5 min", servingSize: "250ml", equipment: ["Cold-press juicer", "Blender"],
            steps: ["Cold-press beetroot", "Blend blueberries with 30ml water", "Combine beetroot juice and blueberry blend", "Stir in lion's mane extract", "Serve immediately — oxidation reduces efficacy"],
            servingNotes: "Best consumed 20 min before cognitive-demanding activities."
        },
        science: [
            { ingredient: "Lion's Mane", mechanism: "Stimulates NGF synthesis, supports neuroplasticity", reference: "Mori et al., 2009 — Phytother Res" },
            { ingredient: "Beetroot Nitrates", mechanism: "Increases cerebral blood flow by 16% via NO pathway", reference: "Presley et al., 2011 — Nitric Oxide" },
        ],
        targetMetrics: { hrv: "increase", cortisol: "decrease" },
        contraindications: ["Kidney stones (beetroot oxalates)"],
        benefit: "Focus", color: "from-indigo-500/20 to-indigo-900/20", active: true, price: 350, prepTime: "5 min"
    }
]

// Color mapping for benefit badges
const BENEFIT_COLORS: Record<string, string> = {
    "Anxiety Relief": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "Anti-Inflammation": "bg-amber-500/20 text-amber-400 border-amber-500/30",
    "Deep Sleep": "bg-purple-500/20 text-purple-400 border-purple-500/30",
    "Focus": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    "Recovery": "bg-rose-500/20 text-rose-400 border-rose-500/30",
    "Immunity": "bg-teal-500/20 text-teal-400 border-teal-500/30",
    "Energy": "bg-orange-500/20 text-orange-400 border-orange-500/30",
}

const METRIC_LABELS: Record<string, { label: string; icon: string }> = {
    hrv: { label: "HRV", icon: "♥" },
    rhr: { label: "Resting HR", icon: "⚡" },
    deepSleep: { label: "Deep Sleep", icon: "💤" },
    respRate: { label: "Resp Rate", icon: "🫁" },
    cortisol: { label: "Cortisol", icon: "🧠" },
    inflammation: { label: "Inflammation", icon: "🔥" },
}

const COMMON_INGREDIENTS = [
    "Turmeric", "Ginger", "Ashwagandha", "Celery", "Green Apple", "Beetroot",
    "Blueberry", "Pineapple", "Lemon", "Lime", "Cucumber", "Mint", "Spinach",
    "Kale", "Coconut Water", "Honey", "Black Pepper", "Cinnamon", "Matcha",
    "Tart Cherry", "Chamomile", "Lion's Mane", "Reishi", "Cordyceps",
    "Moringa", "Spirulina", "Wheatgrass", "Aloe Vera", "Passion Fruit",
    "Mango", "Papaya", "Banana", "Avocado", "Chia Seeds", "Flax Seeds",
    "Cacao", "Vanilla", "Rose Water", "Butterfly Pea", "Pandan", "Lemongrass",
    "Galangal", "Holy Basil", "Thai Basil"
]

// ─── Component ─────────────────────────────────────────
export function BotanicalsTab({ elixirs }: BotanicalsTabProps) {
    const elixirOps = useFirestoreCRUD("elixirs")
    const hasGeminiKey = !!process.env.GEMINI_API_KEY
    const [isEditing, setIsEditing] = useState(false)
    const [current, setCurrent] = useState<any>({})
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [filterBenefit, setFilterBenefit] = useState("")
    const [activeView, setActiveView] = useState<"menu" | "discover" | "tea">("menu")

    // Elixir Discovery state
    const [selectedIngredients, setSelectedIngredients] = useState<string[]>([])
    const [customIngredient, setCustomIngredient] = useState("")
    const [discoveryGoal, setDiscoveryGoal] = useState("")
    const [discovering, setDiscovering] = useState(false)
    const [discoveredRecipes, setDiscoveredRecipes] = useState<DiscoveredRecipe[]>([])
    const [discoveryError, setDiscoveryError] = useState("")
    const [savingIdx, setSavingIdx] = useState<number | null>(null)
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false })

    // Tea Discovery state
    const teaOps = useFirestoreCRUD("teas")
    const { data: existingTeas } = useFirestoreCollection("teas")
    const [teaTreatments, setTeaTreatments] = useState<string[]>([])
    const [teaGoal, setTeaGoal] = useState("")
    const [discoveringTea, setDiscoveringTea] = useState(false)
    const [discoveredTeas, setDiscoveredTeas] = useState<any[]>([])
    const [teaError, setTeaError] = useState("")
    const [savingTeaIdx, setSavingTeaIdx] = useState<number | null>(null)

    const showToast = (message: string) => {
        setToast({ message, visible: true })
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000)
    }

    const save = async () => {
        if (!current.title || !current.benefit) return alert("Title and Benefit are required.")
        const payload = {
            title: current.title, subtitle: current.subtitle || "", description: current.description || "",
            benefit: current.benefit || "", color: current.color || "from-emerald-500/20 to-emerald-900/20",
            ingredients: current.ingredients || [],
            recipe: current.recipe || {},
            science: current.science || [],
            targetMetrics: current.targetMetrics || {},
            contraindications: current.contraindications || [],
            price: Number(current.price) || 0,
            prepTime: current.prepTime || "",
            active: current.active ?? true,
            timesServed: current.timesServed || 0,
        }
        current.id ? await elixirOps.update(current.id, payload) : await elixirOps.add(payload)
        setIsEditing(false); setCurrent({})
    }

    const seed = async () => {
        if (!confirm("Load enhanced default elixirs with full recipes?")) return
        for (const d of SEED_ELIXIRS) await elixirOps.add(d as any)
        alert("✅ 4 Elixirs with full recipes seeded!")
    }

    const toggleIngredient = (ing: string) => {
        setSelectedIngredients(prev =>
            prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing]
        )
    }

    const addCustomIngredient = () => {
        if (customIngredient.trim() && !selectedIngredients.includes(customIngredient.trim())) {
            setSelectedIngredients(prev => [...prev, customIngredient.trim()])
            setCustomIngredient("")
        }
    }

    const discoverRecipes = async () => {
        if (selectedIngredients.length < 2) return setDiscoveryError("Select at least 2 ingredients")
        setDiscovering(true)
        setDiscoveryError("")
        setDiscoveredRecipes([])
        try {
            const res = await fetch("/api/elixir/discover", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ingredients: selectedIngredients,
                    goal: discoveryGoal || undefined,
                    existingElixirs: elixirs.map(e => e.title),
                }),
            })
            const json = await res.json()
            if (json.success) {
                // Safety: filter out any recipes that match existing titles
                const existingTitles = new Set(elixirs.map(e => e.title.toLowerCase().trim()))
                const unique = (json.recipes as DiscoveredRecipe[]).filter(
                    r => !existingTitles.has(r.title.toLowerCase().trim())
                )
                setDiscoveredRecipes(unique)
                if (unique.length < json.recipes.length) {
                    showToast(`Filtered ${json.recipes.length - unique.length} duplicate(s)`)
                }
            } else {
                setDiscoveryError(json.error || "Discovery failed")
            }
        } catch (err: any) {
            setDiscoveryError(err.message)
        }
        setDiscovering(false)
    }

    const saveDiscoveredRecipe = async (recipe: DiscoveredRecipe, idx: number) => {
        setSavingIdx(idx)
        try {
            await elixirOps.add({
                ...recipe,
                active: true,
                timesServed: 0,
                price: recipe.costing?.suggestedPriceTHB || 0,
            } as any)
            showToast(`✅ "${recipe.title}" saved to your menu!`)
            setTimeout(() => {
                setDiscoveredRecipes(prev => prev.filter((_, i) => i !== idx))
            }, 400)
        } catch {
            showToast(`❌ Failed to save "${recipe.title}"`)
        }
        setSavingIdx(null)
    }

    // Tea Discovery functions
    const toggleTeaTreatment = (t: string) => {
        setTeaTreatments(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
    }

    const discoverTeas = async () => {
        if (teaTreatments.length === 0) return setTeaError("Select at least 1 treatment")
        setDiscoveringTea(true)
        setTeaError("")
        setDiscoveredTeas([])
        try {
            const res = await fetch("/api/tea/discover", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    treatments: teaTreatments,
                    goal: teaGoal || undefined,
                    existingTeas: (existingTeas as any[]).map(t => t.name),
                }),
            })
            const json = await res.json()
            if (json.success) {
                const existingNames = new Set((existingTeas as any[]).map(t => t.name?.toLowerCase().trim()))
                const unique = json.recipes.filter((r: any) => !existingNames.has(r.name?.toLowerCase().trim()))
                setDiscoveredTeas(unique)
                if (unique.length < json.recipes.length) showToast(`Filtered ${json.recipes.length - unique.length} duplicate(s)`)
            } else {
                setTeaError(json.error || "Tea discovery failed")
            }
        } catch (err: any) {
            setTeaError(err.message)
        }
        setDiscoveringTea(false)
    }

    const saveDiscoveredTea = async (tea: any, idx: number) => {
        setSavingTeaIdx(idx)
        try {
            await teaOps.add({ ...tea, active: true } as any)
            showToast(`🍵 "${tea.name}" saved to tea menu!`)
            setTimeout(() => setDiscoveredTeas(prev => prev.filter((_, i) => i !== idx)), 400)
        } catch {
            showToast(`❌ Failed to save "${tea.name}"`)
        }
        setSavingTeaIdx(null)
    }

    // Filter elixirs
    const filtered = elixirs.filter(e => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            const ingNames = Array.isArray(e.ingredients)
                ? e.ingredients.map(i => typeof i === 'string' ? i : i.name).join(" ") : ""
            if (!e.title.toLowerCase().includes(term) && !e.benefit?.toLowerCase().includes(term) && !ingNames.toLowerCase().includes(term)) return false
        }
        if (filterBenefit && e.benefit !== filterBenefit) return false
        return true
    })

    const uniqueBenefits = [...new Set(elixirs.map(e => e.benefit).filter(Boolean))]

    // ─── Render ────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header with view toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="font-serif text-2xl text-foreground">The Apothecary</h2>
                    <p className="text-sm text-foreground/40">Botanical formulations & AI-powered discovery</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-card/50 rounded-xl border border-border/30 p-1 flex">
                        <button onClick={() => setActiveView("menu")}
                            className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-all ${activeView === "menu" ? "bg-primary text-background" : "text-foreground/40 hover:text-foreground"}`}>
                            <FlaskConical className="w-3 h-3 inline mr-1.5" />Menu
                        </button>
                        <button onClick={() => setActiveView("discover")}
                            className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-all ${activeView === "discover" ? "bg-primary text-background" : "text-foreground/40 hover:text-foreground"}`}>
                            <Wand2 className="w-3 h-3 inline mr-1.5" />Discover
                        </button>
                        <button onClick={() => setActiveView("tea")}
                            className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-all ${activeView === "tea" ? "bg-primary text-background" : "text-foreground/40 hover:text-foreground"}`}>
                            <Coffee className="w-3 h-3 inline mr-1.5" />Tea
                        </button>
                    </div>
                </div>
            </div>

            {activeView === "tea" ? (
                <TeaCeremonyTab />
            ) : activeView === "menu" ? (
                /* ═══════════════════════════════════════════
                   ELIXIR MENU VIEW
                ═══════════════════════════════════════════ */
                <div className="space-y-6">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
                            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search elixirs, ingredients..."
                                className="w-full bg-card/50 border border-border/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/50" />
                        </div>
                        <select value={filterBenefit} onChange={e => setFilterBenefit(e.target.value)}
                            className="bg-card/50 border border-border/30 rounded-xl px-4 py-2.5 text-sm text-foreground/60 focus:outline-none">
                            <option value="">All Benefits</option>
                            {uniqueBenefits.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <div className="flex gap-2">
                            {elixirs.length === 0 && (
                                <Button onClick={seed} variant="outline" className="rounded-xl border-primary/20 text-primary hover:bg-primary/10 text-xs">
                                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />Seed Recipes
                                </Button>
                            )}
                            <Button onClick={() => { setCurrent({}); setIsEditing(true) }} className="rounded-xl bg-primary text-background hover:bg-primary/90 text-xs">
                                <Plus className="w-3.5 h-3.5 mr-1.5" />Add Elixir
                            </Button>
                        </div>
                    </div>

                    {/* Elixir Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filtered.map((e) => {
                            const isExpanded = expandedId === e.id
                            const ingList = Array.isArray(e.ingredients)
                                ? e.ingredients.map(i => typeof i === 'string' ? { name: i, amount: '', role: '' } : i)
                                : []
                            const badgeClass = BENEFIT_COLORS[e.benefit] || "bg-white/10 text-foreground/60 border-white/20"

                            return (
                                <motion.div key={e.id} layout
                                    className={`bg-gradient-to-br ${e.color} backdrop-blur-sm rounded-2xl border border-border/20 overflow-hidden transition-all ${!e.active ? "opacity-40" : ""}`}>
                                    {/* Card Header */}
                                    <div className="p-5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : e.id)}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h3 className="font-serif text-xl text-foreground">{e.title}</h3>
                                                <p className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">{e.subtitle}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold border ${badgeClass}`}>
                                                    {e.benefit}
                                                </span>
                                                {isExpanded ? <ChevronUp className="w-4 h-4 text-foreground/20" /> : <ChevronDown className="w-4 h-4 text-foreground/20" />}
                                            </div>
                                        </div>
                                        <p className="text-xs text-foreground/40 mb-3">{e.description}</p>

                                        {/* Quick info row */}
                                        <div className="flex items-center gap-4 text-[10px] text-foreground/30">
                                            {e.prepTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{e.prepTime}</span>}
                                            {e.price ? <span>฿{e.price}</span> : null}
                                            {e.timesServed ? <span>{e.timesServed}× served</span> : null}
                                            <span>{ingList.length} ingredients</span>
                                        </div>

                                        {/* Ingredient tags */}
                                        <div className="flex flex-wrap gap-1 mt-3">
                                            {ingList.slice(0, 5).map(ing => (
                                                <span key={ing.name} className="px-2 py-0.5 bg-background/20 rounded text-[9px] text-foreground/40 border border-white/5">
                                                    {ing.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Expanded: Full Recipe + Science */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="border-t border-white/10 p-5 space-y-5">
                                                    {/* Ingredients with amounts */}
                                                    <div>
                                                        <h4 className="text-[10px] uppercase tracking-widest text-foreground/30 font-bold mb-2 flex items-center gap-1.5">
                                                            <Leaf className="w-3 h-3" />Ingredients
                                                        </h4>
                                                        <div className="space-y-1.5">
                                                            {ingList.map(ing => (
                                                                <div key={ing.name} className="flex items-center justify-between bg-background/10 rounded-lg px-3 py-2">
                                                                    <div>
                                                                        <span className="text-sm text-foreground/70 font-medium">{ing.name}</span>
                                                                        {ing.role && <span className="text-[10px] text-foreground/25 ml-2">— {ing.role}</span>}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-mono text-foreground/40">{ing.amount}</span>
                                                                        {ing.estimatedCostTHB && <span className="text-[9px] font-mono text-emerald-400/50">฿{ing.estimatedCostTHB}</span>}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Recipe steps */}
                                                    {e.recipe?.steps && (
                                                        <div>
                                                            <h4 className="text-[10px] uppercase tracking-widest text-foreground/30 font-bold mb-2 flex items-center gap-1.5">
                                                                <ChefHat className="w-3 h-3" />Preparation
                                                            </h4>
                                                            {e.recipe.equipment && (
                                                                <div className="flex gap-1.5 mb-2">
                                                                    {e.recipe.equipment.map(eq => (
                                                                        <span key={eq} className="px-2 py-0.5 bg-primary/10 text-primary/60 rounded text-[9px]">{eq}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <ol className="space-y-1.5">
                                                                {e.recipe.steps.map((step: string, i: number) => (
                                                                    <li key={i} className="flex gap-2 text-xs text-foreground/50">
                                                                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary/60 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">{i + 1}</span>
                                                                        <span className="pt-0.5">{step}</span>
                                                                    </li>
                                                                ))}
                                                            </ol>
                                                            {e.recipe.servingNotes && (
                                                                <div className="mt-2 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 flex items-start gap-2">
                                                                    <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                                                                    <p className="text-[10px] text-amber-300/60">{e.recipe.servingNotes}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Target metrics */}
                                                    {e.targetMetrics && Object.keys(e.targetMetrics).length > 0 && (
                                                        <div>
                                                            <h4 className="text-[10px] uppercase tracking-widest text-foreground/30 font-bold mb-2 flex items-center gap-1.5">
                                                                <Target className="w-3 h-3" />Biometric Targets
                                                            </h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {Object.entries(e.targetMetrics).map(([key, direction]) => {
                                                                    const info = METRIC_LABELS[key] || { label: key, icon: "📊" }
                                                                    return (
                                                                        <span key={key} className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${direction === "increase" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
                                                                            {info.icon} {info.label} {direction === "increase" ? "↑" : "↓"}
                                                                        </span>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Science references */}
                                                    {e.science && e.science.length > 0 && (
                                                        <div>
                                                            <h4 className="text-[10px] uppercase tracking-widest text-foreground/30 font-bold mb-2 flex items-center gap-1.5">
                                                                <GraduationCap className="w-3 h-3" />Scientific Evidence
                                                            </h4>
                                                            <div className="space-y-2">
                                                                {e.science.map((ref, i) => (
                                                                    <div key={i} className="bg-background/10 rounded-lg p-3">
                                                                        <p className="text-xs text-foreground/50"><strong className="text-foreground/70">{ref.ingredient}</strong> — {ref.mechanism}</p>
                                                                        <p className="text-[10px] text-foreground/25 mt-1 italic">📎 {ref.reference}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Contraindications */}
                                                    {e.contraindications && e.contraindications.length > 0 && (
                                                        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                                            <p className="text-[10px] font-bold text-red-400/60 uppercase tracking-wider mb-1">⚠ Contraindications</p>
                                                            <p className="text-xs text-red-300/50">{e.contraindications.join(" · ")}</p>
                                                        </div>
                                                    )}

                                                    {/* Cost Analysis */}
                                                    {e.costing && (
                                                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                                                            <h4 className="text-[10px] uppercase tracking-widest text-emerald-400/60 font-bold mb-3">💰 Cost Analysis</h4>
                                                            <div className="grid grid-cols-4 gap-3">
                                                                <div className="text-center">
                                                                    <div className="text-lg font-serif text-emerald-400">฿{e.costing.batchCostTHB}</div>
                                                                    <div className="text-[9px] text-foreground/25">Batch Cost</div>
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className="text-lg font-serif text-foreground/60">฿{e.costing.costPerServingTHB}</div>
                                                                    <div className="text-[9px] text-foreground/25">Per Serving</div>
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className="text-lg font-serif text-primary">฿{e.costing.suggestedPriceTHB}</div>
                                                                    <div className="text-[9px] text-foreground/25">Sell Price</div>
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className="text-lg font-serif text-amber-400">{e.costing.marginPercent}%</div>
                                                                    <div className="text-[9px] text-foreground/25">Margin</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex gap-2 pt-2 border-t border-white/5">
                                                        <Button variant="ghost" size="sm"
                                                            onClick={async () => {
                                                                await elixirOps.update(e.id, { timesServed: (e.timesServed || 0) + 1 })
                                                                showToast(`🍵 "${e.title}" served! (${(e.timesServed || 0) + 1} total)`)
                                                            }}
                                                            className="text-[10px] text-emerald-400/50 hover:text-emerald-400 hover:bg-emerald-500/10">
                                                            <ChefHat className="w-3 h-3 mr-1" />Served
                                                        </Button>
                                                        <Button variant="ghost" size="sm"
                                                            onClick={() => window.open(`/prep/${e.id}`, '_blank')}
                                                            className="text-[10px] text-foreground/30 hover:text-primary">
                                                            <BookOpen className="w-3 h-3 mr-1" />Prep View
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => { setCurrent(e); setIsEditing(true) }}
                                                            className="text-[10px] text-foreground/30 hover:text-primary">
                                                            <Edit2 className="w-3 h-3 mr-1" />Edit
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(e.id)}
                                                            className="text-[10px] text-foreground/30 hover:text-red-400">
                                                            <Trash2 className="w-3 h-3 mr-1" />Delete
                                                        </Button>
                                                        <Button variant="ghost" size="sm"
                                                            onClick={() => window.open(`/elixir/${e.id}`, '_blank')}
                                                            className="text-[10px] text-foreground/30 hover:text-amber-400 ml-auto">
                                                            <ExternalLink className="w-3 h-3 mr-1" />Guest View
                                                        </Button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )
                        })}
                    </div>

                    {filtered.length === 0 && (
                        <div className="text-center py-12 text-foreground/20">
                            <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">{searchTerm ? "No elixirs match your search" : "No elixirs yet — click 'Seed Recipes' to get started"}</p>
                        </div>
                    )}
                </div>
            ) : (
                /* ═══════════════════════════════════════════
                   AI DISCOVERY VIEW
                ═══════════════════════════════════════════ */
                <div className="space-y-6">
                    {!hasGeminiKey ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
                                <Key className="w-7 h-7 text-amber-400/60" />
                            </div>
                            <h3 className="font-serif text-xl text-foreground mb-2">Gemini API Key Required</h3>
                            <p className="text-sm text-foreground/30 max-w-sm mb-6">AI-powered elixir discovery requires a Google Gemini API key. Add GEMINI_API_KEY to your .env.production and redeploy.</p>
                        </div>
                    ) : (
                        <>
                            {/* Ingredient selector */}
                            <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/30 p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Package className="w-5 h-5 text-primary/60" />
                                    <h3 className="font-serif text-lg text-foreground">What&apos;s in Stock?</h3>
                                </div>
                                <p className="text-xs text-foreground/30 mb-4">Select the ingredients you currently have available. The AI will create new recipes using what you have.</p>

                                {/* Quick select grid */}
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                    {COMMON_INGREDIENTS.map(ing => (
                                        <button key={ing} onClick={() => toggleIngredient(ing)}
                                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${selectedIngredients.includes(ing)
                                                ? "bg-primary/20 text-primary border-primary/40"
                                                : "bg-card/30 text-foreground/30 border-border/10 hover:border-primary/20 hover:text-foreground/50"}`}>
                                            {ing}
                                        </button>
                                    ))}
                                </div>

                                {/* Custom ingredient */}
                                <div className="flex gap-2 mb-4">
                                    <input value={customIngredient} onChange={e => setCustomIngredient(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && addCustomIngredient()}
                                        placeholder="Add custom ingredient..."
                                        className="flex-1 bg-background/50 border border-border/20 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-foreground/15 focus:outline-none focus:border-primary/40" />
                                    <Button onClick={addCustomIngredient} variant="outline" size="sm" className="rounded-xl border-border/20 text-xs">
                                        <Plus className="w-3 h-3" />
                                    </Button>
                                </div>

                                {/* Selected count */}
                                {selectedIngredients.length > 0 && (
                                    <div className="bg-primary/5 rounded-xl p-3 mb-4 flex items-center justify-between">
                                        <span className="text-xs text-primary/60"><strong>{selectedIngredients.length}</strong> ingredients selected</span>
                                        <button onClick={() => setSelectedIngredients([])} className="text-[10px] text-foreground/20 hover:text-red-400">Clear all</button>
                                    </div>
                                )}

                                {/* Wellness goal */}
                                <div className="mb-4">
                                    <label className="text-[10px] uppercase tracking-wider text-foreground/30 font-bold mb-1.5 block">Target Benefit (optional)</label>
                                    <select value={discoveryGoal} onChange={e => setDiscoveryGoal(e.target.value)}
                                        className="w-full bg-background/50 border border-border/20 rounded-xl px-3 py-2.5 text-sm text-foreground/60 focus:outline-none">
                                        <option value="">Any wellness benefit</option>
                                        <option value="Deep Sleep">Deep Sleep & Recovery</option>
                                        <option value="Anxiety Relief">Stress & Anxiety Relief</option>
                                        <option value="Anti-Inflammation">Anti-Inflammation</option>
                                        <option value="Focus">Focus & Cognitive</option>
                                        <option value="Energy">Energy & Vitality</option>
                                        <option value="Immunity">Immunity</option>
                                        <option value="Detox">Detox & Cleansing</option>
                                    </select>
                                </div>

                                {/* Generate button */}
                                <Button onClick={discoverRecipes} disabled={discovering || selectedIngredients.length < 2}
                                    className="w-full rounded-xl bg-gradient-to-r from-primary to-emerald-600 text-background py-6 text-sm font-bold hover:opacity-90 transition-opacity">
                                    {discovering ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating recipes...</>
                                    ) : (
                                        <><Wand2 className="w-4 h-4 mr-2" />Discover New Recipes</>
                                    )}
                                </Button>

                                {discoveryError && (
                                    <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400">{discoveryError}</div>
                                )}
                            </div>

                            {/* Discovered recipes */}
                            {discoveredRecipes.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="w-5 h-5 text-amber-400" />
                                        <h3 className="font-serif text-lg text-foreground">AI-Generated Recipes</h3>
                                        <span className="text-[10px] text-foreground/20 ml-auto">Powered by Gemini</span>
                                    </div>

                                    {discoveredRecipes.map((recipe, idx) => (
                                        <motion.div key={idx}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.15 }}
                                            className={`bg-gradient-to-br ${recipe.color || "from-emerald-500/20 to-emerald-900/20"} backdrop-blur-sm rounded-2xl border border-border/20 p-5 space-y-4`}>

                                            {/* Header */}
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="font-serif text-xl text-foreground">{recipe.title}</h3>
                                                    <p className="text-[10px] uppercase tracking-widest text-foreground/40">{recipe.subtitle}</p>
                                                    <p className="text-xs text-foreground/35 mt-1">{recipe.description}</p>
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-full text-[9px] uppercase font-bold border ${BENEFIT_COLORS[recipe.benefit] || "bg-white/10 text-foreground/60 border-white/20"}`}>
                                                    {recipe.benefit}
                                                </span>
                                            </div>

                                            {/* Ingredients */}
                                            <div>
                                                <h4 className="text-[10px] uppercase tracking-widest text-foreground/30 font-bold mb-2">
                                                    <Leaf className="w-3 h-3 inline mr-1" />Ingredients
                                                </h4>
                                                <div className="space-y-1">
                                                    {recipe.ingredients?.map((ing, i) => (
                                                        <div key={i} className="flex items-center justify-between bg-background/10 rounded-lg px-3 py-2">
                                                            <div>
                                                                <span className="text-sm text-foreground/70">{ing.name}</span>
                                                                <span className="text-[10px] text-foreground/25 ml-2">— {ing.role}</span>
                                                            </div>
                                                            <span className="text-xs font-mono text-foreground/40">{ing.amount}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {recipe.extraIngredientsNeeded && recipe.extraIngredientsNeeded.length > 0 && (
                                                    <div className="mt-2 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                                                        <p className="text-[10px] font-bold text-amber-400/60 uppercase mb-1">+ Extra Ingredients Needed</p>
                                                        {recipe.extraIngredientsNeeded.map((ing, i) => (
                                                            <div key={i} className="flex items-center justify-between mt-1">
                                                                <span className="text-xs text-amber-300/50">{ing.name} — {ing.reason}</span>
                                                                <span className="text-[10px] font-mono text-amber-400/40">{ing.amount}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Recipe */}
                                            {recipe.recipe?.steps && (
                                                <div>
                                                    <h4 className="text-[10px] uppercase tracking-widest text-foreground/30 font-bold mb-2">
                                                        <ChefHat className="w-3 h-3 inline mr-1" />Preparation ({recipe.recipe.prepTime})
                                                    </h4>
                                                    <ol className="space-y-1">
                                                        {recipe.recipe.steps.map((step, i) => (
                                                            <li key={i} className="flex gap-2 text-xs text-foreground/40">
                                                                <span className="w-4 h-4 rounded-full bg-primary/10 text-primary/60 flex items-center justify-center flex-shrink-0 text-[9px] font-bold">{i + 1}</span>
                                                                {step}
                                                            </li>
                                                        ))}
                                                    </ol>
                                                </div>
                                            )}

                                            {/* Biometric targets */}
                                            {recipe.targetMetrics && (
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries(recipe.targetMetrics).map(([key, dir]) => {
                                                        const info = METRIC_LABELS[key] || { label: key, icon: "📊" }
                                                        return (
                                                            <span key={key} className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${dir === "increase" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
                                                                {info.icon} {info.label} {dir === "increase" ? "↑" : "↓"}
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                            )}

                                            {/* Science */}
                                            {recipe.science && recipe.science.length > 0 && (
                                                <div>
                                                    <h4 className="text-[10px] uppercase tracking-widest text-foreground/30 font-bold mb-2">
                                                        <GraduationCap className="w-3 h-3 inline mr-1" />Research Evidence
                                                    </h4>
                                                    {recipe.science.map((ref, i) => (
                                                        <div key={i} className="bg-background/10 rounded-lg p-2.5 mb-1.5">
                                                            <p className="text-[11px] text-foreground/45"><strong className="text-foreground/60">{ref.ingredient}:</strong> {ref.mechanism}</p>
                                                            <p className="text-[9px] text-foreground/20 italic mt-0.5">📎 {ref.reference}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Cost Analysis */}
                                            {recipe.costing && (
                                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                                                    <h4 className="text-[10px] uppercase tracking-widest text-emerald-400/60 font-bold mb-3 flex items-center gap-1.5">
                                                        💰 Cost Analysis
                                                    </h4>
                                                    <div className="grid grid-cols-4 gap-3 mb-2">
                                                        <div className="text-center">
                                                            <div className="text-lg font-serif text-emerald-400">฿{recipe.costing.batchCostTHB}</div>
                                                            <div className="text-[9px] text-foreground/25">Batch Cost</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-lg font-serif text-foreground/60">฿{recipe.costing.costPerServingTHB}</div>
                                                            <div className="text-[9px] text-foreground/25">Per Serving</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-lg font-serif text-primary">฿{recipe.costing.suggestedPriceTHB}</div>
                                                            <div className="text-[9px] text-foreground/25">Sell Price</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-lg font-serif text-amber-400">{recipe.costing.marginPercent}%</div>
                                                            <div className="text-[9px] text-foreground/25">Margin</div>
                                                        </div>
                                                    </div>
                                                    {recipe.recipe?.portionsPerBatch && (
                                                        <p className="text-[10px] text-foreground/25 text-center">📦 {recipe.recipe.portionsPerBatch} servings per batch ({recipe.recipe.batchSize})</p>
                                                    )}
                                                    {recipe.costing.priceNote && (
                                                        <p className="text-[9px] text-foreground/15 text-center mt-1 italic">{recipe.costing.priceNote}</p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Contraindications */}
                                            {recipe.contraindications?.length > 0 && (
                                                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-2.5">
                                                    <p className="text-[10px] text-red-400/50">⚠ {recipe.contraindications.join(" · ")}</p>
                                                </div>
                                            )}

                                            {/* Save button */}
                                            <div className="pt-2 border-t border-white/5">
                                                <Button onClick={() => saveDiscoveredRecipe(recipe, idx)}
                                                    disabled={savingIdx === idx}
                                                    className={`rounded-xl text-xs transition-all ${savingIdx === idx ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/20 hover:bg-primary/30 text-primary'}`}>
                                                    {savingIdx === idx ? (
                                                        <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Saving...</>
                                                    ) : (
                                                        <><Save className="w-3 h-3 mr-1.5" />Save to Menu</>
                                                    )}
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                            {/* ═══════════════════════════════════════════
                       TEA DISCOVERY SECTION
                    ═══════════════════════════════════════════ */}
                            <div className="border-t border-border/20 pt-6">
                                <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/30 p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Coffee className="w-5 h-5 text-primary/60" />
                                        <h3 className="font-serif text-lg text-foreground">Tea Discovery</h3>
                                    </div>
                                    <p className="text-xs text-foreground/30 mb-4">Select treatments to pair with — AI will create unique post-treatment tea recipes.</p>

                                    {/* Treatment selector */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {[
                                            { key: "Massage", icon: "✋" }, { key: "Deep Tissue", icon: "💪" },
                                            { key: "Ice Bath", icon: "🧊" }, { key: "Contrast", icon: "🔥" },
                                            { key: "Craniosacral", icon: "🧠" }, { key: "Sound", icon: "🔔" },
                                            { key: "Red Light", icon: "🔴" }, { key: "Evening", icon: "🌙" },
                                            { key: "Morning", icon: "☀️" },
                                        ].map(t => (
                                            <button key={t.key} onClick={() => toggleTeaTreatment(t.key)}
                                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold border transition-all ${teaTreatments.includes(t.key)
                                                    ? "bg-primary/20 text-primary border-primary/40"
                                                    : "bg-card/30 text-foreground/30 border-border/10 hover:border-primary/20"}`}>
                                                <span>{t.icon}</span>{t.key}
                                            </button>
                                        ))}
                                    </div>

                                    {teaTreatments.length > 0 && (
                                        <div className="bg-primary/5 rounded-xl p-3 mb-4 flex items-center justify-between">
                                            <span className="text-xs text-primary/60"><strong>{teaTreatments.length}</strong> treatment{teaTreatments.length > 1 ? 's' : ''} selected</span>
                                            <button onClick={() => setTeaTreatments([])} className="text-[10px] text-foreground/20 hover:text-red-400">Clear</button>
                                        </div>
                                    )}

                                    {/* Tea wellness goal */}
                                    <div className="mb-4">
                                        <label className="text-[10px] uppercase tracking-wider text-foreground/30 font-bold mb-1.5 block">Tea benefit focus (optional)</label>
                                        <select value={teaGoal} onChange={e => setTeaGoal(e.target.value)}
                                            className="w-full bg-background/50 border border-border/20 rounded-xl px-3 py-2.5 text-sm text-foreground/60 focus:outline-none">
                                            <option value="">Any benefit</option>
                                            <option value="Stress Relief">Stress Relief</option>
                                            <option value="Recovery">Recovery & Muscle Repair</option>
                                            <option value="Deep Sleep">Deep Sleep</option>
                                            <option value="Anti-Inflammation">Anti-Inflammation</option>
                                            <option value="Focus">Focus & Clarity</option>
                                            <option value="Circulation">Circulation</option>
                                            <option value="Digestive">Digestive</option>
                                            <option value="Immunity">Immunity</option>
                                        </select>
                                    </div>

                                    <Button onClick={discoverTeas} disabled={discoveringTea || teaTreatments.length === 0}
                                        className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-primary text-background py-6 text-sm font-bold hover:opacity-90 transition-opacity">
                                        {discoveringTea ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Brewing ideas...</>
                                        ) : (
                                            <><Wand2 className="w-4 h-4 mr-2" />Discover New Teas</>
                                        )}
                                    </Button>

                                    {teaError && (
                                        <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400">{teaError}</div>
                                    )}
                                </div>

                                {/* Discovered teas */}
                                {discoveredTeas.length > 0 && (
                                    <div className="space-y-4 mt-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Sparkles className="w-5 h-5 text-amber-400" />
                                            <h3 className="font-serif text-lg text-foreground">AI-Discovered Teas</h3>
                                        </div>
                                        {discoveredTeas.map((tea, i) => (
                                            <motion.div key={i}
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className={`bg-gradient-to-br ${tea.color || 'from-amber-500/15 to-amber-900/15'} backdrop-blur-sm rounded-2xl border border-border/20 p-5`}>
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <h4 className="font-serif text-xl text-foreground">{tea.name}</h4>
                                                        <p className="text-[10px] uppercase tracking-widest text-foreground/25 font-bold">{tea.type} · {tea.origin}</p>
                                                    </div>
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold border bg-primary/10 text-primary border-primary/20">
                                                        {tea.benefit}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-foreground/30 mb-3">{tea.description}</p>

                                                {/* Brewing quick info */}
                                                <div className="grid grid-cols-3 gap-2 mb-3">
                                                    <div className="bg-background/20 rounded-lg p-2 text-center">
                                                        <p className="text-sm font-serif text-foreground/50">{tea.brewing?.temperature}</p>
                                                        <p className="text-[7px] text-foreground/15">Temp</p>
                                                    </div>
                                                    <div className="bg-background/20 rounded-lg p-2 text-center">
                                                        <p className="text-sm font-serif text-foreground/50">{tea.brewing?.steepTime}</p>
                                                        <p className="text-[7px] text-foreground/15">Steep</p>
                                                    </div>
                                                    <div className="bg-background/20 rounded-lg p-2 text-center">
                                                        <p className="text-sm font-serif text-foreground/50">{tea.brewing?.portions}</p>
                                                        <p className="text-[7px] text-foreground/15">Portions</p>
                                                    </div>
                                                </div>

                                                {/* Ingredients */}
                                                <div className="mb-3">
                                                    {tea.ingredients?.map((ing: any, j: number) => (
                                                        <div key={j} className="flex justify-between py-1 border-b border-white/[0.04] text-xs">
                                                            <span className="text-foreground/40">{ing.name} <span className="text-foreground/15">— {ing.role}</span></span>
                                                            <span className="text-primary/40 font-serif">{ing.amount}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Best after */}
                                                <div className="flex flex-wrap gap-1 mb-3">
                                                    {tea.bestAfter?.map((t: string) => (
                                                        <span key={t} className="px-2 py-0.5 bg-primary/5 text-primary/30 rounded text-[8px] uppercase tracking-wider border border-primary/10">{t}</span>
                                                    ))}
                                                </div>

                                                {/* Science */}
                                                {tea.science?.length > 0 && (
                                                    <div className="mb-3 space-y-1">
                                                        {tea.science.map((ref: any, j: number) => (
                                                            <div key={j} className="border-l-2 border-primary/10 pl-2">
                                                                <p className="text-[10px] text-foreground/25"><strong className="text-foreground/35">{ref.ingredient}</strong> — {ref.mechanism}</p>
                                                                <p className="text-[8px] text-foreground/10 italic">{ref.reference}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Save button */}
                                                <Button onClick={() => saveDiscoveredTea(tea, i)}
                                                    disabled={savingTeaIdx === i}
                                                    className="w-full rounded-xl bg-primary/20 text-primary hover:bg-primary/30 mt-2">
                                                    {savingTeaIdx === i ? (
                                                        <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Saving...</>
                                                    ) : (
                                                        <><Save className="w-3 h-3 mr-1.5" />Save to Tea Menu</>
                                                    )}
                                                </Button>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Edit Form (Slide-in) */}
            <AnimatePresence>
                {isEditing && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-lg bg-[#0c2627] border border-white/10 rounded-2xl p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-serif text-xl">{current.id ? "Edit Elixir" : "New Elixir"}</h3>
                                <Button variant="ghost" onClick={() => setIsEditing(false)}><X className="w-5 h-5" /></Button>
                            </div>
                            <div className="space-y-4">
                                <input placeholder="Title" value={current.title || ""} onChange={e => setCurrent({ ...current, title: e.target.value })}
                                    className="w-full bg-background/50 border border-border/20 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/40" />
                                <input placeholder="Subtitle" value={current.subtitle || ""} onChange={e => setCurrent({ ...current, subtitle: e.target.value })}
                                    className="w-full bg-background/50 border border-border/20 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/40" />
                                <textarea placeholder="Description" value={current.description || ""} onChange={e => setCurrent({ ...current, description: e.target.value })}
                                    className="w-full bg-background/50 border border-border/20 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/40 min-h-[80px]" />
                                <div className="grid grid-cols-2 gap-3">
                                    <input placeholder="Benefit (e.g. Focus)" value={current.benefit || ""} onChange={e => setCurrent({ ...current, benefit: e.target.value })}
                                        className="bg-background/50 border border-border/20 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/40" />
                                    <input placeholder="Price (THB)" type="number" value={current.price || ""} onChange={e => setCurrent({ ...current, price: Number(e.target.value) })}
                                        className="bg-background/50 border border-border/20 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/40" />
                                </div>
                                <input placeholder="Prep Time (e.g. 5 min)" value={current.prepTime || ""} onChange={e => setCurrent({ ...current, prepTime: e.target.value })}
                                    className="w-full bg-background/50 border border-border/20 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/40" />
                                <div className="flex gap-3 pt-2">
                                    <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 rounded-xl">Cancel</Button>
                                    <Button onClick={save} className="flex-1 rounded-xl bg-primary text-background"><Save className="w-4 h-4 mr-2" />Save</Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete confirmation */}
            <AnimatePresence>
                {deleteId && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                        onClick={() => setDeleteId(null)}>
                        <div className="bg-card rounded-2xl p-8 border border-primary/20 max-w-sm" onClick={e => e.stopPropagation()}>
                            <h3 className="font-serif text-lg mb-4">Delete this elixir?</h3>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Cancel</Button>
                                <Button onClick={async () => { await elixirOps.remove(deleteId); setDeleteId(null) }} className="flex-1 bg-red-500 hover:bg-red-600 text-white">Delete</Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast notification */}
            <AnimatePresence>
                {toast.visible && (
                    <motion.div
                        initial={{ opacity: 0, y: 40, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3.5 bg-[#0c2627] border border-primary/30 rounded-2xl shadow-2xl shadow-black/50 backdrop-blur-xl"
                    >
                        <p className="text-sm text-foreground font-medium whitespace-nowrap">{toast.message}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
