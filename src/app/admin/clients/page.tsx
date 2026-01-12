"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Search, User, Mail, Phone, Calendar, Gift, RefreshCw, Star, TrendingUp, DollarSign } from "lucide-react"
import Link from "next/link"
import QRCode from "react-qr-code"
import { Button } from "@/components/ui/button"
import { useFirestoreCollection, useFirestoreCRUD } from "@/hooks/useFirestore"
import { Voucher } from "@/types" // Import shared Voucher type
import { isRedemptionBooking, calculateClientSpend, determineTier, TIERS } from "@/lib/loyalty"

// Types
interface Client {
    id: string // usually email
    email: string
    name: string
    phone?: string
    notes?: string
    totalSpend: number
    visitCount: number
    lastVisit: string
    joinedDate: string
}

interface Booking {
    id: string
    contact?: {
        name: string
        email?: string
        handle?: string // phone
    }
    priceSnapshot?: number
    date: string
    status: string
    items?: any[]
    paymentMethod?: string
    notes?: string
}

export default function ClientsPage() {
    // Data
    const { data: clients } = useFirestoreCollection<Client>("clients")
    const { data: bookings } = useFirestoreCollection<Booking>("bookings")
    const { data: vouchers } = useFirestoreCollection<Voucher>("vouchers")
    const clientOps = useFirestoreCRUD("clients")

    // State
    const [searchTerm, setSearchTerm] = useState("")
    const [isSyncing, setIsSyncing] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [newClientForm, setNewClientForm] = useState({ name: "", email: "", phone: "", notes: "" })

    // Manual Add
    const handleAddClient = async () => {
        if (!newClientForm.email || !newClientForm.name) return alert("Name and Email required")
        const id = newClientForm.email.toLowerCase().trim()

        await clientOps.set(id, {
            id,
            ...newClientForm,
            totalSpend: 0,
            visitCount: 0,
            joinedDate: new Date().toISOString(),
            lastVisit: "2000-01-01" // Never visited
        })

        setIsAdding(false)
        setNewClientForm({ name: "", email: "", phone: "", notes: "" })
    }

    // Delete
    const handleDeleteClient = async (id: string) => {
        if (confirm("Are you sure you want to delete this member profile? History remains in bookings, but CRM data will be lost.")) {
            await clientOps.remove(id)
            setSelectedClient(null)
        }
    }

    // Sync Logic: Rebuild Client DB from Bookings
    const handleSyncClients = async () => {
        if (!confirm("This will scan bookings to update member stats. Manual notes will be preserved. Continue?")) return
        setIsSyncing(true)

        // 1. Map existing clients to preserve data (Notes, IDs)
        const existingMap = new Map<string, Client>()
        clients.forEach(c => existingMap.set(c.id, c))

        // 2. Process bookings
        const updates = new Map<string, Client>()

        // A. Initialize with ALL existing clients (Reset stats)
        // This ensures clients with 0 bookings but Active Vouchers are not skipped.
        clients.forEach(c => {
            updates.set(c.id, {
                ...c,
                totalSpend: 0,
                visitCount: 0,
                // We keep joinedDate, but reset lastVisit to re-calculate from valid bookings
                lastVisit: "2000-01-01"
            })
        })

        // B. Process Bookings (Accumulate Stats & Add Walk-ins)
        bookings.forEach(b => {
            // STRICT: Only sync if email exists
            const email = b.contact?.email?.toLowerCase().trim()
            if (!email || email.length < 3) return

            // ID Strategy using Email for walk-ins
            // In a real app we might use b.userId if available. Here we assume email = ID for simplicity/legacy.
            const key = email

            // Initialize New Walk-in if not in DB
            if (!updates.has(key)) {
                updates.set(key, {
                    id: key,
                    email: email,
                    name: b.contact?.name || "Unknown",
                    phone: b.contact?.handle || "",
                    notes: "",
                    totalSpend: 0,
                    visitCount: 0,
                    joinedDate: b.date,
                    lastVisit: "2000-01-01"
                })
            }
        })

        // 3. Aggregate Stats
        bookings.forEach(b => {
            const email = b.contact?.email?.toLowerCase().trim()
            if (!email || !updates.has(email)) return

            if (b.status !== "Cancelled") {
                const client = updates.get(email)!

                // SPEND CALCULATION (FUNDER MODEL):
                // Uses shared library logic for consistency
                const isRedemption = isRedemptionBooking(b)

                // 2. Only add booking spend if it's NOT a redemption (e.g. Cash/Card service)
                const bookingValue = isRedemption ? 0 : Number(b.priceSnapshot || 0)

                if (!isNaN(bookingValue)) {
                    client.totalSpend += bookingValue
                }

                client.visitCount += 1
                if (b.date > client.lastVisit) client.lastVisit = b.date
                if (b.date < client.joinedDate) client.joinedDate = b.date

                if (b.contact?.name && b.contact.name.length > client.name.length) {
                    client.name = b.contact.name
                }
            }
        })

        // 3.5 Process Vouchers (Add to Spend)
        // REVISED LOGIC: Count BOTH "ISSUED" and "REDEEMED" vouchers.
        // Why? Because "Sort of" Spend = Cash In. Buying the voucher IS the spend.
        // We assume the Redemption Booking has price 0 or we accept the risk of tracking "Service Value" + "Voucher Value".
        // To fix user complaint "Spend not accumulating", we err on the side of counting the Voucher.
        let voucherCount = 0
        vouchers.forEach(v => {
            if (v.status === "VOID" || v.status === "REFUNDED") return // Count Issued AND Redeemed (Funder Model)

            // STRICT MATCH: Only match by Client ID (Email)
            let client = v.clientId ? updates.get(v.clientId) : null
            // Removed ambiguous name matching fallback.

            if (client) {
                // FORCE NUMBER CAST to prevent "100" + "50" = "10050"
                const voucherValue = Number(v.pricePaid || 0)
                if (!isNaN(voucherValue)) {
                    client.totalSpend += voucherValue
                    voucherCount++
                }
                // Do not increment visitCount for unused vouchers
            }
        })

        // 4. Batch Write
        let count = 0
        for (const [id, data] of Array.from(updates.entries())) {
            await clientOps.set(id, data)
            count++
        }

        setIsSyncing(false)
        alert(`Strict Sync Complete!\nUpdated ${count} profiles.\nCredited ${voucherCount} vouchers.`)
    }

    // Filter
    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
    )

    return (
        <div className="min-h-screen bg-[#051818] text-[#F2F2F2] font-sans relative">
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('/noise.png')] z-0" />

            <div className="max-w-6xl mx-auto p-8 relative z-10 space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <Link href="/admin" className="text-xs uppercase tracking-widest text-gray-500 hover:text-white mb-2 inline-flex items-center gap-2 font-bold transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Operations Dashboard
                        </Link>
                        <h1 className="text-4xl font-serif text-[#D1C09B]">Client Registry</h1>
                        <p className="text-gray-500 mt-2">Manage memberships, history, and loyalty.</p>
                    </div>

                    <div className="flex gap-4">
                        <Button
                            onClick={() => setIsAdding(true)}
                            className="bg-[#D1C09B] text-[#051818] hover:bg-[#b0a07f] font-bold rounded-xl"
                        >
                            <User className="w-4 h-4 mr-2" /> Add Member
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleSyncClients}
                            disabled={isSyncing}
                            className="border-white/10 hover:bg-white/5 text-gray-400 gap-2 rounded-xl"
                        >
                            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                            {isSyncing ? "Syncing..." : "Sync"}
                        </Button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#0c2627] p-6 rounded-3xl border border-white/5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#D1C09B]/10 flex items-center justify-center text-[#D1C09B]">
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-serif text-white">{clients.length}</div>
                            <div className="text-xs uppercase tracking-widest text-gray-500">Total Members</div>
                        </div>
                    </div>
                    <div className="bg-[#0c2627] p-6 rounded-3xl border border-white/5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <Star className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-serif text-white">
                                {clients.filter(c => c.visitCount > 1).length}
                            </div>
                            <div className="text-xs uppercase tracking-widest text-gray-500">Returning Guests</div>
                        </div>
                    </div>
                    <div className="bg-[#0c2627] p-6 rounded-3xl border border-white/5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-serif text-white">
                                ฿{clients.reduce((acc, c) => acc + (c.totalSpend || 0), 0).toLocaleString()}
                            </div>
                            <div className="text-xs uppercase tracking-widest text-gray-500">Lifetime Value</div>
                        </div>
                    </div>
                </div>

                {/* Search & List */}
                <div className="bg-[#0c2627] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/5">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search by name, email, or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[#051818] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-[#D1C09B] transition-colors"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#051818]/50 sticky top-0 z-10 backdrop-blur-md">
                                <tr>
                                    <th className="p-6 text-xs uppercase tracking-widest text-gray-500 font-bold">Client</th>
                                    <th className="p-6 text-xs uppercase tracking-widest text-gray-500 font-bold">Contact</th>
                                    <th className="p-6 text-xs uppercase tracking-widest text-gray-500 font-bold">Stats</th>
                                    <th className="p-6 text-xs uppercase tracking-widest text-gray-500 font-bold text-right">Last Visit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredClients.map(client => (
                                    <tr
                                        key={client.id}
                                        onClick={() => setSelectedClient(client)}
                                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                                    >
                                        <td className="p-6">
                                            <div className="font-serif text-lg text-white group-hover:text-[#D1C09B] transition-colors">{client.name}</div>
                                            <div className="text-xs text-gray-600">Joined {client.joinedDate}</div>
                                        </td>
                                        <td className="p-6 space-y-1">
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <Mail className="w-3 h-3" /> {client.email}
                                            </div>
                                            {client.phone && (
                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                    <Phone className="w-3 h-3" /> {client.phone}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <div className="text-xs text-gray-500 uppercase">Visits</div>
                                                    <div className="font-mono text-white">{client.visitCount}</div>
                                                </div>
                                                <div className="w-px h-8 bg-white/10" />
                                                <div>
                                                    <div className="text-xs text-gray-500 uppercase">Spend</div>
                                                    <div className="font-mono text-[#D1C09B]">฿{client.totalSpend.toLocaleString()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="text-sm text-white">{new Date(client.lastVisit).toLocaleDateString()}</div>
                                            <div className="text-xs text-gray-600">{
                                                Math.floor((new Date().getTime() - new Date(client.lastVisit).getTime()) / (1000 * 3600 * 24))
                                            } days ago</div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredClients.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-gray-500 italic">
                                            {clients.length === 0 ? "No clients found. Try syncing from bookings." : "No matches found."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detail Modal */}
                <AnimatePresence>
                    {selectedClient && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-end"
                            onClick={() => setSelectedClient(null)}
                        >
                            <motion.div
                                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                                className="w-full max-w-xl h-full bg-[#0c2627] border-l border-white/10 shadow-2xl p-8 overflow-y-auto"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="space-y-8">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-3xl font-serif text-white mb-2">{selectedClient.name}</h2>
                                            {(() => {
                                                // Admin-side Tier Calculation (Synced with Member Portal)
                                                const clientBookings = bookings.filter(b => b.contact?.email === selectedClient.email && b.status !== "Cancelled")

                                                // 1. Calculate Booking Minutes (Accuracy: Medium - relies on item snapshot)
                                                const bookingMinutes = clientBookings.reduce((acc, b) => {
                                                    if (b.items && b.items.length > 0) {
                                                        const itemDuration = b.items.reduce((sum: number, item: any) => sum + (parseInt(item.duration || item.duration_min || "60")), 0)
                                                        return acc + itemDuration
                                                    }
                                                    return acc + 60 // Fallback
                                                }, 0)

                                                // 2. Calculate Voucher Minutes (Active Only)
                                                // 2. Calculate Voucher Minutes (Active Only)
                                                // STRICT MATCH: Only match by ID (Email).
                                                const clientVouchers = vouchers.filter(v => v.clientId === selectedClient.id).filter(v => v.status === "ISSUED")

                                                const voucherMinutes = clientVouchers.reduce((acc, v) => {
                                                    const title = v.treatmentTitle || ""
                                                    const match = title.match(/(\d+)\s*(?:min|m\b|m\s|m\|)/i)

                                                    let duration = 60
                                                    if (match && match[1]) {
                                                        duration = parseInt(match[1])
                                                    } else {
                                                        // Fallback
                                                        if (title.includes("90")) duration = 90
                                                        else if (title.includes("120")) duration = 120
                                                        else if (title.includes("30")) duration = 30
                                                        else if (title.includes("45")) duration = 45
                                                        else if (title.includes("180")) duration = 180
                                                    }
                                                    return acc + duration
                                                }, 0)

                                                // 3. Calculate Live Spend (Instant Update)
                                                // We calculate this locally so it reflects immediately after issuing a voucher,
                                                // without waiting for a manual "Sync".
                                                // Funder Model: Ignore Booking Spend if likely a redemption
                                                // Use Shared Logic
                                                const totalLiveSpend = calculateClientSpend(
                                                    bookings,
                                                    vouchers,
                                                    selectedClient.email,
                                                    selectedClient.id
                                                )

                                                const totalMinutes = bookingMinutes + voucherMinutes
                                                const totalHours = Math.round(totalMinutes / 60)
                                                // Use Live Spend for Tier Calc
                                                const totalSpend = totalLiveSpend

                                                const tiers = TIERS

                                                let tier = "Seeker"
                                                for (let i = tiers.length - 1; i >= 0; i--) {
                                                    // Spend-Only Tier Logic
                                                    if (totalSpend >= tiers[i].spend) {
                                                        tier = tiers[i].name
                                                        break
                                                    }
                                                }

                                                return (
                                                    <div className="flex items-center gap-2 text-[#051818] bg-[#D1C09B] w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#D1C09B]/20">
                                                        <Star className="w-3 h-3 fill-black" /> {tier} Status ({totalHours}h / ฿{totalSpend.toLocaleString()})
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleDeleteClient(selectedClient.id)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                        >
                                            Delete Profile
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-[#051818] rounded-2xl border border-white/5">
                                            <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Spend</div>
                                            {/* Use Live Calculation here too if possible, or we need to hoist strict calculation scope */}
                                            {/* Since the calculation above is inside the closure, we need to replicate or move it. 
                                                Actually, the simplest way is to calculating it in the main render or just here.
                                                Wait, the block above is an IIFE for the Badge. 
                                                To update THIS box, we need the value here. 
                                                Let's calculate it purely visually here. */}
                                            <div className="text-2xl font-mono text-[#D1C09B]">
                                                ฿{
                                                    calculateClientSpend(bookings, vouchers, selectedClient.email, selectedClient.id).toLocaleString()
                                                }
                                            </div>
                                        </div>
                                        <div className="p-4 bg-[#051818] rounded-2xl border border-white/5">
                                            <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Visits</div>
                                            <div className="text-2xl font-mono text-white">{selectedClient.visitCount}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-lg font-serif text-white border-b border-white/10 pb-2">Contact Info</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 text-gray-400">
                                                <Mail className="w-4 h-4" /> {selectedClient.email}
                                            </div>
                                            <div className="flex items-center gap-3 text-gray-400">
                                                <Phone className="w-4 h-4" /> {selectedClient.phone || "No phone"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Active Vouchers */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-serif text-white border-b border-white/10 pb-2">Active Vouchers</h3>
                                        <div className="space-y-3">
                                            {vouchers
                                                // STRICT MATCH: Only match by ID (Email)
                                                .filter(v => v.clientId === selectedClient.id)
                                                .filter(v => v.status === "ISSUED")
                                                .map(v => (
                                                    <div
                                                        key={v.id}
                                                        onClick={() => setQrCode(v.code)}
                                                        className="p-4 bg-[#0c2627] border border-[#D1C09B]/30 rounded-xl relative overflow-hidden group cursor-pointer hover:bg-[#0c2627]/80 hover:border-[#D1C09B] transition-all"
                                                    >
                                                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                                            <Gift className="w-12 h-12 text-[#D1C09B]" />
                                                        </div>
                                                        <div className="relative z-10">
                                                            <div className="text-[#D1C09B] font-bold text-sm tracking-widest uppercase mb-1">Gift Certificate</div>
                                                            <div className="text-white text-lg font-serif mb-2">{v.treatmentTitle}</div>
                                                            <div className="flex justify-between items-end">
                                                                <div className="font-mono text-gray-400 text-sm bg-black/20 px-2 py-1 rounded border border-white/10">{v.code}</div>
                                                                <div className="text-[10px] text-[#D1C09B]">
                                                                    Expires: {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : "Never"}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            {vouchers.filter(v =>
                                                v.clientId === selectedClient.id &&
                                                v.status === "ISSUED"
                                            ).length === 0 && (
                                                    <p className="text-gray-500 text-sm italic">No active vouchers found.</p>
                                                )}
                                        </div>
                                    </div>

                                    {/* Action: Send Voucher */}
                                    <div className="p-6 bg-gradient-to-br from-[#D1C09B]/20 to-transparent rounded-3xl border border-[#D1C09B]/20">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-[#D1C09B] text-[#051818] rounded-xl">
                                                <Gift className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-serif text-white mb-1">Issue Digital Voucher</h4>
                                                <p className="text-xs text-gray-400 mb-4">Send a gift card directly to this client's profile.</p>
                                                <Link href={`/admin?tab=vouchers&recipient=${encodeURIComponent(selectedClient.name)}&email=${encodeURIComponent(selectedClient.email)}&clientId=${selectedClient.id}`}>
                                                    <Button className="bg-[#D1C09B] text-[#051818] hover:bg-[#b0a07f] font-bold rounded-xl">
                                                        Create Voucher
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Booking History */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-serif text-white border-b border-white/10 pb-2">Treatment History</h3>
                                        <div className="space-y-4">
                                            {bookings
                                                .filter(b => b.contact?.email === selectedClient.email)
                                                .sort((a, b) => b.date.localeCompare(a.date))
                                                .map(b => (
                                                    <div key={b.id} className="flex justify-between items-center p-4 bg-[#051818] rounded-xl border border-white/5">
                                                        <div>
                                                            <div className="text-white font-medium">{new Date(b.date).toLocaleDateString()}</div>
                                                            <div className="text-xs text-gray-500 uppercase">{b.status}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-mono text-[#D1C09B]">฿{b.priceSnapshot?.toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Add Member Modal */}
                <AnimatePresence>
                    {isAdding && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        >
                            <div className="bg-[#0c2627] p-8 rounded-3xl w-full max-w-md shadow-2xl border border-white/10 space-y-6">
                                <h2 className="text-2xl font-serif text-[#D1C09B]">New Member</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs uppercase font-bold text-gray-500 mb-2 block">Full Name</label>
                                        <input
                                            value={newClientForm.name}
                                            onChange={e => setNewClientForm({ ...newClientForm, name: e.target.value })}
                                            className="w-full p-3 bg-[#051818] rounded-xl border border-white/10 text-white focus:outline-none focus:border-[#D1C09B]"
                                            placeholder="e.g. Somchai Jai-dee"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase font-bold text-gray-500 mb-2 block">Email Address (Required)</label>
                                        <input
                                            value={newClientForm.email}
                                            onChange={e => setNewClientForm({ ...newClientForm, email: e.target.value })}
                                            className="w-full p-3 bg-[#051818] rounded-xl border border-white/10 text-white focus:outline-none focus:border-[#D1C09B]"
                                            placeholder="client@email.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase font-bold text-gray-500 mb-2 block">Phone Number</label>
                                        <input
                                            value={newClientForm.phone}
                                            onChange={e => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                                            className="w-full p-3 bg-[#051818] rounded-xl border border-white/10 text-white focus:outline-none focus:border-[#D1C09B]"
                                            placeholder="08X-XXX-XXXX"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <Button onClick={() => setIsAdding(false)} variant="ghost" className="flex-1 rounded-xl text-gray-500 hover:text-white">Cancel</Button>
                                    <Button onClick={handleAddClient} className="flex-1 rounded-xl bg-[#D1C09B] text-[#051818] hover:bg-[#b0a07f] font-bold">Create Profile</Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {/* QR Code Modal for Guest */}
            <AnimatePresence>
                {qrCode && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setQrCode(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center">
                                <h3 className="text-xl font-serif text-black mb-1">Redeem Voucher</h3>
                                <p className="text-sm text-gray-500">Show this to reception</p>
                            </div>

                            <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl">
                                <QRCode value={qrCode} size={200} />
                            </div>

                            <div className="text-center">
                                <p className="font-mono text-2xl font-bold text-black tracking-wider">{qrCode}</p>
                            </div>

                            <Button onClick={() => setQrCode(null)} variant="outline" className="w-full rounded-full border-gray-300 text-gray-600 hover:bg-gray-50">
                                Close
                            </Button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
