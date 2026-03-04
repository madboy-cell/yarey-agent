"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Search, Edit2, Trash2, Eye, EyeOff, Save, X, ArrowDown, ArrowUp, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirestoreCRUD } from "@/hooks/useFirestore"
import { Treatment, TreatmentVariant } from "@/types"
import { getVariants, priceRange, durationRange } from "@/lib/treatments"
import { migrateTreatmentsToVariants } from "@/lib/migrateTreatments"

interface MenuTabProps {
    treatments: Treatment[]
}

export function MenuTab({ treatments }: MenuTabProps) {
    const treatmentOps = useFirestoreCRUD("treatments")
    const [menuSearch, setMenuSearch] = useState("")
    const [menuSort, setMenuSort] = useState<{ key: 'title' | 'category' | 'price_thb', dir: 'asc' | 'desc' }>({ key: 'title', dir: 'asc' })
    const [isEditing, setIsEditing] = useState(false)
    const [currentTreatment, setCurrentTreatment] = useState<any>({})
    const [editVariants, setEditVariants] = useState<TreatmentVariant[]>([])
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [migrating, setMigrating] = useState(false)

    const filteredTreatments = treatments
        .filter(t => (t.title?.toLowerCase() || "").includes(menuSearch.toLowerCase()) || (t.category?.toLowerCase() || "").includes(menuSearch.toLowerCase()))
        .sort((a: any, b: any) => {
            const dir = menuSort.dir === 'asc' ? 1 : -1
            return a[menuSort.key] < b[menuSort.key] ? -dir : a[menuSort.key] > b[menuSort.key] ? dir : 0
        })

    // ─── Open Editor ─────────────────
    const openEditor = (t?: Treatment) => {
        if (t) {
            setCurrentTreatment(t)
            setEditVariants(getVariants(t))
        } else {
            setCurrentTreatment({})
            setEditVariants([{ duration_min: 60, price_thb: 0 }])
        }
        setIsEditing(true)
    }

    // ─── Variant Helpers ─────────────
    const addVariant = () => {
        const last = editVariants[editVariants.length - 1]
        setEditVariants([...editVariants, {
            duration_min: (last?.duration_min || 60) + 30,
            price_thb: Math.round((last?.price_thb || 0) * 1.3),
        }])
    }

    const removeVariant = (idx: number) => {
        if (editVariants.length <= 1) return
        setEditVariants(editVariants.filter((_, i) => i !== idx))
    }

    const updateVariant = (idx: number, field: keyof TreatmentVariant, value: any) => {
        setEditVariants(editVariants.map((v, i) => i === idx ? { ...v, [field]: value } : v))
    }

    // ─── Save ────────────────────────
    const saveTreatment = async () => {
        if (!currentTreatment.title) return alert("Please enter a title.")
        if (editVariants.some(v => !v.duration_min || !v.price_thb)) return alert("All variants need duration and price.")

        const sortedVariants = [...editVariants].sort((a, b) => a.duration_min - b.duration_min)
        const existing = treatments.find(t => t.id === currentTreatment.id)

        const payload = {
            title: currentTreatment.title,
            category: currentTreatment.category || "Massage",
            description: currentTreatment.description || "",
            active: existing ? existing.active : true,
            includes: currentTreatment.includes || [],
            variants: sortedVariants,
            duration_min: sortedVariants[0].duration_min,
            price_thb: sortedVariants[0].price_thb,
        }

        currentTreatment.id ? await treatmentOps.update(currentTreatment.id, payload) : await treatmentOps.add(payload)
        setIsEditing(false)
        setCurrentTreatment({})
        setEditVariants([])
    }

    const toggleActive = async (id: string) => {
        const t = treatments.find(x => x.id === id)
        if (t) await treatmentOps.update(id, { active: !t.active })
    }

    const handleMigrate = async () => {
        if (!confirm("This will merge duplicate treatments into grouped variants.\n\nExisting bookings/vouchers are NOT affected.\n\nProceed?")) return
        setMigrating(true)
        try {
            const result = await migrateTreatmentsToVariants()
            alert(`✅ Migration complete!\n\n${result.merged} groups merged\n${result.deleted} duplicates removed\n\nRefresh to see changes.`)
        } catch (err: any) {
            alert(`❌ Migration failed: ${err.message}`)
        }
        setMigrating(false)
    }

    const activeCount = treatments.filter(t => t.active).length
    const inactiveCount = treatments.filter(t => !t.active).length

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12">
            <div className="lg:col-span-8 space-y-6 order-2 lg:order-1">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-serif text-2xl text-foreground">Treatment Menu</h2>
                        <p className="text-[10px] text-foreground/30 mt-0.5">
                            {activeCount} active · {inactiveCount} inactive
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
                            <input type="text" placeholder="Search..." value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)}
                                className="pl-8 pr-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 w-44 transition-all hover:bg-white/10" />
                        </div>
                        <Button onClick={() => openEditor()} className="rounded-full px-6 bg-primary text-white hover:bg-primary/90 h-9 text-xs uppercase tracking-wider font-bold">
                            <Plus className="w-3 h-3 mr-2" /> Add New
                        </Button>
                    </div>
                </div>

                {/* Migration Banner */}
                {treatments.some(t => !t.variants || t.variants.length === 0) && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-bold text-amber-400">⚠️ Legacy Format Detected</div>
                            <div className="text-[10px] text-amber-400/60 mt-0.5">Merge duplicates into grouped variants.</div>
                        </div>
                        <Button onClick={handleMigrate} disabled={migrating} size="sm"
                            className="bg-amber-500 hover:bg-amber-600 text-black text-xs px-4 rounded-full">
                            {migrating ? "Migrating..." : "Migrate Now"}
                        </Button>
                    </div>
                )}

                {/* Table */}
                <div className="bg-[#042A40]/30 backdrop-blur-md border border-primary/10 rounded-[2rem] overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                        <thead className="bg-secondary/30 border-b border-primary/10">
                            <tr>
                                {(['title', 'category', 'price_thb'] as const).map(key => (
                                    <th key={key} className="p-4 text-[10px] uppercase tracking-widest text-foreground/40 font-bold cursor-pointer hover:text-primary transition-colors select-none"
                                        onClick={() => setMenuSort({ key, dir: menuSort.key === key && menuSort.dir === 'asc' ? 'desc' : 'asc' })}>
                                        {key === 'price_thb' ? 'Price' : key.charAt(0).toUpperCase() + key.slice(1)}
                                        {menuSort.key === key && (menuSort.dir === 'asc' ? <ArrowDown className="inline w-3 h-3 ml-1" /> : <ArrowUp className="inline w-3 h-3 ml-1" />)}
                                    </th>
                                ))}
                                <th className="p-4 text-[10px] uppercase tracking-widest text-foreground/40 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-primary/5">
                            {filteredTreatments.map(t => {
                                const variants = getVariants(t)
                                const isExpanded = expandedId === t.id
                                return (
                                    <React.Fragment key={t.id}>
                                        <tr className={`hover:bg-primary/5 transition-colors cursor-pointer ${!t.active ? "opacity-40" : ""}`}
                                            onClick={() => setExpandedId(isExpanded ? null : t.id)}>
                                            <td className="p-4 py-3">
                                                <div className="font-serif text-base text-foreground flex items-center gap-2">
                                                    {t.title}
                                                    {variants.length > 1 && (
                                                        <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase">
                                                            {variants.length} options
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-foreground/50 flex gap-2 items-center">
                                                    <span>{durationRange(t)}</span>
                                                    {isExpanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto opacity-30" />}
                                                </div>
                                            </td>
                                            <td className="p-4 py-3"><span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] uppercase tracking-wider font-bold text-foreground/70">{t.category}</span></td>
                                            <td className="p-4 py-3 font-mono text-xs text-primary/80">{priceRange(t)}</td>
                                            <td className="p-4 py-3 text-right flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title={t.active ? "Active — click to deactivate" : "Inactive — click to activate"}
                                                    onClick={() => toggleActive(t.id)}>
                                                    {t.active ? <Eye className="w-3.5 h-3.5 text-emerald-500" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEditor(t)}><Edit2 className="w-3.5 h-3.5 text-blue-500" /></Button>
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setDeleteId(t.id) }}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                                            </td>
                                        </tr>
                                        {/* Expanded Variant Rows */}
                                        {isExpanded && variants.length > 1 && variants.map((v, vi) => (
                                            <tr key={`${t.id}-v${vi}`} className="bg-primary/[0.03]">
                                                <td className="pl-12 py-2 text-[11px] text-foreground/40 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/30" />
                                                    {v.duration_min} min
                                                </td>
                                                <td className="py-2 text-[11px] text-foreground/40" />
                                                <td className="py-2 text-[11px] font-mono text-primary/60">฿{v.price_thb.toLocaleString()}</td>
                                                <td />
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                )
                            })}
                            {filteredTreatments.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-foreground/30 text-xs uppercase tracking-widest">No rituals found</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Form Panel */}
            <div className="lg:col-span-4 order-1 lg:order-2">
                <AnimatePresence>
                    {isEditing && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-card rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-primary/20 sticky top-32 backdrop-blur-md">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="font-serif text-xl">{currentTreatment.id ? "Edit Ritual" : "New Ritual"}</h3>
                                <Button variant="ghost" onClick={() => setIsEditing(false)}><X className="w-5 h-5" /></Button>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold ml-2">Title</label>
                                    <input type="text" className="w-full bg-secondary border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary placeholder:text-foreground/30" value={currentTreatment.title || ""} onChange={e => setCurrentTreatment({ ...currentTreatment, title: e.target.value })} placeholder="e.g. Deep Tissue" />
                                </div>

                                {/* Variants Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold ml-2">Duration & Price</label>
                                        <button onClick={addVariant} className="text-[10px] text-primary hover:text-primary/80 font-bold flex items-center gap-1">
                                            <Plus className="w-3 h-3" /> Add Option
                                        </button>
                                    </div>

                                    {editVariants.map((v, i) => (
                                        <div key={i} className="bg-secondary/50 border border-border/30 rounded-xl p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[9px] uppercase tracking-widest text-foreground/30 font-bold">
                                                    {editVariants.length > 1 ? `Option ${i + 1}` : "Pricing"}
                                                </span>
                                                {editVariants.length > 1 && (
                                                    <button onClick={() => removeVariant(i)} className="text-red-400 hover:text-red-300">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] text-foreground/30 ml-1">Duration (Min)</label>
                                                    <input type="number" className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                                                        value={v.duration_min || ""} onChange={e => updateVariant(i, 'duration_min', Number(e.target.value))} placeholder="60" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] text-foreground/30 ml-1">Price (THB)</label>
                                                    <input type="number" className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                                                        value={v.price_thb || ""} onChange={e => updateVariant(i, 'price_thb', Number(e.target.value))} placeholder="2500" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold ml-2">Category</label>
                                    <select className="w-full bg-secondary border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary [color-scheme:dark]" value={currentTreatment.category || "Massage"} onChange={e => setCurrentTreatment({ ...currentTreatment, category: e.target.value })}>
                                        <option value="Massage">Massage</option><option value="Nordic Zone">Nordic Zone</option><option value="Rest">Rest</option><option value="Package">Package</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold ml-2">Description</label>
                                    <textarea className="w-full bg-secondary border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary min-h-[100px] placeholder:text-foreground/30" value={currentTreatment.description || ""} onChange={e => setCurrentTreatment({ ...currentTreatment, description: e.target.value })} placeholder="Guest facing copy..." />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold ml-2">Includes (CSV)</label>
                                    <input type="text" className="w-full bg-secondary border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary placeholder:text-foreground/30" value={currentTreatment.includes?.join(", ") || ""} onChange={e => setCurrentTreatment({ ...currentTreatment, includes: e.target.value.split(",").map((s: string) => s.trim()) })} placeholder="Sauna, Tea, Scrub" />
                                </div>
                                <Button onClick={saveTreatment} className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white py-6"><Save className="w-4 h-4 mr-2" /> Save Ritual</Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Delete Confirmation */}
            <AnimatePresence>
                {deleteId && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
                        <div className="bg-card rounded-2xl p-8 border border-primary/20 max-w-sm" onClick={e => e.stopPropagation()}>
                            <h3 className="font-serif text-lg mb-4">Delete this treatment?</h3>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Cancel</Button>
                                <Button onClick={async () => { await treatmentOps.remove(deleteId); setDeleteId(null) }} className="flex-1 bg-red-500 hover:bg-red-600 text-white">Delete</Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
