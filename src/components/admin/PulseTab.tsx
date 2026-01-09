"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { DollarSign, Activity, Users, TrendingUp } from "lucide-react"

interface Booking {
    id: string
    guests: number
    time: string
    status: string
    treatment: string
    treatmentPrice?: number // Legacy support
    priceSnapshot?: number // The actual realized revenue for this booking
    // Extended fields for Table
    date?: string
    salesmanId?: string
    commissionAmount?: number
    contact?: {
        name: string
        method: string
        handle: string
    }
    notes?: string
}

interface Salesman {
    id: string
    name: string
    nickname: string
    commissionRate: number
    active: boolean
    photoUrl?: string
}

interface PulseProps {
    bookings: Booking[]
    treatments: any[]
    salesmen: Salesman[]
    onEdit: (booking: Booking) => void
}

export function PulseTab({ bookings, treatments, salesmen, onEdit }: PulseProps) {
    const [timeRange, setTimeRange] = useState<"today" | "month" | "all">("all")

    // --- Helper Logic ---
    const getFilteredBookings = () => {
        // Use en-CA to safely get YYYY-MM-DD in local time
        const todayStr = new Date().toLocaleDateString("en-CA")

        return bookings.filter(b => {
            if (timeRange === "all") return true

            // Handle relative text dates ("Today")
            if (b.date === "Today") {
                return ["today", "month"].includes(timeRange)
            }

            const bookingDate = new Date(b.date || "")
            const now = new Date()

            if (timeRange === "today") {
                return b.date === todayStr
            }

            if (timeRange === "month") {
                // Check if same month and year
                return bookingDate.getMonth() === now.getMonth() &&
                    bookingDate.getFullYear() === now.getFullYear()
            }

            return true
        })
    }

    const filteredBookings = getFilteredBookings()

    // 1. Calculate Revenue (Confirmed/Arrived/Complete)
    const totalRevenue = filteredBookings
        .filter(b => ["Confirmed", "Arrived", "In Ritual", "Complete"].includes(b.status))
        .reduce((sum, b) => {
            // Priority: Snapshot > Catalog Lookup > 0
            if (b.priceSnapshot !== undefined) return sum + b.priceSnapshot

            const treat = treatments.find(t => t.title === b.treatment)
            return sum + (treat ? treat.price_thb * b.guests : 0)
        }, 0)

    // 2. Ritual Mix
    const ritualCounts: Record<string, number> = {}
    filteredBookings.forEach(b => {
        ritualCounts[b.treatment] = (ritualCounts[b.treatment] || 0) + b.guests
    })
    const topRituals = Object.entries(ritualCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)

    // 3. Flow Rate (Time distribution)
    const timeDistribution: Record<string, number> = { "Morning": 0, "Sun Peak": 0, "Evening": 0 }

    filteredBookings.forEach(b => {
        let phase = "Morning" // Default

        // precise time parsing (HH:MM)
        const timeStr = b.time?.split('(')[0].trim() || ""
        const hour = parseInt(timeStr.split(':')[0])

        if (!isNaN(hour)) {
            if (hour >= 17) phase = "Evening"
            else if (hour >= 12) phase = "Sun Peak"
            else phase = "Morning"
        } else {
            // Fallback for legacy text strings like "Evening"
            if (b.time?.includes("Evening")) phase = "Evening"
            else if (b.time?.includes("Sun Peak")) phase = "Sun Peak"
        }

        if (timeDistribution[phase] !== undefined) {
            timeDistribution[phase] += b.guests
        }
    })

    // 4. Sales Leaderboard Logic
    const salesData = salesmen.map(s => {
        const myBookings = filteredBookings.filter(b => b.salesmanId === s.id)
        const revenue = myBookings.reduce((sum, b) => sum + (b.priceSnapshot || 0), 0)
        const commissions = myBookings.reduce((sum, b) => sum + (b.commissionAmount || 0), 0)
        return {
            ...s,
            revenue,
            commissions,
            count: myBookings.length
        }
    }).filter(s => s.revenue > 0 || s.active).sort((a, b) => b.revenue - a.revenue)

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-32">
            {/* Filter Controls */}
            <div className="col-span-2 flex justify-end">
                <div className="bg-[#0c2627] backdrop-blur-sm p-1 rounded-full flex border border-primary/20">
                    {[
                        { id: "today", label: "Today" },
                        { id: "month", label: "This Month" },
                        { id: "all", label: "All Time" }
                    ].map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => setTimeRange(mode.id as any)}
                            className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-widest transition-all ${timeRange === mode.id ? "bg-primary text-[#051818] shadow-sm" : "text-foreground/40 hover:text-foreground"
                                }`}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Revenue Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="col-span-2 md:col-span-1 bg-card border border-primary/10 p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.3)]">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40">Sanctuary Revenue</h3>
                        <p className="text-xs text-foreground/30">Total Value</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                        <DollarSign className="w-5 h-5" />
                    </div>
                </div>
                <div className="font-serif text-5xl md:text-6xl text-foreground">
                    ฿{totalRevenue.toLocaleString()}
                </div>
                <div className="mt-4 flex gap-2">
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full font-bold border border-emerald-500/20">+12% vs last week</span>
                </div>
            </motion.div>

            {/* Filter Controls */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="col-span-2 md:col-span-1 bg-card border border-primary/10 p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.3)]">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40">Flow Rate</h3>
                        <p className="text-xs text-foreground/30">Guest Density by Time</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                        <Users className="w-5 h-5" />
                    </div>
                </div>

                <div className="space-y-4">
                    {Object.entries(timeDistribution).map(([time, count]) => (
                        <div key={time} className="space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-foreground/60">
                                <span>{time}</span>
                                <span>{count} Guests</span>
                            </div>
                            <div className="h-2 bg-[#0F2E2E] rounded-full overflow-hidden border border-[#1A3A3A]">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(count / Math.max(1, filteredBookings.length)) * 100}%` }}
                                    className="h-full bg-blue-500/60 rounded-full"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Ritual Mix */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="col-span-2 bg-card border border-primary/10 p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.3)]">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40">Ritual Mix</h3>
                        <p className="text-xs text-foreground/30">Most Popular Journeys</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                        <Activity className="w-5 h-5" />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {topRituals.map(([name, count], i) => (
                        <div key={name} className="p-4 rounded-3xl bg-[#0F2E2E]/40 border border-primary/10 flex flex-col justify-between h-32 hover:border-primary/30 transition-colors">
                            <span className="text-3xl font-serif text-primary">{count}</span>
                            <span className="text-xs font-medium text-foreground/60 leading-tight uppercase tracking-wider">{name}</span>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Sales Leaderboard */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="col-span-2 bg-card border border-primary/10 p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.3)]">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40">Sales Pulse</h3>
                        <p className="text-xs text-foreground/30">Staff Performance & Commissions</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {salesData.map((s, i) => (
                        <div key={s.id} className={`p-6 rounded-3xl border flex items-center gap-4 ${i === 0 ? "bg-gradient-to-br from-orange-500/20 to-[#0F2E2E] border-orange-500/30 relative overflow-hidden" : "bg-[#0F2E2E]/30 border-primary/10"}`}>
                            {i === 0 && <div className="absolute top-0 right-0 p-3 opacity-10"><TrendingUp className="w-20 h-20 text-orange-500" /></div>}

                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden border-2 ${i === 0 ? "border-orange-500/50" : "border-primary/10 bg-[#0c2627]"}`}>
                                {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover" /> : <span className="text-foreground/40">{s.nickname.charAt(0)}</span>}
                            </div>

                            <div className="flex-1 min-w-0 relative z-10">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-serif font-bold text-lg truncate text-foreground">{s.nickname}</h4>
                                    {s.count >= 3 && timeRange === "today" && <span title="On Fire!" className="text-sm">🔥</span>}
                                </div>
                                <div className="flex gap-4 mt-1 text-xs">
                                    <div>
                                        <span className="text-foreground/30 font-bold uppercase tracking-wider block text-[9px]">Sales</span>
                                        <span className="font-mono font-bold text-primary">฿{s.revenue.toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <span className="text-foreground/30 font-bold uppercase tracking-wider block text-[9px]">Comm.</span>
                                        <span className="font-mono font-bold text-emerald-400">฿{s.commissions.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-white/5 px-2 py-0.5 rounded-full self-center border border-white/5">
                                        <span className="font-bold text-foreground">{s.count}</span> <span className="text-[9px] uppercase text-foreground/40">Bookings</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {salesData.length === 0 && <div className="col-span-3 text-center text-foreground/30 italic py-8">No sales activity for this period.</div>}
                </div>
            </motion.div>

            {/* Transaction Log */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="col-span-2 bg-card border border-primary/10 p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.3)]">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40">Transaction Log</h3>
                        <p className="text-xs text-foreground/30">Detailed Revenue & Discount Audit</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] uppercase tracking-widest text-foreground/40 border-b border-primary/10">
                                <th className="pb-4 pl-4 font-bold">Time</th>
                                <th className="pb-4 font-bold">Guest</th>
                                <th className="pb-4 font-bold">Ritual</th>
                                <th className="pb-4 text-right font-bold opacity-50">List Price</th>
                                <th className="pb-4 text-right font-bold text-red-400">Discount</th>
                                <th className="pb-4 text-right font-bold text-emerald-500 pr-4">Net Revenue</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {[...filteredBookings].reverse().map((b, i) => {
                                // Logic: Determine correct values
                                const treatment = treatments.find(t => t.title === b.treatment)
                                const listPrice = treatment ? treatment.price_thb : 0
                                const netRevenue = b.priceSnapshot !== undefined ? b.priceSnapshot : listPrice // Fallback if no snapshot
                                const discountAmount = listPrice - netRevenue

                                // Discount Reason Parsing
                                let discountReason = "-"
                                if (discountAmount > 0) {
                                    if (b.notes?.includes("PREPAID")) discountReason = "Voucher"
                                    else if (b.notes?.includes("DISCOUNTED")) discountReason = "Manual Override"
                                    else discountReason = "Other"
                                }

                                return (
                                    <tr key={`${b.id}-${i}`} onClick={() => onEdit(b)} className="border-b border-primary/5 hover:bg-white/5 transition-colors cursor-pointer group">
                                        <td className="py-4 pl-4 font-mono text-xs text-foreground/60">{b.date} • {b.time}</td>
                                        <td className="py-4 font-medium text-foreground">
                                            {b.contact?.name}
                                            <div className="text-[10px] text-foreground/40 uppercase tracking-wider">{b.contact?.method || "Walk-In"}</div>
                                        </td>
                                        <td className="py-4 text-xs text-foreground/80">
                                            {b.treatment}
                                            <div className={`text-[9px] uppercase tracking-wider mt-1 ${b.status === "Arrived" ? "text-emerald-400" :
                                                b.status === "Confirmed" ? "text-blue-400" : "text-foreground/30"
                                                }`}>
                                                {b.status}
                                            </div>
                                        </td>
                                        <td className="py-4 text-right font-mono text-foreground/30">฿{listPrice.toLocaleString()}</td>
                                        <td className="py-4 text-right font-mono text-red-400">
                                            {discountAmount > 0 ? `-฿${discountAmount.toLocaleString()}` : "-"}
                                            {discountAmount > 0 && <div className="text-[9px] uppercase tracking-wider text-red-500/60">{discountReason}</div>}
                                        </td>
                                        <td className="py-4 text-right pr-4 font-mono font-bold text-emerald-500">฿{netRevenue.toLocaleString()}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    {filteredBookings.length === 0 && <div className="p-8 text-center text-foreground/30 italic">No transactions found for this period.</div>}
                </div>
            </motion.div>
        </div>
    )
}
