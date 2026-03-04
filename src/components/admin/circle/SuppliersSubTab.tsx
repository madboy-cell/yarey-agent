"use client"

import { useState, useMemo } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus, Search, Phone, Mail, MessageCircle, X, Trash2,
    AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirestoreCollection, useFirestoreCRUD } from "@/hooks/useFirestore"
import { orderBy } from "firebase/firestore"
import { CircleSupplier } from "@/types"

type Supplier = CircleSupplier

const EXPENSE_CATEGORIES = ["Supplies", "Utilities", "Maintenance", "Food & Beverage", "Equipment", "Cleaning", "Other"]

interface Props { expenses: any[] }

export const SuppliersSubTab = ({ expenses }: Props) => {
    const { data: suppliers } = useFirestoreCollection<Supplier>("circle_suppliers", [orderBy("name")])
    const supplierOps = useFirestoreCRUD("circle_suppliers")
    const expenseOps = useFirestoreCRUD("expenses")

    const [searchTerm, setSearchTerm] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<Supplier | null>(null)
    const [selected, setSelected] = useState<Supplier | null>(null)

    const filtered = useMemo(() => suppliers.filter(s =>
        !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.phone.includes(searchTerm)
    ), [suppliers, searchTerm])


    // Contract expiring within 30 days
    const expiringContracts = useMemo(() => suppliers.filter(s => {
        if (!s.contractEnd || s.status === "inactive") return false
        const daysLeft = Math.floor((new Date(s.contractEnd).getTime() - Date.now()) / 86400000)
        return daysLeft >= 0 && daysLeft <= 30
    }), [suppliers])

    // Total monthly cost
    const totalMonthlyCost = useMemo(() =>
        suppliers.filter(s => s.status === "active").reduce((sum, s) => sum + (s.costType === "monthly" ? s.costAmount : s.costAmount * 30), 0)
        , [suppliers])

    const handleSave = async (data: Partial<Supplier>) => {
        if (editing?.id) {
            await supplierOps.update(editing.id, data)
        } else {
            await supplierOps.add({ ...data, createdAt: new Date().toISOString() })
        }
        // Auto-create recurring expense if active
        if (data.status === "active" && data.costAmount && data.costAmount > 0) {
            const monthStr = new Date().toISOString().slice(0, 7)
            const existingExpense = expenses.find(e => e.title === `Supplier: ${data.name}` && e.month === monthStr)
            if (!existingExpense) {
                await expenseOps.add({
                    month: monthStr,
                    title: `Supplier: ${data.name}`,
                    amount: data.costType === "monthly" ? data.costAmount : data.costAmount * 30,
                    category: data.category || "Supplies",
                })
            }
        }
        setShowForm(false)
        setEditing(null)
    }

    const handleDelete = async (id: string) => {
        if (confirm("Delete this supplier?")) {
            await supplierOps.remove(id)
            setSelected(null)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="font-serif text-xl text-foreground mb-1">Suppliers</h3>
                    <p className="text-sm text-foreground/50">
                        {suppliers.filter(s => s.status === "active").length} active · ฿{totalMonthlyCost.toLocaleString()}/mo total cost
                    </p>
                </div>
                <Button onClick={() => { setEditing(null); setShowForm(true) }} size="sm"
                    className="h-9 rounded-xl bg-primary text-background hover:bg-primary/90 text-[10px] font-bold uppercase tracking-wider gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Add Supplier
                </Button>
            </div>

            {/* Expiring contract warning */}
            {expiringContracts.length > 0 && (
                <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-xs text-amber-300/80">
                            <strong>{expiringContracts.length}</strong> contract{expiringContracts.length > 1 ? "s" : ""} expiring within 30 days:
                            {" "}{expiringContracts.map(s => s.name).join(", ")}
                        </p>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                <input type="text" placeholder="Search suppliers..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-card/30 border border-border/30 rounded-xl py-3 pl-12 pr-4 text-foreground placeholder-foreground/20 focus:outline-none focus:border-primary/50 text-sm" />
            </div>

            {/* Mobile Cards */}
            <div className="space-y-3 md:hidden">
                {filtered.map(s => (
                    <div key={s.id} onClick={() => setSelected(s)} className="bg-card/30 border border-border/20 rounded-2xl p-4 active:bg-card/60 transition-colors cursor-pointer">
                        <div className="flex justify-between items-start mb-2">
                            <div className="font-serif text-base text-foreground">{s.name}</div>
                            <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-lg ${s.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-card/50 text-foreground/30"}`}>{s.status}</span>
                        </div>
                        <div className="flex gap-4 mt-2 items-end text-xs">
                            <div><div className="text-[9px] text-foreground/30 uppercase">Cost</div><div className="font-mono text-red-400">฿{s.costAmount.toLocaleString()}/{s.costType === "daily" ? "day" : "mo"}</div></div>
                            <div><div className="text-[9px] text-foreground/30 uppercase">Category</div><div className="text-foreground/60">{s.category}</div></div>
                            <div><div className="text-[9px] text-foreground/30 uppercase">Priority</div><div className="text-foreground/60 capitalize">{s.priority}</div></div>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && <div className="text-center py-12 text-foreground/30 italic text-sm">No suppliers yet.</div>}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-card/20 backdrop-blur-md border border-border/20 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="bg-card/60 border-b border-border/20 sticky top-0 backdrop-blur-md z-10">
                            <tr>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Supplier</th>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Contact</th>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Cost</th>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Category</th>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Priority</th>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Contract</th>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/10">
                            {filtered.map(s => {
                                const contractDays = s.contractEnd ? Math.floor((new Date(s.contractEnd).getTime() - Date.now()) / 86400000) : null
                                return (
                                    <tr key={s.id} onClick={() => setSelected(s)} className="hover:bg-primary/5 transition-colors cursor-pointer group">
                                        <td className="p-5">
                                            <div className="font-serif text-base text-foreground group-hover:text-primary transition-colors">{s.name}</div>
                                            {s.contactPerson && <div className="text-[10px] text-foreground/30">{s.contactPerson}</div>}
                                        </td>
                                        <td className="p-5 space-y-1">
                                            <div className="flex items-center gap-2 text-sm text-foreground/50"><Phone className="w-3 h-3" /> {s.phone}</div>
                                            {s.email && <div className="flex items-center gap-2 text-sm text-foreground/50"><Mail className="w-3 h-3" /> {s.email}</div>}
                                        </td>
                                        <td className="p-5">
                                            <div className="font-mono text-red-400">฿{s.costAmount.toLocaleString()}</div>
                                            <div className="text-[10px] text-foreground/30">/{s.costType === "daily" ? "day" : "month"}</div>
                                        </td>
                                        <td className="p-5 text-sm text-foreground/50">{s.category}</td>
                                        <td className="p-5">
                                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md ${s.priority === "primary" ? "bg-blue-500/10 text-blue-400" : s.priority === "backup" ? "bg-orange-500/10 text-orange-400" : "bg-card/50 text-foreground/30"}`}>{s.priority}</span>
                                        </td>
                                        <td className="p-5">
                                            {s.contractEnd ? (
                                                <div className={`text-xs ${contractDays !== null && contractDays <= 30 ? "text-amber-400" : "text-foreground/40"}`}>
                                                    {contractDays !== null && contractDays <= 30 ? `⚠️ ${contractDays}d left` : `Ends ${new Date(s.contractEnd).toLocaleDateString()}`}
                                                </div>
                                            ) : <span className="text-foreground/20 text-xs">—</span>}
                                        </td>
                                        <td className="p-5 text-right">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold ${s.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-card/30 text-foreground/30 border border-border/20"}`}>{s.status}</span>
                                        </td>
                                    </tr>
                                )
                            })}
                            {filtered.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-foreground/30 italic text-sm">No suppliers yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Slide-over — rendered via portal */}
            {selected && typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-stretch justify-end" onClick={() => setSelected(null)}>
                        <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 250 }}
                            className="w-full max-w-md h-screen bg-background border-l border-border/30 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="flex-1 min-h-0 overflow-y-auto p-6">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-2xl font-serif text-foreground mb-2">{selected.name}</h2>
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${selected.status === "active" ? "bg-emerald-500 text-background" : "bg-card/50 text-foreground/40"}`}>
                                                📦 {selected.status}
                                            </span>
                                        </div>
                                        <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-card/50 text-foreground/40"><X className="w-5 h-5" /></button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-4 bg-card/30 rounded-xl border border-border/20">
                                            <div className="text-[10px] text-foreground/30 uppercase tracking-widest mb-1">Cost</div>
                                            <div className="text-xl font-mono text-red-400">฿{selected.costAmount.toLocaleString()}</div>
                                            <div className="text-[10px] text-foreground/30 mt-0.5">per {selected.costType === "daily" ? "day" : "month"}</div>
                                        </div>
                                        <div className="p-4 bg-card/30 rounded-xl border border-border/20">
                                            <div className="text-[10px] text-foreground/30 uppercase tracking-widest mb-1">Priority</div>
                                            <div className="text-xl font-serif text-foreground capitalize">{selected.priority}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-2">Contact</h3>
                                        <div className="flex items-center gap-3 text-foreground/50 text-sm"><Phone className="w-4 h-4" /> {selected.phone}</div>
                                        {selected.email && <div className="flex items-center gap-3 text-foreground/50 text-sm"><Mail className="w-4 h-4" /> {selected.email}</div>}
                                        {selected.lineId && <div className="flex items-center gap-3 text-foreground/50 text-sm"><MessageCircle className="w-4 h-4" /> {selected.lineId}</div>}
                                        {selected.contactPerson && <div className="flex items-center gap-3 text-foreground/50 text-sm">👤 {selected.contactPerson}</div>}
                                    </div>

                                    {(selected.contractStart || selected.contractEnd || selected.paymentTerms) && (
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-2">Contract</h3>
                                            {selected.contractStart && <div className="text-sm text-foreground/50">Start: <span className="text-foreground/70">{new Date(selected.contractStart).toLocaleDateString()}</span></div>}
                                            {selected.contractEnd && <div className="text-sm text-foreground/50">End: <span className="text-foreground/70">{new Date(selected.contractEnd).toLocaleDateString()}</span></div>}
                                            {selected.paymentTerms && <div className="text-sm text-foreground/50">Terms: <span className="text-foreground/70">{selected.paymentTerms}</span></div>}
                                        </div>
                                    )}

                                    {selected.notes && (
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-2">Notes</h3>
                                            <p className="text-sm text-foreground/40 italic bg-card/20 p-4 rounded-xl border border-border/10">{selected.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sticky Actions Footer */}
                            <div className="p-4 border-t border-border/20 bg-background flex gap-3">
                                <Button onClick={() => { setEditing(selected); setShowForm(true); setSelected(null) }} variant="outline"
                                    className="flex-1 rounded-xl border-border/30 text-foreground/50 hover:text-primary text-[10px] uppercase tracking-widest font-bold">Edit</Button>
                                <Button onClick={() => handleDelete(selected.id)} variant="ghost"
                                    className="text-red-400/50 hover:text-red-400 hover:bg-red-500/10 text-[10px] uppercase tracking-widest font-bold rounded-xl px-4"><Trash2 className="w-3.5 h-3.5" /> Delete</Button>
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {showForm && (
                    <SupplierForm supplier={editing} categories={EXPENSE_CATEGORIES} onSave={handleSave} onClose={() => { setShowForm(false); setEditing(null) }} />
                )}
            </AnimatePresence>
        </div>
    )
}

// ── Form Modal ──
const SupplierForm = ({ supplier, categories, onSave, onClose }: {
    supplier: Supplier | null, categories: string[]
    onSave: (d: Partial<Supplier>) => void, onClose: () => void
}) => {
    const [f, setF] = useState<Partial<Supplier>>(supplier || {
        name: "", phone: "", costType: "monthly", costAmount: 0, category: "Supplies",
        priority: "primary", status: "active"
    })

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="bg-background border border-border/30 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-border/20 flex justify-between items-center">
                    <h2 className="text-xl font-serif text-primary">{supplier ? "Edit Supplier" : "New Supplier"}</h2>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-card/50 text-foreground/40"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={e => { e.preventDefault(); if (f.name && f.phone) onSave(f) }} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Name *</label>
                        <input value={f.name || ""} onChange={e => setF({ ...f, name: e.target.value })} required
                            className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" placeholder="Thai Herbs Co." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Phone *</label>
                            <input value={f.phone || ""} onChange={e => setF({ ...f, phone: e.target.value })} required
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Email</label>
                            <input type="email" value={f.email || ""} onChange={e => setF({ ...f, email: e.target.value })}
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Contact Person</label>
                            <input value={f.contactPerson || ""} onChange={e => setF({ ...f, contactPerson: e.target.value })}
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">LINE ID</label>
                            <input value={f.lineId || ""} onChange={e => setF({ ...f, lineId: e.target.value })}
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Cost Amount *</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-sm text-foreground/30">฿</span>
                                <input type="number" value={f.costAmount || 0} onChange={e => setF({ ...f, costAmount: parseFloat(e.target.value) || 0 })}
                                    className="w-full p-3 pl-8 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Frequency</label>
                            <select value={f.costType || "monthly"} onChange={e => setF({ ...f, costType: e.target.value as "daily" | "monthly" })}
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm appearance-none">
                                <option value="monthly">Monthly</option>
                                <option value="daily">Daily</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Category</label>
                            <select value={f.category || "Supplies"} onChange={e => setF({ ...f, category: e.target.value })}
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm appearance-none">
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Priority</label>
                            <select value={f.priority || "primary"} onChange={e => setF({ ...f, priority: e.target.value as any })}
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm appearance-none">
                                <option value="primary">Primary</option>
                                <option value="secondary">Secondary</option>
                                <option value="backup">Backup</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Status</label>
                            <select value={f.status || "active"} onChange={e => setF({ ...f, status: e.target.value as any })}
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm appearance-none">
                                <option value="active">🟢 Active</option>
                                <option value="inactive">⚫ Inactive</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Contract Start</label>
                            <input type="date" value={f.contractStart || ""} onChange={e => setF({ ...f, contractStart: e.target.value })}
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Contract End</label>
                            <input type="date" value={f.contractEnd || ""} onChange={e => setF({ ...f, contractEnd: e.target.value })}
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Payment Terms</label>
                        <input value={f.paymentTerms || ""} onChange={e => setF({ ...f, paymentTerms: e.target.value })}
                            className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" placeholder="Net 30, Cash on delivery..." />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Notes</label>
                        <textarea value={f.notes || ""} onChange={e => setF({ ...f, notes: e.target.value })}
                            className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm min-h-[60px]" placeholder="Quality notes, delivery reliability..." />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button type="button" onClick={onClose} variant="ghost" className="flex-1 rounded-xl text-foreground/40">Cancel</Button>
                        <Button type="submit" className="flex-1 rounded-xl bg-primary text-background hover:bg-primary/90 font-bold">{supplier ? "Update" : "Create"}</Button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    )
}
