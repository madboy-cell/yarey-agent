"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, X, Power, Users, Clock, Trophy, Search, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirestoreCRUD, useFirestoreCollection } from "@/hooks/useFirestore"
import { GachaMachine, GachaPrize, Treatment, Client } from "@/types"

const CAPSULE_COLORS = [
    { hex: "#ef4444", name: "Red" },
    { hex: "#f97316", name: "Orange" },
    { hex: "#eab308", name: "Yellow" },
    { hex: "#22c55e", name: "Green" },
    { hex: "#3b82f6", name: "Blue" },
    { hex: "#8b5cf6", name: "Purple" },
    { hex: "#ec4899", name: "Pink" },
    { hex: "#06b6d4", name: "Cyan" },
]

interface GachaManagerProps {
    treatments: Treatment[]
    clients: Client[]
}

const emptyPrize = (): GachaPrize => ({
    id: Math.random().toString(36).substring(2, 9),
    type: "discount",
    discountPercent: 10,
    label: "10% OFF",
    weight: 50,
    color: CAPSULE_COLORS[Math.floor(Math.random() * CAPSULE_COLORS.length)].hex,
})

export function GachaManager({ treatments, clients }: GachaManagerProps) {
    const { data: machines } = useFirestoreCollection<GachaMachine>("gacha_machines")
    const machineOps = useFirestoreCRUD("gacha_machines")

    const [isCreating, setIsCreating] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [memberSearch, setMemberSearch] = useState("")

    // Form state
    const [form, setForm] = useState({
        title: "",
        description: "",
        targetType: "all" as "all" | "specific",
        targetMemberIds: [] as string[],
        expiresAt: "",
        prizes: [emptyPrize()] as GachaPrize[],
    })

    const totalWeight = form.prizes.reduce((s, p) => s + p.weight, 0)
    const isValid = form.title && form.expiresAt && form.prizes.length >= 2 && totalWeight === 100

    // Handlers
    const addPrize = () => setForm(f => ({ ...f, prizes: [...f.prizes, emptyPrize()] }))

    const removePrize = (id: string) => setForm(f => ({ ...f, prizes: f.prizes.filter(p => p.id !== id) }))

    const updatePrize = (id: string, patch: Partial<GachaPrize>) => {
        setForm(f => ({
            ...f,
            prizes: f.prizes.map(p => {
                if (p.id !== id) return p
                const updated = { ...p, ...patch }
                // Auto-label
                if (patch.type || patch.discountPercent || patch.treatmentId) {
                    if (updated.type === "discount") {
                        updated.label = `${updated.discountPercent || 10}% OFF`
                    } else if (patch.treatmentId) {
                        const t = treatments.find(tr => tr.id === patch.treatmentId)
                        if (t) { updated.treatmentTitle = t.title; updated.label = `Free ${t.title}` }
                    }
                }
                return updated
            }),
        }))
    }

    const toggleMember = (id: string) => {
        setForm(f => ({
            ...f,
            targetMemberIds: f.targetMemberIds.includes(id)
                ? f.targetMemberIds.filter(m => m !== id)
                : [...f.targetMemberIds, id],
        }))
    }

    const handleSave = async () => {
        if (!isValid) return
        // Deactivate any existing active machine
        const activeMachine = machines.find(m => m.active)
        if (activeMachine) await machineOps.update(activeMachine.id, { active: false })

        await machineOps.add({
            title: form.title,
            description: form.description,
            targetType: form.targetType,
            targetMemberIds: form.targetType === "specific" ? form.targetMemberIds : [],
            expiresAt: new Date(form.expiresAt).toISOString(),
            prizes: form.prizes,
            active: true,
            createdAt: new Date().toISOString(),
            playedBy: {},
        })
        setIsCreating(false)
        setForm({ title: "", description: "", targetType: "all", targetMemberIds: [], expiresAt: "", prizes: [emptyPrize()] })
    }

    const toggleActive = async (m: GachaMachine) => {
        if (!m.active) {
            // Deactivate others first
            const other = machines.find(x => x.active && x.id !== m.id)
            if (other) await machineOps.update(other.id, { active: false })
        }
        await machineOps.update(m.id, { active: !m.active })
    }

    const deleteMachine = async (id: string) => {
        if (confirm("Delete this gacha machine?")) await machineOps.remove(id)
    }

    const filteredClients = useMemo(() => {
        if (!memberSearch) return clients.slice(0, 20)
        const q = memberSearch.toLowerCase()
        return clients.filter(c => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)).slice(0, 20)
    }, [clients, memberSearch])

    const activeMachine = machines.find(m => m.active)
    const sortedMachines = [...machines].sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0))

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="font-serif text-xl text-foreground">Gacha Machine</h2>
                    <p className="text-[10px] text-foreground/40 uppercase tracking-wider mt-0.5">
                        {activeMachine ? "1 machine active" : "No active machine"} · {machines.length} total
                    </p>
                </div>
                {!isCreating && (
                    <Button onClick={() => setIsCreating(true)} size="sm" className="h-9 rounded-xl bg-primary text-background hover:bg-primary/90 text-[10px] uppercase tracking-wider font-bold gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> New Machine
                    </Button>
                )}
            </div>

            {/* Create Form */}
            <AnimatePresence>
                {isCreating && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="bg-card/50 backdrop-blur-sm rounded-2xl border border-primary/20 p-5 space-y-5 overflow-hidden">
                        <div className="flex justify-between items-center">
                            <h3 className="font-serif text-lg text-primary">Create Gacha Machine</h3>
                            <button onClick={() => setIsCreating(false)}><X className="w-5 h-5 text-foreground/30" /></button>
                        </div>

                        {/* Title & Description */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-1.5 block">Machine Title *</label>
                                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    className="w-full p-3 bg-secondary border border-border/50 rounded-xl text-foreground placeholder-foreground/30 focus:outline-none focus:border-primary/50 text-sm"
                                    placeholder="e.g. Birthday Surprise" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-1.5 block">Expiration Date *</label>
                                <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                                    className="w-full p-3 bg-secondary border border-border/50 rounded-xl text-foreground focus:outline-none focus:border-primary/50 text-sm [color-scheme:dark]" />
                            </div>
                        </div>

                        {/* Target */}
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Target Members</label>
                            <div className="flex gap-2 mb-3">
                                {(["all", "specific"] as const).map(t => (
                                    <button key={t} onClick={() => setForm(f => ({ ...f, targetType: t }))}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${form.targetType === t ? "bg-primary/15 text-primary border border-primary/20" : "bg-secondary text-foreground/40 border border-border/30"}`}>
                                        {t === "all" ? "All Members" : "Specific Members"}
                                    </button>
                                ))}
                            </div>
                            {form.targetType === "specific" && (
                                <div className="bg-secondary/50 rounded-xl border border-border/30 p-3 space-y-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30" />
                                        <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 bg-card border border-border/30 rounded-lg text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:border-primary/40"
                                            placeholder="Search members..." />
                                    </div>
                                    {form.targetMemberIds.length > 0 && (
                                        <div className="text-[10px] text-primary font-bold">{form.targetMemberIds.length} selected</div>
                                    )}
                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                        {filteredClients.map(c => (
                                            <button key={c.id} onClick={() => toggleMember(c.id)}
                                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${form.targetMemberIds.includes(c.id) ? "bg-primary/10 text-primary" : "text-foreground/60 hover:bg-card/50"}`}>
                                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[8px] ${form.targetMemberIds.includes(c.id) ? "border-primary bg-primary text-background" : "border-foreground/20"}`}>
                                                    {form.targetMemberIds.includes(c.id) && "✓"}
                                                </div>
                                                <span className="font-medium">{c.name}</span>
                                                <span className="text-[10px] text-foreground/30">{c.email}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Prize Slots */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Prize Slots *</label>
                                <span className={`text-xs font-mono font-bold ${totalWeight === 100 ? "text-emerald-400" : "text-red-400"}`}>
                                    {totalWeight}/100%
                                </span>
                            </div>
                            <div className="space-y-3">
                                {form.prizes.map((prize, i) => (
                                    <div key={prize.id} className="bg-secondary/50 rounded-xl border border-border/30 p-3">
                                        <div className="flex items-start gap-3">
                                            {/* Color */}
                                            <div className="w-8 h-8 rounded-full flex-shrink-0 shadow-lg" style={{ background: prize.color }} />
                                            <div className="flex-1 space-y-2">
                                                {/* Type selector */}
                                                <div className="flex gap-2">
                                                    <select value={prize.type} onChange={e => updatePrize(prize.id, { type: e.target.value as "discount" | "treatment" })}
                                                        className="flex-1 p-2 bg-card border border-border/30 rounded-lg text-xs text-foreground focus:outline-none appearance-none">
                                                        <option value="discount">% Discount</option>
                                                        <option value="treatment">Free Treatment</option>
                                                    </select>
                                                    {prize.type === "discount" ? (
                                                        <div className="flex items-center gap-1">
                                                            <input type="number" min={5} max={100} step={5} value={prize.discountPercent || 10}
                                                                onChange={e => updatePrize(prize.id, { discountPercent: Number(e.target.value) })}
                                                                className="w-16 p-2 bg-card border border-border/30 rounded-lg text-xs text-foreground text-center focus:outline-none" />
                                                            <span className="text-xs text-foreground/40">%</span>
                                                        </div>
                                                    ) : (
                                                        <select value={prize.treatmentId || ""} onChange={e => updatePrize(prize.id, { treatmentId: e.target.value })}
                                                            className="flex-1 p-2 bg-card border border-border/30 rounded-lg text-xs text-foreground focus:outline-none appearance-none">
                                                            <option value="">Select treatment</option>
                                                            {treatments.filter(t => t.active).map(t => (
                                                                <option key={t.id} value={t.id}>{t.title}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                                {/* Weight + Color + Label */}
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1">
                                                        <input type="number" min={1} max={100} value={prize.weight}
                                                            onChange={e => updatePrize(prize.id, { weight: Number(e.target.value) })}
                                                            className="w-14 p-1.5 bg-card border border-border/30 rounded-lg text-[11px] text-foreground text-center focus:outline-none" />
                                                        <span className="text-[10px] text-foreground/30">% chance</span>
                                                    </div>
                                                    <div className="flex gap-1 ml-auto">
                                                        {CAPSULE_COLORS.map(c => (
                                                            <button key={c.hex} onClick={() => updatePrize(prize.id, { color: c.hex })}
                                                                className={`w-5 h-5 rounded-full transition-transform ${prize.color === c.hex ? "scale-125 ring-2 ring-white/30" : "opacity-50 hover:opacity-100"}`}
                                                                style={{ background: c.hex }} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="text-[10px] text-foreground/30">Label: <span className="text-foreground/60 font-medium">{prize.label}</span></div>
                                            </div>
                                            {form.prizes.length > 1 && (
                                                <button onClick={() => removePrize(prize.id)} className="p-1 text-foreground/20 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={addPrize} className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-border/40 text-foreground/30 text-xs font-bold uppercase tracking-wider hover:border-primary/30 hover:text-primary/50 transition-colors">
                                <Plus className="w-3.5 h-3.5 inline mr-1" /> Add Prize Slot
                            </button>
                        </div>

                        {/* Save */}
                        <Button onClick={handleSave} disabled={!isValid}
                            className="w-full py-5 rounded-xl bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 text-background text-sm font-bold tracking-wider disabled:opacity-30">
                            🎰 Create & Activate Machine
                        </Button>
                        {!isValid && form.prizes.length >= 1 && (
                            <p className="text-[10px] text-red-400/60 text-center">
                                {!form.title ? "Title required" : !form.expiresAt ? "Expiration required" : form.prizes.length < 2 ? "Need at least 2 prizes" : totalWeight !== 100 ? `Weights must total 100% (currently ${totalWeight}%)` : ""}
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Machine List */}
            {sortedMachines.map(m => {
                const playCount = Object.keys(m.playedBy || {}).length
                const isExpired = new Date(m.expiresAt) < new Date()
                const expanded = expandedId === m.id

                return (
                    <motion.div key={m.id} layout className={`rounded-2xl border overflow-hidden transition-colors ${m.active && !isExpired ? "bg-primary/5 border-primary/20" : "bg-card/30 border-border/20"}`}>
                        <button onClick={() => setExpandedId(expanded ? null : m.id)} className="w-full p-4 text-left flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${m.active && !isExpired ? "bg-primary/15" : "bg-foreground/5"}`}>🎰</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-foreground truncate">{m.title}</span>
                                    {m.active && !isExpired && <span className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">Active</span>}
                                    {isExpired && <span className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold">Expired</span>}
                                </div>
                                <div className="text-[10px] text-foreground/40 flex gap-3 mt-0.5">
                                    <span>{m.prizes.length} prizes</span>
                                    <span>{playCount} plays</span>
                                    <span>{m.targetType === "all" ? "All members" : `${m.targetMemberIds?.length || 0} members`}</span>
                                    <span>Exp: {new Date(m.expiresAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            {expanded ? <ChevronUp className="w-4 h-4 text-foreground/20" /> : <ChevronDown className="w-4 h-4 text-foreground/20" />}
                        </button>

                        <AnimatePresence>
                            {expanded && (
                                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                                    <div className="px-4 pb-4 space-y-3 border-t border-border/10 pt-3">
                                        {/* Prizes */}
                                        <div className="grid grid-cols-2 gap-2">
                                            {m.prizes.map(p => (
                                                <div key={p.id} className="flex items-center gap-2 bg-card/30 rounded-lg px-3 py-2">
                                                    <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-medium text-foreground truncate">{p.label}</div>
                                                        <div className="text-[9px] text-foreground/30">{p.weight}% chance</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Plays */}
                                        {playCount > 0 && (
                                            <div>
                                                <div className="text-[10px] uppercase tracking-widest text-foreground/30 font-bold mb-1.5">Play History</div>
                                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                                    {Object.entries(m.playedBy || {}).map(([memberId, play]) => {
                                                        const client = clients.find(c => c.id === memberId)
                                                        return (
                                                            <div key={memberId} className="flex items-center justify-between text-[11px] px-2 py-1.5 bg-card/20 rounded-lg">
                                                                <span className="text-foreground/60">{client?.name || memberId}</span>
                                                                <span className="text-primary/60 font-medium">{play.prizeName}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-1">
                                            {!isExpired && (
                                                <Button onClick={() => toggleActive(m)} variant="outline" size="sm"
                                                    className={`flex-1 h-9 rounded-xl text-[10px] uppercase tracking-wider font-bold gap-1.5 ${m.active ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"}`}>
                                                    <Power className="w-3.5 h-3.5" /> {m.active ? "Deactivate" : "Activate"}
                                                </Button>
                                            )}
                                            <Button onClick={() => deleteMachine(m.id)} variant="outline" size="sm"
                                                className="h-9 rounded-xl text-[10px] uppercase tracking-wider font-bold text-foreground/30 hover:text-red-400 hover:border-red-400/30 border-border/30 gap-1.5">
                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )
            })}

            {machines.length === 0 && !isCreating && (
                <div className="text-center py-16 text-foreground/20">
                    <div className="text-4xl mb-3">🎰</div>
                    <p className="text-sm italic">No gacha machines yet</p>
                    <p className="text-[10px] text-foreground/15 mt-1">Create one to engage your guests</p>
                </div>
            )}
        </div>
    )
}
