"use client"

import { useState, useMemo } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
    Handshake, Plus, Search, Phone, Mail, MessageCircle, X, Trash2,
    Users, TrendingUp, DollarSign, Ticket, Copy, Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirestoreCollection, useFirestoreCRUD } from "@/hooks/useFirestore"
import { orderBy } from "firebase/firestore"
import { CirclePartner, Booking, Voucher } from "@/types"

type Partner = CirclePartner

interface Props {
    bookings: Booking[]
    expenses: any[]
}

export const PartnersSubTab = ({ bookings, expenses }: Props) => {
    const { data: partners } = useFirestoreCollection<Partner>("circle_partners", [orderBy("name")])
    const { data: vouchers } = useFirestoreCollection<Voucher>("vouchers")
    const partnerOps = useFirestoreCRUD("circle_partners")
    const voucherOps = useFirestoreCRUD("vouchers")
    const expenseOps = useFirestoreCRUD("expenses")

    const [searchTerm, setSearchTerm] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<Partner | null>(null)
    const [selected, setSelected] = useState<Partner | null>(null)
    const [copiedCode, setCopiedCode] = useState<string | null>(null)

    const thisMonth = new Date().toISOString().slice(0, 7)

    // --- Compute partner stats from bookings ---
    const partnerStats = useMemo(() => {
        const map = new Map<string, { guests: number, revenue: number, commission: number, monthRevenue: number, monthGuests: number }>()
        partners.forEach(p => map.set(p.id, { guests: 0, revenue: 0, commission: 0, monthRevenue: 0, monthGuests: 0 }))

        bookings.forEach(b => {
            if (!b.partnerId) return
            const stats = map.get(b.partnerId)
            if (!stats) return
            const rev = b.priceSnapshot || 0
            stats.guests += b.guests
            stats.revenue += rev
            stats.commission += b.partnerCommission || 0
            if (b.date?.startsWith(thisMonth)) {
                stats.monthRevenue += rev
                stats.monthGuests += b.guests
            }
        })
        return map
    }, [partners, bookings, thisMonth])

    // --- Bound vouchers map ---
    const boundVouchers = useMemo(() => {
        const map = new Map<string, Voucher>()
        vouchers.filter(v => v.boundType === "partner").forEach(v => {
            if (v.boundEntityId) map.set(v.boundEntityId, v)
        })
        return map
    }, [vouchers])

    // Filter
    const filtered = useMemo(() => partners.filter(p =>
        !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.phone.includes(searchTerm) || p.boundVoucherCode.toLowerCase().includes(searchTerm.toLowerCase())
    ), [partners, searchTerm])

    // Totals
    const totalMonthRevenue = useMemo(() => {
        let total = 0
        partnerStats.forEach(s => total += s.monthRevenue)
        return total
    }, [partnerStats])

    // --- Handlers ---
    const handleSave = async (data: Partial<Partner>) => {
        if (editing?.id) {
            await partnerOps.update(editing.id, data)
            // Update existing bound voucher if code/discount changed
            const existingVoucher = boundVouchers.get(editing.id)
            if (existingVoucher && (data.boundVoucherCode !== editing.boundVoucherCode || data.discountPercent !== editing.discountPercent)) {
                await voucherOps.update(existingVoucher.id, {
                    code: data.boundVoucherCode,
                    discountPercent: data.discountPercent,
                    status: data.status === "inactive" ? "VOID" : "ISSUED",
                })
            }
        } else {
            // Create partner
            const partnerId = await partnerOps.add({ ...data, createdAt: new Date().toISOString() })
            // Auto-create bound voucher
            if (data.boundVoucherCode) {
                await voucherOps.add({
                    code: data.boundVoucherCode,
                    treatmentId: "__partner_discount__",
                    treatmentTitle: `Partner Discount: ${data.name}`,
                    pricePaid: 0,
                    originalPrice: 0,
                    status: "ISSUED",
                    type: "single",
                    boundType: "partner",
                    boundEntityId: partnerId,
                    discountPercent: data.discountPercent || 0,
                    usageCount: 0,
                    issuedAt: new Date().toISOString(),
                    recipientName: data.name,
                })
            }
        }
        setShowForm(false)
        setEditing(null)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this partner and void their voucher?")) return
        // Void bound voucher
        const bv = boundVouchers.get(id)
        if (bv) await voucherOps.update(bv.id, { status: "VOID" })
        await partnerOps.remove(id)
        setSelected(null)
    }

    const handleToggleActive = async (partner: Partner) => {
        const newStatus = partner.status === "active" ? "inactive" : "active"
        await partnerOps.update(partner.id, { status: newStatus })
        // Enable/disable bound voucher
        const bv = boundVouchers.get(partner.id)
        if (bv) await voucherOps.update(bv.id, { status: newStatus === "active" ? "ISSUED" : "VOID" })
        setSelected(null)
    }

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code)
        setCopiedCode(code)
        setTimeout(() => setCopiedCode(null), 2000)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="font-serif text-xl text-foreground mb-1">Referral Partners</h3>
                    <p className="text-sm text-foreground/50">
                        {partners.filter(p => p.status === "active").length} active · ฿{totalMonthRevenue.toLocaleString()} this month
                    </p>
                </div>
                <Button onClick={() => { setEditing(null); setShowForm(true) }} size="sm"
                    className="h-9 rounded-xl bg-primary text-background hover:bg-primary/90 text-[10px] font-bold uppercase tracking-wider gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Add Partner
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Active", value: partners.filter(p => p.status === "active").length, icon: Handshake, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                    { label: "Month Revenue", value: `฿${totalMonthRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
                    { label: "Total Guests", value: (() => { let t = 0; partnerStats.forEach(s => t += s.guests); return t })(), icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
                    { label: "Commission Due", value: `฿${(() => { let t = 0; partnerStats.forEach(s => t += s.commission); return t })().toLocaleString()}`, icon: DollarSign, color: "text-red-400", bg: "bg-red-500/10" },
                ].map(s => (
                    <div key={s.label} className="bg-card/50 backdrop-blur-sm p-4 rounded-2xl border border-border/30">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center ${s.color}`}><s.icon className="w-5 h-5" /></div>
                            <div>
                                <div className="text-xl font-serif text-foreground">{s.value}</div>
                                <div className="text-[9px] uppercase tracking-widest text-foreground/40 font-bold">{s.label}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                <input type="text" placeholder="Search by name, phone, or code..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-card/30 border border-border/30 rounded-xl py-3 pl-12 pr-4 text-foreground placeholder-foreground/20 focus:outline-none focus:border-primary/50 text-sm" />
            </div>

            {/* Mobile Cards */}
            <div className="space-y-3 md:hidden">
                {filtered.map(p => {
                    const stats = partnerStats.get(p.id)
                    return (
                        <div key={p.id} onClick={() => setSelected(p)} className="bg-card/30 border border-border/20 rounded-2xl p-4 active:bg-card/60 transition-colors cursor-pointer">
                            <div className="flex justify-between items-start mb-2">
                                <div className="font-serif text-base text-foreground">{p.name}</div>
                                <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-lg ${p.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-card/50 text-foreground/30"}`}>{p.status}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="font-mono text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-md">{p.boundVoucherCode}</span>
                                <span className="text-[10px] text-foreground/30">{p.discountPercent}% off</span>
                            </div>
                            <div className="flex gap-4 items-end text-xs">
                                <div><div className="text-[9px] text-foreground/30 uppercase">Revenue</div><div className="font-mono text-primary">฿{(stats?.revenue || 0).toLocaleString()}</div></div>
                                <div><div className="text-[9px] text-foreground/30 uppercase">Guests</div><div className="text-foreground/60">{stats?.guests || 0}</div></div>
                                <div><div className="text-[9px] text-foreground/30 uppercase">Commission</div><div className="font-mono text-red-400">฿{(stats?.commission || 0).toLocaleString()}</div></div>
                            </div>
                        </div>
                    )
                })}
                {filtered.length === 0 && <div className="text-center py-12 text-foreground/30 italic text-sm">No partners yet.</div>}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-card/20 backdrop-blur-md border border-border/20 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="bg-card/60 border-b border-border/20 sticky top-0 backdrop-blur-md z-10">
                            <tr>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Partner</th>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Code</th>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Commission</th>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Guests</th>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Revenue</th>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">This Month</th>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/10">
                            {filtered.map(p => {
                                const stats = partnerStats.get(p.id)
                                return (
                                    <tr key={p.id} onClick={() => setSelected(p)} className="hover:bg-primary/5 transition-colors cursor-pointer group">
                                        <td className="p-5">
                                            <div className="font-serif text-base text-foreground group-hover:text-primary transition-colors">{p.name}</div>
                                            <div className="text-[10px] text-foreground/30">{p.contactPerson}</div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-mono text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-md border border-primary/20">{p.boundVoucherCode}</span>
                                                <button onClick={e => { e.stopPropagation(); copyCode(p.boundVoucherCode) }} className="p-1 rounded hover:bg-card/50 text-foreground/20 hover:text-primary">
                                                    {copiedCode === p.boundVoucherCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                </button>
                                            </div>
                                            <div className="text-[10px] text-foreground/30 mt-0.5">{p.discountPercent}% discount</div>
                                        </td>
                                        <td className="p-5">
                                            <div className="text-xs text-foreground/50">
                                                {p.commissionType === "percentage" ? `${(p.commissionRate * 100).toFixed(0)}%` : `฿${p.commissionRate.toLocaleString()}/head`}
                                            </div>
                                            <div className="font-mono text-red-400 text-sm">฿{(stats?.commission || 0).toLocaleString()}</div>
                                        </td>
                                        <td className="p-5 font-mono text-foreground">{stats?.guests || 0}</td>
                                        <td className="p-5 font-mono text-primary">฿{(stats?.revenue || 0).toLocaleString()}</td>
                                        <td className="p-5">
                                            <div className="font-mono text-primary text-sm">฿{(stats?.monthRevenue || 0).toLocaleString()}</div>
                                            <div className="text-[10px] text-foreground/30">{stats?.monthGuests || 0} guests</div>
                                        </td>
                                        <td className="p-5 text-right">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold ${p.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                p.status === "prospect" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                                    "bg-card/30 text-foreground/30 border border-border/20"}`}>{p.status}</span>
                                        </td>
                                    </tr>
                                )
                            })}
                            {filtered.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-foreground/30 italic text-sm">No partners yet. Add your first referral partner!</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Slide-over — rendered via portal */}
            {selected && typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    <PartnerDetail partner={selected} stats={partnerStats.get(selected.id)} voucher={boundVouchers.get(selected.id)}
                        bookings={bookings} onClose={() => setSelected(null)} onEdit={() => { setEditing(selected); setShowForm(true); setSelected(null) }}
                        onDelete={() => handleDelete(selected.id)} onToggle={() => handleToggleActive(selected)} onCopy={copyCode} copiedCode={copiedCode} />
                </AnimatePresence>,
                document.body
            )}

            {/* Form */}
            <AnimatePresence>
                {showForm && <PartnerForm partner={editing} onSave={handleSave} onClose={() => { setShowForm(false); setEditing(null) }} />}
            </AnimatePresence>
        </div>
    )
}

// ── Detail Panel ──
const PartnerDetail = ({ partner, stats, voucher, bookings, onClose, onEdit, onDelete, onToggle, onCopy, copiedCode }: {
    partner: Partner, stats: any, voucher?: Voucher, bookings: Booking[]
    onClose: () => void, onEdit: () => void, onDelete: () => void, onToggle: () => void
    onCopy: (c: string) => void, copiedCode: string | null
}) => {
    const thisMonth = new Date().toISOString().slice(0, 7)
    const partnerBookings = bookings.filter(b => b.partnerId === partner.id).sort((a, b) => b.date.localeCompare(a.date))
    const monthBookings = partnerBookings.filter(b => b.date?.startsWith(thisMonth))

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-stretch justify-end" onClick={onClose}>
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 250 }}
                className="w-full max-w-md h-screen bg-background border-l border-border/30 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex-1 min-h-0 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-serif text-foreground mb-2">{partner.name}</h2>
                                <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-background px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">🤝 Referral Partner</span>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-xl hover:bg-card/50 text-foreground/40"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Bound Voucher Card */}
                        <div className="p-5 bg-gradient-to-br from-primary/10 to-transparent rounded-xl border border-primary/20">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Ticket className="w-4 h-4 text-primary" />
                                    <span className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Bound Voucher Code</span>
                                </div>
                                <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-md ${voucher?.status === "ISSUED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                                    {voucher?.status || "N/A"}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-2xl text-primary font-bold tracking-wider">{partner.boundVoucherCode}</span>
                                <button onClick={() => onCopy(partner.boundVoucherCode)} className="p-2 rounded-lg bg-card/30 hover:bg-card/60 text-foreground/40 hover:text-primary">
                                    {copiedCode === partner.boundVoucherCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <div className="flex gap-4 mt-3 text-[10px] text-foreground/40">
                                <span>{partner.discountPercent}% discount</span>
                                <span>·</span>
                                <span>Used {voucher?.usageCount || 0} times</span>
                                <span>·</span>
                                <span>Unlimited uses</span>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-4 bg-card/30 rounded-xl border border-border/20">
                                <div className="text-[10px] text-foreground/30 uppercase tracking-widest mb-1">Total Revenue</div>
                                <div className="text-xl font-mono text-primary">฿{(stats?.revenue || 0).toLocaleString()}</div>
                            </div>
                            <div className="p-4 bg-card/30 rounded-xl border border-border/20">
                                <div className="text-[10px] text-foreground/30 uppercase tracking-widest mb-1">Guests Sent</div>
                                <div className="text-xl font-mono text-foreground">{stats?.guests || 0}</div>
                            </div>
                            <div className="p-4 bg-card/30 rounded-xl border border-border/20">
                                <div className="text-[10px] text-foreground/30 uppercase tracking-widest mb-1">Commission</div>
                                <div className="text-xl font-mono text-red-400">฿{(stats?.commission || 0).toLocaleString()}</div>
                            </div>
                        </div>

                        {/* This Month */}
                        {monthBookings.length > 0 && (
                            <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                                <div className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold mb-2">📅 This Month</div>
                                <div className="flex gap-6 text-sm">
                                    <div><span className="text-foreground/30">Bookings</span> <span className="font-mono text-foreground ml-1">{monthBookings.length}</span></div>
                                    <div><span className="text-foreground/30">Revenue</span> <span className="font-mono text-primary ml-1">฿{(stats?.monthRevenue || 0).toLocaleString()}</span></div>
                                    <div><span className="text-foreground/30">Guests</span> <span className="font-mono text-foreground ml-1">{stats?.monthGuests || 0}</span></div>
                                </div>
                            </div>
                        )}

                        {/* Deal Terms */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-2">Deal Terms</h3>
                            <div className="space-y-2 text-sm text-foreground/50">
                                <div>Commission: <span className="text-primary font-mono font-bold">
                                    {partner.commissionType === "percentage" ? `${(partner.commissionRate * 100).toFixed(0)}%` : `฿${partner.commissionRate.toLocaleString()}/head`}
                                </span></div>
                                {partner.contractStart && <div>Contract start: <span className="text-foreground/70">{new Date(partner.contractStart).toLocaleDateString()}</span></div>}
                                {partner.contractEnd && <div>Contract end: <span className="text-foreground/70">{new Date(partner.contractEnd).toLocaleDateString()}</span></div>}
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-2">Contact</h3>
                            <div className="flex items-center gap-3 text-foreground/50 text-sm"><Phone className="w-4 h-4" /> {partner.phone}</div>
                            {partner.email && <a href={`mailto:${partner.email}`} className="flex items-center gap-3 text-foreground/50 text-sm hover:text-primary"><Mail className="w-4 h-4" /> {partner.email}</a>}
                            {partner.lineId && <div className="flex items-center gap-3 text-foreground/50 text-sm"><MessageCircle className="w-4 h-4" /> {partner.lineId}</div>}
                            {partner.contactPerson && <div className="flex items-center gap-3 text-foreground/50 text-sm">👤 {partner.contactPerson}</div>}
                        </div>

                        {/* Recent Bookings */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-2">Recent Bookings</h3>
                            {partnerBookings.length === 0 ? (
                                <p className="text-foreground/30 text-sm italic">No bookings from this partner yet.</p>
                            ) : (
                                partnerBookings.slice(0, 10).map(b => (
                                    <div key={b.id} className="flex justify-between items-center p-3 bg-card/20 rounded-xl border border-border/10">
                                        <div>
                                            <div className="text-sm text-foreground">{b.contact?.name || "Guest"}</div>
                                            <div className="text-[10px] text-foreground/30">{new Date(b.date).toLocaleDateString()} · {b.treatment}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono text-primary text-sm">฿{(b.priceSnapshot || 0).toLocaleString()}</div>
                                            {b.partnerCommission && <div className="text-[10px] text-red-400">-฿{b.partnerCommission.toLocaleString()} comm.</div>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {partner.notes && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-2">Notes</h3>
                                <p className="text-sm text-foreground/40 italic bg-card/20 p-4 rounded-xl border border-border/10">{partner.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sticky Actions Footer */}
                <div className="p-4 border-t border-border/20 bg-background flex gap-3">
                    <Button onClick={onToggle} variant="outline" className={`flex-1 rounded-xl text-[10px] uppercase tracking-widest font-bold ${partner.status === "active" ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10" : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"}`}>
                        {partner.status === "active" ? "Deactivate" : "Activate"}
                    </Button>
                    <Button onClick={onEdit} variant="outline" className="flex-1 rounded-xl border-border/30 text-foreground/50 hover:text-primary text-[10px] uppercase tracking-widest font-bold">Edit</Button>
                    <Button onClick={onDelete} variant="ghost" className="text-red-400/50 hover:text-red-400 hover:bg-red-500/10 text-[10px] uppercase tracking-widest font-bold rounded-xl px-4"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
            </motion.div>
        </motion.div>
    )
}

// ── Form Modal ──
const PartnerForm = ({ partner, onSave, onClose }: { partner: Partner | null, onSave: (d: Partial<Partner>) => void, onClose: () => void }) => {
    const [f, setF] = useState<Partial<Partner>>(partner || {
        name: "", contactPerson: "", phone: "", commissionType: "percentage", commissionRate: 0.1,
        boundVoucherCode: "", discountPercent: 10, status: "active"
    })

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                onClick={e => e.stopPropagation()} className="bg-background border border-border/30 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-border/20 flex justify-between items-center">
                    <h2 className="text-xl font-serif text-primary">{partner ? "Edit Partner" : "New Partner"}</h2>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-card/50 text-foreground/40"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={e => { e.preventDefault(); if (f.name && f.phone && f.boundVoucherCode) onSave(f) }} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Partner Name *</label>
                        <input value={f.name || ""} onChange={e => setF({ ...f, name: e.target.value })} required
                            className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" placeholder="CrossFit Bangkok" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Contact Person *</label>
                            <input value={f.contactPerson || ""} onChange={e => setF({ ...f, contactPerson: e.target.value })}
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Phone *</label>
                            <input value={f.phone || ""} onChange={e => setF({ ...f, phone: e.target.value })} required
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Email</label>
                            <input type="email" value={f.email || ""} onChange={e => setF({ ...f, email: e.target.value })}
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">LINE ID</label>
                            <input value={f.lineId || ""} onChange={e => setF({ ...f, lineId: e.target.value })}
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                        </div>
                    </div>

                    {/* Voucher Section */}
                    <div className="pt-2 border-t border-border/10">
                        <div className="flex items-center gap-2 mb-4">
                            <Ticket className="w-4 h-4 text-primary/60" />
                            <span className="text-xs font-bold uppercase tracking-widest text-foreground/40">Bound Voucher</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Code *</label>
                                <input value={f.boundVoucherCode || ""} onChange={e => setF({ ...f, boundVoucherCode: e.target.value.toUpperCase().replace(/\s/g, "-") })} required
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm font-mono"
                                    placeholder="PTR-CROSSFIT" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Discount %</label>
                                <div className="relative">
                                    <input type="number" min={0} max={100} value={f.discountPercent || 0} onChange={e => setF({ ...f, discountPercent: parseInt(e.target.value) || 0 })}
                                        className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                                    <span className="absolute right-3 top-3 text-sm text-foreground/30">%</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-[10px] text-foreground/30 mt-2">Staff will enter this code when booking a guest from this partner.</p>
                    </div>

                    {/* Commission */}
                    <div className="pt-2 border-t border-border/10">
                        <div className="flex items-center gap-2 mb-4">
                            <DollarSign className="w-4 h-4 text-red-400/60" />
                            <span className="text-xs font-bold uppercase tracking-widest text-foreground/40">Commission</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Type</label>
                                <select value={f.commissionType || "percentage"} onChange={e => setF({ ...f, commissionType: e.target.value as any })}
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm appearance-none">
                                    <option value="percentage">% of revenue</option>
                                    <option value="per_head">฿ per guest</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">
                                    {f.commissionType === "percentage" ? "Rate (%)" : "Amount per head (฿)"}
                                </label>
                                <input type="number" step={f.commissionType === "percentage" ? 1 : 100}
                                    value={f.commissionType === "percentage" ? (f.commissionRate ? f.commissionRate * 100 : 0) : (f.commissionRate || 0)}
                                    onChange={e => setF({ ...f, commissionRate: f.commissionType === "percentage" ? (parseFloat(e.target.value) / 100) : parseFloat(e.target.value) || 0 })}
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                            </div>
                        </div>
                    </div>

                    {/* Contract */}
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
                        <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Notes</label>
                        <textarea value={f.notes || ""} onChange={e => setF({ ...f, notes: e.target.value })}
                            className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm min-h-[60px]" placeholder="Agreement details..." />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="button" onClick={onClose} variant="ghost" className="flex-1 rounded-xl text-foreground/40">Cancel</Button>
                        <Button type="submit" className="flex-1 rounded-xl bg-primary text-background hover:bg-primary/90 font-bold">{partner ? "Update" : "Create Partner"}</Button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    )
}
