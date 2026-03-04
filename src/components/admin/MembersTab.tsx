"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, User, Mail, Phone, Gift, RefreshCw, Star, TrendingUp, X, Plus, Cake, Calendar, Edit2, Check } from "lucide-react"
import Link from "next/link"
import QRCode from "react-qr-code"
import { Button } from "@/components/ui/button"
import { useFirestoreCRUD } from "@/hooks/useFirestore"
import { Voucher } from "@/types"
import { isRedemptionBooking, calculateClientSpend, TIERS } from "@/lib/loyalty"

interface MembersTabProps {
    clients: any[]
    bookings: any[]
    vouchers: Voucher[]
}


export function MembersTab({ clients, bookings, vouchers }: MembersTabProps) {
    const clientOps = useFirestoreCRUD("clients")

    // State
    const [searchTerm, setSearchTerm] = useState("")
    const [isSyncing, setIsSyncing] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [selectedClient, setSelectedClient] = useState<any | null>(null)
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [newClientForm, setNewClientForm] = useState({ name: "", email: "", phone: "", notes: "", birthday: "" })
    const [editingBirthday, setEditingBirthday] = useState(false)
    const [birthdayInput, setBirthdayInput] = useState("")

    // Hide admin bottom bar when detail panel is open
    useEffect(() => {
        const bar = document.getElementById("admin-bottom-bar")
        if (bar) bar.style.display = selectedClient || isAdding ? "none" : ""
        return () => { if (bar) bar.style.display = "" }
    }, [selectedClient, isAdding])

    // Birthday helpers
    const getDaysUntilBirthday = (birthday: string | undefined): number | null => {
        if (!birthday) return null
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const bday = new Date(birthday)
        const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
        if (next < today) next.setFullYear(next.getFullYear() + 1)
        // Check if same day
        if (next.getMonth() === today.getMonth() && next.getDate() === today.getDate()) return 0
        return Math.ceil((next.getTime() - today.getTime()) / 86400000)
    }

    // Check if birthday is within ±7 days (Birthday Week)
    const isBirthdayWeek = (birthday: string | undefined): boolean => {
        if (!birthday) return false
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const bday = new Date(birthday)
        const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
        const diff = Math.abs(today.getTime() - thisYear.getTime()) / 86400000
        if (diff <= 7) return true
        // Also check across year boundary
        const lastYear = new Date(today.getFullYear() - 1, bday.getMonth(), bday.getDate())
        const diffLast = Math.abs(today.getTime() - lastYear.getTime()) / 86400000
        return diffLast <= 7
    }

    const isBirthdayToday = (birthday: string | undefined): boolean => getDaysUntilBirthday(birthday) === 0
    const isBirthdaySoon = (birthday: string | undefined): boolean => {
        const days = getDaysUntilBirthday(birthday)
        return days !== null && days <= 30 && !isBirthdayWeek(birthday)
    }

    // Check if birthday voucher already issued this year for a client
    const hasBirthdayVoucherThisYear = (clientId: string): boolean => {
        const currentYear = new Date().getFullYear()
        return vouchers.some(v =>
            v.clientId === clientId &&
            (v as any).isBirthdayGift === true &&
            (v as any).birthdayYear === currentYear
        )
    }

    const birthdaySoonCount = useMemo(() => clients.filter(c => isBirthdayWeek(c.birthday) || isBirthdaySoon(c.birthday)).length, [clients])

    // Manual Add
    const handleAddClient = async () => {
        if (!newClientForm.email || !newClientForm.name) return alert("Name and Email required")
        const id = newClientForm.email.toLowerCase().trim()
        await clientOps.set(id, {
            id,
            name: newClientForm.name,
            email: newClientForm.email,
            phone: newClientForm.phone,
            notes: newClientForm.notes,
            birthday: newClientForm.birthday || undefined,
            totalSpend: 0,
            visitCount: 0,
            joinedDate: new Date().toISOString(),
            lastVisit: "2000-01-01"
        })
        setIsAdding(false)
        setNewClientForm({ name: "", email: "", phone: "", notes: "", birthday: "" })
    }

    const handleSaveBirthday = async () => {
        if (!selectedClient) return
        await clientOps.update(selectedClient.id, { birthday: birthdayInput || null })
        setSelectedClient({ ...selectedClient, birthday: birthdayInput || undefined })
        setEditingBirthday(false)
    }

    // Delete
    const handleDeleteClient = async (id: string) => {
        if (confirm("Delete this member profile? Booking history is preserved.")) {
            await clientOps.remove(id)
            setSelectedClient(null)
        }
    }

    // Sync Logic
    const handleSyncClients = async () => {
        if (!confirm("Scan bookings to update member stats. Notes will be preserved. Continue?")) return
        setIsSyncing(true)

        const updates = new Map<string, any>()
        clients.forEach(c => {
            updates.set(c.id, { ...c, totalSpend: 0, visitCount: 0, lastVisit: "2000-01-01" })
        })

        bookings.forEach(b => {
            const email = b.contact?.email?.toLowerCase().trim()
            if (!email || email.length < 3) return
            if (!updates.has(email)) {
                updates.set(email, {
                    id: email, email, name: b.contact?.name || "Unknown",
                    phone: b.contact?.handle || "", notes: "",
                    totalSpend: 0, visitCount: 0, joinedDate: b.date, lastVisit: "2000-01-01"
                })
            }
        })

        bookings.forEach(b => {
            const email = b.contact?.email?.toLowerCase().trim()
            if (!email || !updates.has(email)) return
            if (b.status !== "Cancelled") {
                const client = updates.get(email)!
                const isRedemption = isRedemptionBooking(b)
                const bookingValue = isRedemption ? 0 : Number(b.priceSnapshot || 0)
                if (!isNaN(bookingValue)) client.totalSpend += bookingValue
                client.visitCount += 1
                if (b.date > client.lastVisit) client.lastVisit = b.date
                if (b.date < client.joinedDate) client.joinedDate = b.date
                if (b.contact?.name && b.contact.name.length > client.name.length) client.name = b.contact.name
            }
        })

        let voucherCount = 0
        vouchers.forEach(v => {
            if (v.status === "VOID" || v.status === "REFUNDED") return
            if ((v as any).giftedFrom) return // Gifted vouchers are NOT revenue
            const client = v.clientId ? updates.get(v.clientId) : null
            if (client) {
                const voucherValue = Number(v.pricePaid || 0)
                if (!isNaN(voucherValue)) { client.totalSpend += voucherValue; voucherCount++ }
            }
        })

        let count = 0
        for (const [id, data] of Array.from(updates.entries())) {
            await clientOps.set(id, data)
            count++
        }

        setIsSyncing(false)
        alert(`Sync Complete! Updated ${count} profiles. Credited ${voucherCount} vouchers.`)
    }

    // Filter
    const filteredClients = useMemo(() =>
        clients.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone?.includes(searchTerm)
        ),
        [clients, searchTerm]
    )

    // Tier calculation for a client
    const getClientTier = (client: any) => {
        const totalSpend = calculateClientSpend(bookings, vouchers, client.email, client.id)
        let tier = "Seeker"
        for (let i = TIERS.length - 1; i >= 0; i--) {
            if (totalSpend >= TIERS[i].spend) { tier = TIERS[i].name; break }
        }
        return { tier, totalSpend }
    }

    // Voucher stats for a client
    const getClientVoucherStats = (clientId: string) => {
        const active = vouchers.filter(v => v.clientId === clientId && v.status === "ISSUED")
        const totalCredits = active.reduce((acc, v) => {
            if (v.type === "package" && v.creditsRemaining != null) return acc + v.creditsRemaining
            if (v.type !== "package") return acc + 1 // single-use = 1 credit
            return acc + (v.creditsTotal || 1)
        }, 0)
        return { activeCount: active.length, totalCredits }
    }

    return (
        <div className="space-y-8">
            {/* Header + Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="font-serif text-2xl text-foreground mb-1">Member Registry</h2>
                    <p className="text-sm text-foreground/60">Manage memberships, history, and loyalty tiers.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setIsAdding(true)}
                        size="sm"
                        className="h-9 rounded-xl bg-primary text-background hover:bg-primary/90 text-[10px] md:text-xs font-bold uppercase tracking-wider gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add Member
                    </Button>
                    <Button
                        onClick={handleSyncClients}
                        disabled={isSyncing}
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-xl border-border/50 text-foreground/50 hover:text-primary gap-1.5 text-[10px] md:text-xs font-bold uppercase tracking-wider"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                        {isSyncing ? "Syncing..." : "Sync"}
                    </Button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                <div className="bg-card/50 backdrop-blur-sm p-4 md:p-6 rounded-2xl border border-border/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xl md:text-2xl font-serif text-foreground">{clients.length}</div>
                            <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Members</div>
                        </div>
                    </div>
                </div>
                <div className="bg-card/50 backdrop-blur-sm p-4 md:p-6 rounded-2xl border border-border/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <Star className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xl md:text-2xl font-serif text-foreground">{clients.filter(c => c.visitCount > 1).length}</div>
                            <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Returning</div>
                        </div>
                    </div>
                </div>
                <div className="bg-card/50 backdrop-blur-sm p-4 md:p-6 rounded-2xl border border-border/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xl md:text-2xl font-serif text-foreground">฿{clients.reduce((a, c) => a + (c.totalSpend || 0), 0).toLocaleString()}</div>
                            <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-foreground/40 font-bold">LTV</div>
                        </div>
                    </div>
                </div>
                <div className="bg-card/50 backdrop-blur-sm p-4 md:p-6 rounded-2xl border border-border/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400">
                            <Cake className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xl md:text-2xl font-serif text-foreground">{birthdaySoonCount}</div>
                            <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-foreground/40 font-bold">🎂 Soon</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-card/30 border border-border/30 rounded-xl py-3 pl-12 pr-4 text-foreground placeholder-foreground/20 focus:outline-none focus:border-primary/50 transition-colors text-sm"
                />
            </div>

            {/* Member List — Card layout for mobile, table for desktop */}
            <div className="space-y-3 md:hidden">
                {filteredClients.map(client => {
                    const { tier } = getClientTier(client)
                    const vs = getClientVoucherStats(client.id)
                    return (
                        <div
                            key={client.id}
                            onClick={() => setSelectedClient(client)}
                            className="bg-card/30 border border-border/20 rounded-2xl p-4 active:bg-card/60 transition-colors cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="font-serif text-base text-foreground">{client.name}</div>
                                    <div className="text-[10px] text-foreground/30">{client.email}</div>
                                </div>
                                <span className="text-[9px] uppercase tracking-widest font-bold bg-primary/10 text-primary px-2 py-1 rounded-lg">{tier}</span>
                            </div>
                            <div className="flex gap-4 mt-3 items-end">
                                <div>
                                    <div className="text-[9px] text-foreground/30 uppercase">Visits</div>
                                    <div className="font-mono text-sm text-foreground">{client.visitCount}</div>
                                </div>
                                <div>
                                    <div className="text-[9px] text-foreground/30 uppercase">Spend</div>
                                    <div className="font-mono text-sm text-primary">฿{(client.totalSpend || 0).toLocaleString()}</div>
                                </div>
                                {vs.activeCount > 0 && (
                                    <div>
                                        <div className="text-[9px] text-foreground/30 uppercase">Vouchers</div>
                                        <div className="flex items-center gap-1.5">
                                            <Gift className="w-3 h-3 text-emerald-400" />
                                            <span className="font-mono text-sm text-emerald-400">{vs.totalCredits} credits</span>
                                        </div>
                                    </div>
                                )}
                                {(() => {
                                    const days = getDaysUntilBirthday(client.birthday)
                                    if (days === null) return null
                                    return (
                                        <div className="ml-auto text-right">
                                            <div className="text-[9px] text-foreground/30 uppercase">Birthday</div>
                                            {days === 0 ? (
                                                <div className="flex items-center gap-1 text-pink-400 font-bold text-xs animate-pulse">🎂 Today!</div>
                                            ) : (
                                                <div className="text-xs text-foreground/60">{days}d left</div>
                                            )}
                                        </div>
                                    )
                                })()}
                                {!client.birthday && (
                                    <div className="ml-auto text-right">
                                        <div className="text-[9px] text-foreground/30 uppercase">Last Visit</div>
                                        <div className="text-xs text-foreground/60">{new Date(client.lastVisit).toLocaleDateString()}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
                {filteredClients.length === 0 && (
                    <div className="text-center py-12 text-foreground/30 italic text-sm">
                        {clients.length === 0 ? "No clients found. Try syncing from bookings." : "No matches found."}
                    </div>
                )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-card/20 backdrop-blur-md border border-border/20 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="bg-card/60 border-b border-border/20 sticky top-0 backdrop-blur-md z-10">
                            <tr>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Client</th>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Contact</th>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Tier</th>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Stats</th>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Vouchers</th>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Birthday</th>
                                <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold text-right">Last Visit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/10">
                            {filteredClients.map(client => {
                                const { tier, totalSpend } = getClientTier(client)
                                const vs = getClientVoucherStats(client.id)
                                return (
                                    <tr
                                        key={client.id}
                                        onClick={() => setSelectedClient(client)}
                                        className="hover:bg-primary/5 transition-colors cursor-pointer group"
                                    >
                                        <td className="p-5">
                                            <div className="font-serif text-base text-foreground group-hover:text-primary transition-colors">{client.name}</div>
                                            <div className="text-[10px] text-foreground/30">Joined {new Date(client.joinedDate).toLocaleDateString()}</div>
                                        </td>
                                        <td className="p-5 space-y-1">
                                            <div className="flex items-center gap-2 text-sm text-foreground/50">
                                                <Mail className="w-3 h-3" /> {client.email}
                                            </div>
                                            {client.phone && (
                                                <div className="flex items-center gap-2 text-sm text-foreground/50">
                                                    <Phone className="w-3 h-3" /> {client.phone}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-5">
                                            <span className="px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold bg-primary/10 text-primary border border-primary/20">
                                                {tier}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <div className="text-[10px] text-foreground/30 uppercase">Visits</div>
                                                    <div className="font-mono text-foreground">{client.visitCount}</div>
                                                </div>
                                                <div className="w-px h-8 bg-border/30" />
                                                <div>
                                                    <div className="text-[10px] text-foreground/30 uppercase">Spend</div>
                                                    <div className="font-mono text-primary">฿{totalSpend.toLocaleString()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            {vs.activeCount > 0 ? (
                                                <div className="flex items-center gap-2">
                                                    <Gift className="w-3.5 h-3.5 text-emerald-400" />
                                                    <div>
                                                        <div className="font-mono text-emerald-400 text-sm">{vs.totalCredits} credits</div>
                                                        <div className="text-[10px] text-foreground/30">{vs.activeCount} active</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-foreground/20 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="p-5">
                                            {(() => {
                                                const days = getDaysUntilBirthday(client.birthday)
                                                if (days === null) return <span className="text-foreground/20 text-xs">—</span>
                                                if (days === 0) return (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-pink-500/15 text-pink-400 border border-pink-500/25 animate-pulse">
                                                        🎂 Today!
                                                    </span>
                                                )
                                                return (
                                                    <div>
                                                        <div className={`font-mono text-sm ${days <= 7 ? 'text-pink-400' : days <= 30 ? 'text-amber-400' : 'text-foreground/50'}`}>
                                                            {days}d
                                                        </div>
                                                        <div className="text-[10px] text-foreground/25">{new Date(client.birthday!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                                    </div>
                                                )
                                            })()}
                                        </td>
                                        <td className="p-5 text-right">
                                            <div className="text-sm text-foreground">{new Date(client.lastVisit).toLocaleDateString()}</div>
                                            <div className="text-[10px] text-foreground/30">
                                                {Math.floor((Date.now() - new Date(client.lastVisit).getTime()) / 86400000)}d ago
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {filteredClients.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-foreground/30 italic text-sm">
                                        {clients.length === 0 ? "No clients found. Try syncing from bookings." : "No matches found."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Client Detail Slide-Over ── */}
            <AnimatePresence>
                {selectedClient && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-stretch justify-end"
                        onClick={() => setSelectedClient(null)}
                    >
                        <motion.div
                            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 250 }}
                            className="w-full max-w-md bg-background border-l border-border/30 shadow-2xl p-6 overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="space-y-6">
                                {/* Header */}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-serif text-foreground mb-2">{selectedClient.name}</h2>
                                        {(() => {
                                            const { tier, totalSpend } = getClientTier(selectedClient)
                                            return (
                                                <span className="inline-flex items-center gap-1.5 bg-primary text-background px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20">
                                                    <Star className="w-3 h-3" /> {tier} • ฿{totalSpend.toLocaleString()}
                                                </span>
                                            )
                                        })()}
                                    </div>
                                    <button onClick={() => setSelectedClient(null)} className="p-2 rounded-xl hover:bg-card/50 text-foreground/40 hover:text-foreground transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Quick Stats */}
                                {(() => {
                                    const vs = getClientVoucherStats(selectedClient.id)
                                    return (
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="p-4 bg-card/30 rounded-xl border border-border/20">
                                                <div className="text-[10px] text-foreground/30 uppercase tracking-widest mb-1">Total Spend</div>
                                                <div className="text-xl font-mono text-primary">
                                                    ฿{calculateClientSpend(bookings, vouchers, selectedClient.email, selectedClient.id).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="p-4 bg-card/30 rounded-xl border border-border/20">
                                                <div className="text-[10px] text-foreground/30 uppercase tracking-widest mb-1">Visits</div>
                                                <div className="text-xl font-mono text-foreground">{selectedClient.visitCount}</div>
                                            </div>
                                            <div className="p-4 bg-card/30 rounded-xl border border-border/20">
                                                <div className="text-[10px] text-foreground/30 uppercase tracking-widest mb-1">Credits</div>
                                                <div className="text-xl font-mono text-emerald-400">{vs.totalCredits}</div>
                                                <div className="text-[10px] text-foreground/30 mt-0.5">{vs.activeCount} voucher{vs.activeCount !== 1 ? 's' : ''}</div>
                                            </div>
                                        </div>
                                    )
                                })()}

                                {/* Birthday Week Banner (±7 days) */}
                                {isBirthdayWeek(selectedClient.birthday) && (
                                    <div className="p-5 bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-pink-500/15 rounded-xl border border-pink-500/25 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(236,72,153,0.1),transparent_70%)]" />
                                        <div className="relative flex items-center gap-4">
                                            <div className="text-4xl">🎂</div>
                                            <div className="flex-1">
                                                <h4 className="font-serif text-foreground text-lg mb-0.5">
                                                    {isBirthdayToday(selectedClient.birthday) ? 'Happy Birthday!' : 'Birthday Week!'}
                                                </h4>
                                                <p className="text-[10px] text-pink-300/60">
                                                    {isBirthdayToday(selectedClient.birthday)
                                                        ? "It's their special day — surprise them!"
                                                        : `Birthday ${getDaysUntilBirthday(selectedClient.birthday) === 0 ? 'is today' : getDaysUntilBirthday(selectedClient.birthday)! > 0 ? `in ${getDaysUntilBirthday(selectedClient.birthday)} days` : 'was recently'} — ${new Date(selectedClient.birthday!).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`
                                                    }
                                                </p>
                                            </div>
                                            {hasBirthdayVoucherThisYear(selectedClient.id) ? (
                                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                                    <Check className="w-4 h-4 text-emerald-400" />
                                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Issued</span>
                                                </div>
                                            ) : (
                                                <Link href={`/admin?tab=vouchers&recipient=${encodeURIComponent(selectedClient.name)}&email=${encodeURIComponent(selectedClient.email)}&clientId=${selectedClient.id}&birthday=true`}>
                                                    <Button size="sm" className="h-9 rounded-xl bg-pink-500 text-white hover:bg-pink-600 text-[10px] font-bold uppercase tracking-wider gap-1.5 shadow-lg shadow-pink-500/25">
                                                        <Gift className="w-3.5 h-3.5" /> Issue Gift
                                                    </Button>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Birthday Soon Banner (8-30 days) */}
                                {!isBirthdayWeek(selectedClient.birthday) && isBirthdaySoon(selectedClient.birthday) && (
                                    <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20 flex items-center gap-3">
                                        <Cake className="w-5 h-5 text-amber-400/60" />
                                        <div className="flex-1">
                                            <p className="text-xs text-amber-300/80">Birthday in <strong className="text-amber-400">{getDaysUntilBirthday(selectedClient.birthday)} days</strong></p>
                                            <p className="text-[10px] text-foreground/30">{new Date(selectedClient.birthday!).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Contact */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-2">Contact</h3>
                                    <div className="flex items-center gap-3 text-foreground/50 text-sm">
                                        <Mail className="w-4 h-4" /> {selectedClient.email}
                                    </div>
                                    <div className="flex items-center gap-3 text-foreground/50 text-sm">
                                        <Phone className="w-4 h-4" /> {selectedClient.phone || "No phone"}
                                    </div>
                                    <div className="flex items-center gap-3 text-foreground/50 text-sm">
                                        <Cake className="w-4 h-4" />
                                        {editingBirthday ? (
                                            <div className="flex items-center gap-2 flex-1">
                                                <input
                                                    type="date"
                                                    value={birthdayInput}
                                                    onChange={e => setBirthdayInput(e.target.value)}
                                                    className="flex-1 p-1.5 bg-card/30 rounded-lg border border-border/30 text-foreground text-sm focus:outline-none focus:border-primary/50"
                                                />
                                                <button onClick={handleSaveBirthday} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"><Check className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => setEditingBirthday(false)} className="p-1.5 rounded-lg bg-card/30 text-foreground/40 hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 flex-1">
                                                <span>{selectedClient.birthday ? new Date(selectedClient.birthday).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "Not set"}</span>
                                                <button
                                                    onClick={() => { setEditingBirthday(true); setBirthdayInput(selectedClient.birthday || "") }}
                                                    className="p-1 rounded text-foreground/20 hover:text-primary"
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Active Vouchers */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-2">Active Vouchers</h3>
                                    {vouchers
                                        .filter(v => v.clientId === selectedClient.id && v.status === "ISSUED")
                                        .map(v => (
                                            <div
                                                key={v.id}
                                                onClick={() => setQrCode(v.code)}
                                                className="p-4 bg-card/30 border border-primary/20 rounded-xl cursor-pointer hover:border-primary/50 transition-all group"
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-primary font-bold text-[10px] tracking-widest uppercase">Gift Certificate</span>
                                                    {v.type === "package" && v.creditsTotal ? (
                                                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                                            {v.creditsRemaining ?? v.creditsTotal}/{v.creditsTotal} sessions
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                                            1/1 use
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-foreground font-serif text-base mb-2">{v.treatmentTitle}</div>
                                                <div className="flex justify-between items-end">
                                                    <span className="font-mono text-foreground/40 text-xs bg-card/50 px-2 py-1 rounded border border-border/30">{v.code}</span>
                                                    <span className="text-[10px] text-primary/60">Expires: {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : "Never"}</span>
                                                </div>
                                            </div>
                                        ))}
                                    {vouchers.filter(v => v.clientId === selectedClient.id && v.status === "ISSUED").length === 0 && (
                                        <p className="text-foreground/30 text-sm italic">No active vouchers found.</p>
                                    )}
                                </div>

                                {/* Issue Voucher CTA */}
                                <div className="p-5 bg-gradient-to-br from-primary/10 to-transparent rounded-xl border border-primary/20">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2.5 bg-primary text-background rounded-xl">
                                            <Gift className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-serif text-foreground mb-1">Issue Digital Voucher</h4>
                                            <p className="text-[10px] text-foreground/40 mb-3">Send a gift card to this member.</p>
                                            <Link href={`/admin?tab=vouchers&recipient=${encodeURIComponent(selectedClient.name)}&email=${encodeURIComponent(selectedClient.email)}&clientId=${selectedClient.id}`}>
                                                <Button size="sm" className="h-8 rounded-xl bg-primary text-background hover:bg-primary/90 text-[10px] font-bold uppercase tracking-wider">
                                                    Create Voucher
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>

                                {/* Booking History */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-2">Treatment History</h3>
                                    {bookings
                                        .filter(b => b.contact?.email === selectedClient.email)
                                        .sort((a, b) => b.date.localeCompare(a.date))
                                        .map(b => (
                                            <div key={b.id} className="flex justify-between items-center p-3 bg-card/20 rounded-xl border border-border/10">
                                                <div>
                                                    <div className="text-sm text-foreground">{new Date(b.date).toLocaleDateString()}</div>
                                                    <div className="text-[10px] text-foreground/30 uppercase">{b.status}</div>
                                                </div>
                                                <div className="font-mono text-primary text-sm">฿{b.priceSnapshot?.toLocaleString() || "0"}</div>
                                            </div>
                                        ))}
                                </div>

                                {/* Delete */}
                                <Button
                                    variant="ghost"
                                    onClick={() => handleDeleteClient(selectedClient.id)}
                                    className="w-full text-red-400/50 hover:text-red-400 hover:bg-red-500/10 text-[10px] uppercase tracking-widest font-bold"
                                >
                                    Delete Profile
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Add Member Modal ── */}
            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-background border border-border/30 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-5"
                        >
                            <h2 className="text-xl font-serif text-primary">New Member</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Full Name</label>
                                    <input
                                        value={newClientForm.name}
                                        onChange={e => setNewClientForm({ ...newClientForm, name: e.target.value })}
                                        className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm"
                                        placeholder="e.g. Somchai Jai-dee"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Email (Required)</label>
                                    <input
                                        value={newClientForm.email}
                                        onChange={e => setNewClientForm({ ...newClientForm, email: e.target.value })}
                                        className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm"
                                        placeholder="client@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Phone</label>
                                    <input
                                        value={newClientForm.phone}
                                        onChange={e => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                                        className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm"
                                        placeholder="08X-XXX-XXXX"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Birthday</label>
                                    <input
                                        type="date"
                                        value={newClientForm.birthday}
                                        onChange={e => setNewClientForm({ ...newClientForm, birthday: e.target.value })}
                                        className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button onClick={() => setIsAdding(false)} variant="ghost" className="flex-1 rounded-xl text-foreground/40 hover:text-foreground">Cancel</Button>
                                <Button onClick={handleAddClient} className="flex-1 rounded-xl bg-primary text-background hover:bg-primary/90 font-bold">Create Profile</Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── QR Code Modal ── */}
            <AnimatePresence>
                {qrCode && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setQrCode(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="text-center">
                                <h3 className="text-xl font-serif text-black mb-1">Redeem Voucher</h3>
                                <p className="text-sm text-gray-500">Show this to reception</p>
                            </div>
                            <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl">
                                <QRCode value={qrCode} size={200} />
                            </div>
                            <p className="font-mono text-2xl font-bold text-black tracking-wider">{qrCode}</p>
                            <Button onClick={() => setQrCode(null)} variant="outline" className="w-full rounded-full border-gray-300 text-gray-600 hover:bg-gray-50">Close</Button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
