"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { DollarSign, Activity, Users, TrendingUp, Trophy, Medal, Star, Target, UserCheck, RefreshCw, Percent, XCircle } from "lucide-react"
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { Download, Edit2, Share2 } from "lucide-react";
import { useFirestoreCRUD } from "@/hooks/useFirestore";

// Types
import { Booking, Salesman, Treatment } from "@/types"

interface Expense {
    id: string
    month: string // YYYY-MM
    title: string
    amount: number
    category: string
}

interface PulseProps {
    bookings: Booking[]
    treatments: any[]
    salesmen: Salesman[]
    expenses: Expense[]
    targetSettings?: { monthlyGoals: Record<string, number> } | null
    onEdit: (booking: Booking) => void
}

interface Expense {
    id: string
    month: string // YYYY-MM
    title: string
    amount: number
    category: string
}

interface PulseProps {
    bookings: Booking[]
    treatments: any[]
    salesmen: Salesman[]
    expenses: Expense[]
    targetSettings?: { monthlyGoals: Record<string, number> } | null
    onEdit: (booking: Booking) => void
}

export function PulseTab({ bookings, treatments, salesmen, expenses, targetSettings, onEdit }: PulseProps) {
    const [viewMode, setViewMode] = useState<"live" | "management">("live")
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [expandedMonth, setExpandedMonth] = useState<string | null>(null)
    const [timeRange, setTimeRange] = useState<"today" | "month" | "all">("all")

    // Target Editing State
    const [editingTargetMonth, setEditingTargetMonth] = useState<string | null>(null)
    const [targetInputValue, setTargetInputValue] = useState<string>("")
    const settingsOps = useFirestoreCRUD("settings")

    // Save Target Function
    const saveMonthlyTarget = async (monthStr: string, value: number) => {
        const currentGoals = targetSettings?.monthlyGoals || {}
        await settingsOps.set("targets", {
            monthlyGoals: {
                ...currentGoals,
                [monthStr]: value
            }
        })
        setEditingTargetMonth(null)
        setTargetInputValue("")
    }


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

    // --- Management Logic (Yearly Aggregation) - MEMOIZED ---
    const managementData = useMemo(() => {
        const monthlyData: Record<string, {
            revenue: number,
            guests: number,
            bookings: number,
            days: Record<string, any>,
            topGuests: Record<string, number>,
            topRituals: Record<string, number>,
            topStaff: Record<string, number>,
            guestEmails: Set<string>,
            sources: Record<string, { count: number, revenue: number }> // Source tracking
        }> = {}

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

        // Initialize Scale
        months.forEach(m => monthlyData[m] = { revenue: 0, guests: 0, bookings: 0, days: {}, topGuests: {}, topRituals: {}, topStaff: {}, guestEmails: new Set(), sources: {} })

        bookings.forEach(b => {
            // Parse Date
            const d = new Date(b.date || "")
            if (d.getFullYear() !== selectedYear) return
            if (!["Confirmed", "Arrived", "In Ritual", "Complete"].includes(b.status)) return

            const monthName = months[d.getMonth()]
            const dayNum = d.getDate()

            // Calculate Value
            let val = 0
            if (b.priceSnapshot !== undefined) val = b.priceSnapshot
            else {
                const t = treatments.find(tr => tr.title === b.treatment)
                val = t ? t.price_thb * b.guests : 0
            }

            // Aggregation - Core
            monthlyData[monthName].revenue += val
            monthlyData[monthName].guests += b.guests
            monthlyData[monthName].bookings += 1

            // Aggregation - Leaderboards
            const guestName = b.contact?.name || "Unknown"
            monthlyData[monthName].topGuests[guestName] = (monthlyData[monthName].topGuests[guestName] || 0) + val

            // Track guest email for retention (if email contact method)
            if (b.contact?.method?.toLowerCase() === 'email' && b.contact?.handle) {
                monthlyData[monthName].guestEmails.add(b.contact.handle.toLowerCase())
            }

            monthlyData[monthName].topRituals[b.treatment] = (monthlyData[monthName].topRituals[b.treatment] || 0) + val

            if (b.salesmanId) {
                const s = salesmen.find(sm => sm.id === b.salesmanId)
                const sName = s ? s.nickname : "Unknown"
                monthlyData[monthName].topStaff[sName] = (monthlyData[monthName].topStaff[sName] || 0) + val
            }

            // Source Tracking (read from contact.source)
            const source = b.contact?.source || "Unknown"
            if (!monthlyData[monthName].sources[source]) {
                monthlyData[monthName].sources[source] = { count: 0, revenue: 0 }
            }
            monthlyData[monthName].sources[source].count += 1
            monthlyData[monthName].sources[source].revenue += val

            // Daily Breakdown
            if (!monthlyData[monthName].days[dayNum]) monthlyData[monthName].days[dayNum] = { revenue: 0, guests: 0, bookings: 0 }
            monthlyData[monthName].days[dayNum].revenue += val
            monthlyData[monthName].days[dayNum].guests += b.guests
            monthlyData[monthName].days[dayNum].bookings += 1
        })
        return monthlyData
    }, [bookings, treatments, salesmen, selectedYear])

    // --- PREVIOUS YEAR DATA (for YoY Comparison) ---
    const previousYearData = useMemo(() => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const monthlyRevenue: Record<string, number> = {}
        months.forEach(m => monthlyRevenue[m] = 0)

        bookings.forEach(b => {
            const d = new Date(b.date || "")
            if (d.getFullYear() !== selectedYear - 1) return
            if (!["Confirmed", "Arrived", "In Ritual", "Complete"].includes(b.status)) return

            const monthName = months[d.getMonth()]
            let val = 0
            if (b.priceSnapshot !== undefined) val = b.priceSnapshot
            else {
                const t = treatments.find(tr => tr.title === b.treatment)
                val = t ? t.price_thb * b.guests : 0
            }
            monthlyRevenue[monthName] += val
        })
        return monthlyRevenue
    }, [bookings, treatments, selectedYear])

    // YoY Comparison Helper
    const getYoYChange = (monthIndex: number) => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const currentRev = managementData[months[monthIndex]]?.revenue || 0
        const previousRev = previousYearData[months[monthIndex]] || 0

        if (previousRev === 0) return { change: null, previousRev: 0, hasData: false }

        const change = Math.round(((currentRev - previousRev) / previousRev) * 100)
        return { change, previousRev, hasData: true }
    }

    // Find Fiscal Leader (Best Month)
    const maxRevenueMonth = Object.entries(managementData).reduce((max, [m, d]) => d.revenue > (managementData[max]?.revenue || 0) ? m : max, "")

    // --- NET PROFIT CALCULATION ---
    // Total Payroll = Sum of all staff base salaries (monthly)
    const totalPayroll = salesmen.filter(s => s.active).reduce((sum, s) => sum + (s.baseSalary || 0), 0)

    // Get yearly expenses for selected year
    const yearlyExpenses = expenses.filter(e => e.month.startsWith(String(selectedYear)))
    const totalYearlyExpenses = yearlyExpenses.reduce((sum, e) => sum + e.amount, 0)
    const totalYearlyRevenue = Object.values(managementData).reduce((sum, d) => sum + d.revenue, 0)
    const yearlyNetProfit = totalYearlyRevenue - (totalPayroll * 12) - totalYearlyExpenses

    // --- LABOR COST RATIO ---
    // Total Labor = Base Salaries + All Commissions paid out
    const totalYearlyCommissions = bookings
        .filter(b => {
            const d = new Date(b.date || "")
            return d.getFullYear() === selectedYear && ["Confirmed", "Arrived", "In Ritual", "Complete"].includes(b.status)
        })
        .reduce((sum, b) => sum + (b.commissionAmount || 0), 0)

    const totalYearlyLaborCost = (totalPayroll * 12) + totalYearlyCommissions
    const laborCostRatio = totalYearlyRevenue > 0 ? Math.round((totalYearlyLaborCost / totalYearlyRevenue) * 100) : 0

    // --- CANCELLATION RATE ---
    const yearlyBookings = bookings.filter(b => {
        const d = new Date(b.date || "")
        return d.getFullYear() === selectedYear
    })
    const cancelledBookings = yearlyBookings.filter(b => b.status === "Cancelled")
    const cancellationRate = yearlyBookings.length > 0 ? Math.round((cancelledBookings.length / yearlyBookings.length) * 100) : 0

    // Per-month cancellation rate helper
    const getMonthlyCancellationRate = (monthIndex: number) => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const monthBookings = bookings.filter(b => {
            const d = new Date(b.date || "")
            return d.getFullYear() === selectedYear && d.getMonth() === monthIndex
        })
        const cancelled = monthBookings.filter(b => b.status === "Cancelled").length
        return monthBookings.length > 0 ? Math.round((cancelled / monthBookings.length) * 100) : 0
    }


    // --- PER-MONTH CALCULATIONS ---
    const getMonthlyNetProfit = (monthIndex: number) => {
        const monthStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}`
        const monthExpenses = expenses.filter(e => e.month === monthStr).reduce((sum, e) => sum + e.amount, 0)
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const monthRevenue = managementData[months[monthIndex]]?.revenue || 0
        return monthRevenue - totalPayroll - monthExpenses
    }

    // --- TARGET PROGRESS ---
    const getMonthlyTarget = (monthIndex: number) => {
        const monthStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}`
        return targetSettings?.monthlyGoals?.[monthStr] || 0
    }

    // --- MONTHLY COST BREAKDOWN (Labor + Other) ---
    const getMonthlyCostBreakdown = (monthIndex: number) => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const monthRevenue = managementData[months[monthIndex]]?.revenue || 0

        // 1. Labor - Filter bookings for this month
        const monthBookings = bookings.filter(b => {
            const d = new Date(b.date || "")
            return d.getFullYear() === selectedYear && d.getMonth() === monthIndex &&
                ["Confirmed", "Arrived", "In Ritual", "Complete"].includes(b.status)
        })

        // Sales commissions
        const monthCommissions = monthBookings.reduce((sum, b) => sum + (b.commissionAmount || 0), 0)

        // Therapist/Outsource costs
        const monthTherapistCosts = monthBookings.reduce((sum, b) => sum + (b.therapistCostSnapshot || 0), 0)

        // Total labor = base payroll + commissions + therapist costs
        const monthLaborCost = totalPayroll + monthCommissions + monthTherapistCosts

        // 2. Other Expenses
        const monthStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}` // 2025-01
        const monthStrSimple = `${selectedYear}-${monthIndex + 1}` // 2025-1

        const monthOtherExpenses = expenses
            .filter(e => e.month === monthStr || e.month === monthStrSimple)
            .reduce((sum, e) => sum + (e.amount || 0), 0)

        const totalCost = monthLaborCost + monthOtherExpenses
        const laborRatio = monthRevenue > 0 ? Math.round((monthLaborCost / monthRevenue) * 100) : 0
        const totalRatio = monthRevenue > 0 ? Math.round((totalCost / monthRevenue) * 100) : 0

        return {
            laborRatio,
            totalRatio,
            baseSalary: totalPayroll,
            commissions: monthCommissions,
            therapistCosts: monthTherapistCosts,
            laborTotal: monthLaborCost,
            otherExpenses: monthOtherExpenses,
            totalCost: totalCost,
            revenue: monthRevenue
        }
    }



    // --- CUSTOMER RETENTION RATE (by Email) ---
    const calculateRetention = (monthIndex: number) => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const currentMonthData = managementData[months[monthIndex]]
        if (!currentMonthData || currentMonthData.guestEmails.size === 0) return { returning: 0, new: 0, rate: 0 }

        // Get all guest emails from previous months of this year
        const previousGuestEmails = new Set<string>()
        for (let i = 0; i < monthIndex; i++) {
            const prevData = managementData[months[i]]
            if (prevData) {
                prevData.guestEmails.forEach(email => previousGuestEmails.add(email))
            }
        }

        // Also check previous year's data (from bookings)
        bookings.forEach(b => {
            const d = new Date(b.date || "")
            if (d.getFullYear() < selectedYear && b.contact?.method?.toLowerCase() === 'email' && b.contact?.handle) {
                previousGuestEmails.add(b.contact.handle.toLowerCase())
            }
        })

        // Count returning vs new by email
        let returning = 0
        let newGuests = 0
        currentMonthData.guestEmails.forEach(email => {
            if (previousGuestEmails.has(email)) returning++
            else newGuests++
        })
        const total = returning + newGuests
        return { returning, new: newGuests, rate: total > 0 ? Math.round((returning / total) * 100) : 0 }
    }



    // Helper: CSV Export
    const downloadCSV = (month: string, data: any) => {
        const headers = ["Date", "Revenue", "Guests", "AOV"]
        const rows = Object.entries(data.days).map(([day, d]: any) => {
            return [`${month} ${day}, ${selectedYear}`, d.revenue, d.guests, Math.round(d.revenue / d.bookings)]
        })

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `YAREY_Report_${month}_${selectedYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


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
            {/* Filter Controls Header */}
            <div className="col-span-2 flex justify-between items-center bg-card border border-primary/10 p-2 rounded-full sticky top-4 z-50 shadow-2xl backdrop-blur-md print:hidden">
                {/* View Mode Toggle */}
                <div className="flex gap-1 bg-white/5 p-1 rounded-full">
                    <button onClick={() => setViewMode("live")} className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-widest transition-all ${viewMode === "live" ? "bg-primary text-[#051818]" : "text-foreground/40 hover:text-foreground"}`}>
                        Live Pulse
                    </button>
                    <button onClick={() => setViewMode("management")} className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-widest transition-all ${viewMode === "management" ? "bg-primary text-[#051818]" : "text-foreground/40 hover:text-foreground"}`}>
                        Yearly Report
                    </button>
                </div>

                {/* Context Controls */}
                {viewMode === "live" ? (
                    <div className="flex bg-[#0c2627] backdrop-blur-sm p-1 rounded-full border border-primary/20">
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
                ) : (
                    <div className="flex gap-2">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-[#0c2627] text-primary font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-full border border-primary/20 focus:outline-none"
                        >
                            <option value={2025}>2025</option>
                            <option value={2026}>2026</option>
                        </select>
                    </div>
                )}
            </div>

            {/* --- MANAGEMENT VIEW --- */}
            {viewMode === "management" && (
                <div className="col-span-2 space-y-8">

                    {/* Yearly KPI Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Gross Revenue with YoY */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-primary/10 p-6 rounded-[2rem]">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs uppercase tracking-widest text-foreground/40 font-bold">Gross Revenue</span>
                                <TrendingUp className="w-4 h-4 text-primary opacity-50" />
                            </div>
                            <div className="font-serif text-3xl text-foreground">฿{totalYearlyRevenue.toLocaleString()}</div>
                            {(() => {
                                const prevYearTotal = Object.values(previousYearData).reduce((sum, v) => sum + v, 0)
                                if (prevYearTotal > 0) {
                                    const yoyChange = Math.round(((totalYearlyRevenue - prevYearTotal) / prevYearTotal) * 100)
                                    return (
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] text-foreground/30">vs {selectedYear - 1}: ฿{prevYearTotal.toLocaleString()}</span>
                                            <span className={`text-xs font-bold font-mono ${yoyChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                {yoyChange > 0 ? "+" : ""}{yoyChange}%
                                            </span>
                                        </div>
                                    )
                                }
                                return <div className="text-[10px] text-foreground/30 mt-2">Before expenses</div>
                            })()}
                        </motion.div>

                        {/* Net Profit */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`p-6 rounded-[2rem] border ${yearlyNetProfit >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs uppercase tracking-widest text-foreground/40 font-bold">Net Profit</span>
                                <DollarSign className={`w-4 h-4 ${yearlyNetProfit >= 0 ? "text-emerald-400" : "text-red-400"} opacity-50`} />
                            </div>
                            <div className={`font-serif text-3xl ${yearlyNetProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {yearlyNetProfit < 0 ? "-" : ""}฿{Math.abs(yearlyNetProfit).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-foreground/30 mt-2">
                                Margin: {totalYearlyRevenue > 0 ? Math.round((yearlyNetProfit / totalYearlyRevenue) * 100) : 0}%
                            </div>
                        </motion.div>

                        {/* Expenses Summary */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-primary/10 p-6 rounded-[2rem]">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs uppercase tracking-widest text-foreground/40 font-bold">Total Costs</span>
                                <RefreshCw className="w-4 h-4 text-orange-400 opacity-50" />
                            </div>
                            <div className="font-serif text-3xl text-foreground/80">฿{((totalPayroll * 12) + totalYearlyExpenses).toLocaleString()}</div>
                            <div className="text-[10px] text-foreground/30 mt-2">
                                Payroll: ฿{(totalPayroll * 12).toLocaleString()} + OpEx: ฿{totalYearlyExpenses.toLocaleString()}
                            </div>
                        </motion.div>
                    </div>

                    {/* Booking Source Analytics */}
                    {(() => {
                        // Aggregate sources across all months
                        const allSources: Record<string, { count: number, revenue: number }> = {}
                        Object.values(managementData).forEach(monthData => {
                            Object.entries(monthData.sources).forEach(([source, data]) => {
                                if (!allSources[source]) allSources[source] = { count: 0, revenue: 0 }
                                allSources[source].count += data.count
                                allSources[source].revenue += data.revenue
                            })
                        })

                        const totalBookingsCount = Object.values(allSources).reduce((sum, s) => sum + s.count, 0)
                        const sortedSources = Object.entries(allSources).sort((a, b) => b[1].revenue - a[1].revenue)

                        // Color map for sources
                        const sourceColors: Record<string, string> = {
                            "Walk-in": "bg-emerald-400",
                            "Online": "bg-blue-400",
                            "Phone": "bg-purple-400",
                            "Social Media": "bg-pink-400",
                            "Referral": "bg-orange-400",
                            "Agent": "bg-cyan-400",
                            "Repeat": "bg-yellow-400",
                            "Unknown": "bg-gray-400"
                        }

                        if (totalBookingsCount === 0) return null

                        return (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card border border-primary/10 p-6 rounded-[2rem]">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-xs uppercase tracking-widest text-foreground/40 font-bold">Booking Sources</span>
                                    <span className="text-xs text-foreground/30">{totalBookingsCount} bookings</span>
                                </div>

                                {/* Source Bars */}
                                <div className="space-y-3">
                                    {sortedSources.map(([source, data]) => {
                                        const percentage = Math.round((data.count / totalBookingsCount) * 100)
                                        const revenuePercentage = totalYearlyRevenue > 0 ? Math.round((data.revenue / totalYearlyRevenue) * 100) : 0
                                        const color = sourceColors[source] || "bg-primary"

                                        return (
                                            <div key={source}>
                                                <div className="flex justify-between items-center text-[11px] mb-1">
                                                    <span className="text-foreground/70">{source}</span>
                                                    <div className="flex items-center gap-3 text-foreground/40">
                                                        <span>{data.count} bookings ({revenuePercentage}%)</span>
                                                        <span className="text-primary font-mono">฿{data.revenue.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${color} transition-all duration-500`}
                                                        style={{ width: `${revenuePercentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        )
                    })()}

                    {/* Yearly Overview Chart */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-primary/10 p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.3)]">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40">Revenue by Month {selectedYear}</h3>
                            </div>
                            <Activity className="text-primary opacity-50" />
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={Object.entries(managementData).map(([name, d]) => ({ name, ...d }))}>
                                    <XAxis dataKey="name" stroke="#ffffff30" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#051818', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                        itemStyle={{ color: '#fff' }}
                                        cursor={{ fill: '#ffffff05' }}
                                    />
                                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Monthly Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Object.entries(managementData).map(([month, data], index) => {
                            // MoM Calculation
                            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                            const prevMonthData = index > 0 ? Object.values(managementData)[index - 1] : null
                            const growth = prevMonthData && prevMonthData.revenue > 0
                                ? ((data.revenue - prevMonthData.revenue) / prevMonthData.revenue) * 100
                                : 0

                            const isFiscalLeader = month === maxRevenueMonth && data.revenue > 0

                            return (
                                <div key={month} onClick={() => setExpandedMonth(expandedMonth === month ? null : month)} className={`p-6 rounded-[2rem] border transition-all cursor-pointer hover:scale-[1.02] relative overflow-hidden ${expandedMonth === month ? "bg-primary/10 border-primary shadow-lg ring-1 ring-primary/50 col-span-1 md:col-span-2 lg:col-span-4 row-span-2" : isFiscalLeader ? "bg-gradient-to-br from-[#FFD700]/10 to-card border-[#FFD700]/40" : "bg-card border-primary/10 hover:border-primary/30"}`}>
                                    {isFiscalLeader && <div className="absolute top-0 right-0 p-2"><Trophy className="w-4 h-4 text-[#FFD700] opacity-50" /></div>}

                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-xl font-serif font-bold text-foreground">{month}</span>
                                        {data.bookings > 0 && (
                                            <div className="flex gap-2">
                                                {/* Growth Badge */}
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${growth >= 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                                                    {growth > 0 ? "+" : ""}{growth.toFixed(1)}%
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Current Month Forecast */}
                                    {selectedYear === new Date().getFullYear() && new Date().getMonth() === index && data.bookings > 0 && (
                                        <div className="mb-4 text-[10px] bg-primary/5 border border-primary/10 p-2 rounded-lg flex justify-between items-center text-primary/80">
                                            <span className="uppercase tracking-widest opacity-70">Pacing</span>
                                            <span className="font-mono font-bold">
                                                ~฿{Math.round((data.revenue / new Date().getDate()) * new Date(selectedYear, index + 1, 0).getDate()).toLocaleString()}
                                            </span>
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs text-foreground/40 uppercase tracking-wider">Revenue</span>
                                            <span className="font-mono text-lg font-bold text-primary">฿{data.revenue.toLocaleString()}</span>
                                        </div>
                                        {/* YoY Comparison */}
                                        {(() => {
                                            const yoy = getYoYChange(index)
                                            if (yoy.hasData) {
                                                return (
                                                    <div className="flex justify-between items-end">
                                                        <span className="text-xs text-foreground/40 uppercase tracking-wider">vs {selectedYear - 1}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-[10px] text-foreground/30">฿{yoy.previousRev.toLocaleString()}</span>
                                                            <span className={`font-mono text-xs font-bold ${yoy.change! >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                                {yoy.change! > 0 ? "+" : ""}{yoy.change}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                            return null
                                        })()}
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs text-foreground/40 uppercase tracking-wider">Guests</span>
                                            <span className="font-mono text-sm text-foreground">{data.guests}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs text-foreground/40 uppercase tracking-wider">AOV</span>
                                            <span className="font-mono text-sm text-emerald-400">฿{data.bookings ? Math.round(data.revenue / data.bookings).toLocaleString() : 0}</span>
                                        </div>
                                    </div>
                                    {/* Monthly Cost Breakdown */}
                                    {data.revenue > 0 && (() => {
                                        const costs = getMonthlyCostBreakdown(index)
                                        return (
                                            <div className="pt-2 mt-2 border-t border-white/5">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-foreground/40 uppercase tracking-wider flex items-center gap-1">
                                                        <Percent className="w-3 h-3" /> Costs
                                                    </span>
                                                    <span className={`font-mono text-sm font-bold ${costs.totalRatio <= 50 ? "text-emerald-400" : costs.totalRatio <= 70 ? "text-orange-400" : "text-red-400"}`}>
                                                        {costs.totalRatio}%
                                                    </span>
                                                </div>
                                                <div className="mt-1 space-y-0.5 text-[9px] text-foreground/30">
                                                    <div className="flex justify-between">
                                                        <span>Base Salary</span>
                                                        <span className="font-mono">฿{costs.baseSalary.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Sales Commission</span>
                                                        <span className="font-mono">฿{costs.commissions.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Therapist/Outsource</span>
                                                        <span className="font-mono">฿{costs.therapistCosts.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between pt-0.5 border-t border-white/5 text-foreground/40">
                                                        <span>Labor Subtotal</span>
                                                        <span className="font-mono">฿{costs.laborTotal.toLocaleString()} <span className="opacity-50">({costs.laborRatio}%)</span></span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Other Expenses</span>
                                                        <span className="font-mono">฿{costs.otherExpenses.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between pt-1 border-t border-white/5 text-foreground/50">
                                                        <span>Total Costs</span>
                                                        <span className="font-mono font-bold">฿{costs.totalCost.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })()}

                                    {/* Target Progress Bar - Always visible with Edit */}
                                    {(() => {
                                        const monthStr = `${selectedYear}-${String(index + 1).padStart(2, '0')}`
                                        const target = getMonthlyTarget(index)
                                        const isEditing = editingTargetMonth === monthStr

                                        // Editing Mode
                                        if (isEditing) {
                                            return (
                                                <div className="mt-4 bg-primary/5 p-3 rounded-lg border border-primary/20" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center gap-2 text-[10px] mb-2">
                                                        <Target className="w-3 h-3 text-primary" />
                                                        <span className="uppercase tracking-widest text-primary font-bold">Set Monthly Target</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="number"
                                                            placeholder="e.g. 500000"
                                                            value={targetInputValue}
                                                            onChange={(e) => setTargetInputValue(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && targetInputValue) {
                                                                    saveMonthlyTarget(monthStr, Number(targetInputValue))
                                                                } else if (e.key === 'Escape') {
                                                                    setEditingTargetMonth(null)
                                                                    setTargetInputValue("")
                                                                }
                                                            }}
                                                            className="flex-1 bg-black/30 border border-primary/30 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-primary"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                if (targetInputValue) saveMonthlyTarget(monthStr, Number(targetInputValue))
                                                            }}
                                                            className="bg-primary text-black font-bold text-xs px-3 py-2 rounded-lg hover:bg-primary/80 transition-colors"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingTargetMonth(null)
                                                                setTargetInputValue("")
                                                            }}
                                                            className="bg-white/10 text-white/60 text-xs px-3 py-2 rounded-lg hover:bg-white/20 transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        }

                                        // Display Mode - Has Target
                                        if (target > 0) {
                                            const progress = Math.min((data.revenue / target) * 100, 100)
                                            return (
                                                <div className="mt-4 group/target">
                                                    <div className="flex justify-between items-center text-[10px] mb-1">
                                                        <span className="uppercase tracking-widest text-foreground/40 flex items-center gap-1">
                                                            <Target className="w-3 h-3" /> Goal
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setEditingTargetMonth(monthStr)
                                                                    setTargetInputValue(String(target))
                                                                }}
                                                                className="opacity-0 group-hover/target:opacity-100 transition-opacity ml-1"
                                                            >
                                                                <Edit2 className="w-3 h-3 text-primary hover:text-primary/80" />
                                                            </button>
                                                        </span>
                                                        <span className={`font-mono font-bold ${progress >= 100 ? "text-emerald-400" : "text-foreground/60"}`}>{Math.round(progress)}%</span>
                                                    </div>
                                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-500 ${progress >= 100 ? "bg-emerald-400" : progress >= 75 ? "bg-primary" : "bg-orange-400"}`}
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                    <div className="text-[9px] text-foreground/30 mt-1 text-right">Target: ฿{target.toLocaleString()}</div>
                                                </div>
                                            )
                                        }

                                        // Display Mode - No Target
                                        return (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setEditingTargetMonth(monthStr)
                                                    setTargetInputValue("")
                                                }}
                                                className="mt-4 w-full text-left text-[9px] text-foreground/30 hover:text-primary italic flex items-center gap-1 p-2 rounded-lg hover:bg-primary/5 transition-colors border border-transparent hover:border-primary/20"
                                            >
                                                <Target className="w-3 h-3" /> Click to set monthly target
                                            </button>
                                        )
                                    })()}

                                    {/* Retention Rate (Only show if there's data) */}
                                    {data.bookings > 0 && (() => {
                                        const retention = calculateRetention(index)
                                        if (retention.returning + retention.new > 0) {
                                            return (
                                                <div className="mt-4 pt-3 border-t border-white/5">
                                                    <div className="flex justify-between items-center text-[10px]">
                                                        <span className="uppercase tracking-widest text-foreground/40 flex items-center gap-1"><UserCheck className="w-3 h-3" /> Retention</span>
                                                        <span className={`font-bold ${retention.rate >= 50 ? "text-emerald-400" : "text-orange-400"}`}>{retention.rate}%</span>
                                                    </div>
                                                    <div className="flex gap-2 mt-1 text-[9px]">
                                                        <span className="text-foreground/30">Returning: {retention.returning}</span>
                                                        <span className="text-foreground/30">New: {retention.new}</span>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    })()
                                    }

                                    {/* Expanded View: Report & Details */}
                                    {
                                        expandedMonth === month && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-8 border-t border-primary/10 pt-4 cursor-default" onClick={(e) => e.stopPropagation()}>

                                                {/* Highlights Section */}
                                                {/* Highlights Section */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                                    {/* MVP Guests */}
                                                    <div className="bg-[#051818]/60 p-6 rounded-[1.5rem] border border-primary/5 relative overflow-hidden">
                                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                                                        <h4 className="text-[10px] uppercase font-bold tracking-widest text-foreground/40 mb-4 flex items-center gap-2">
                                                            <Star className="w-3 h-3 text-primary" /> MVP Guests
                                                        </h4>
                                                        <div className="space-y-3">
                                                            {Object.entries(data.topGuests).sort(([, a], [, b]) => b - a).slice(0, 3).map(([name, rev], i) => (
                                                                <div key={name} className="flex justify-between items-center text-xs">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center font-serif font-bold text-[10px] ${i === 0 ? "bg-[#FFD700] text-black shadow-[0_0_10px_#FFD700]" : i === 1 ? "bg-[#C0C0C0] text-black" : "bg-[#CD7F32] text-black"}`}>
                                                                            {i + 1}
                                                                        </div>
                                                                        <span className={`text-foreground/90 ${i === 0 ? "font-bold" : ""}`}>{name}</span>
                                                                    </div>
                                                                    <span className="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md">฿{rev.toLocaleString()}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Top Rituals */}
                                                    <div className="bg-[#051818]/60 p-6 rounded-[1.5rem] border border-primary/5 relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full blur-2xl" />
                                                        <h4 className="text-[10px] uppercase font-bold tracking-widest text-foreground/40 mb-4 flex items-center gap-2">
                                                            <Activity className="w-3 h-3 text-purple-400" /> Top Rituals
                                                        </h4>
                                                        <div className="space-y-3">
                                                            {Object.entries(data.topRituals).sort(([, a], [, b]) => b - a).slice(0, 3).map(([name, rev], i) => (
                                                                <div key={name} className="flex justify-between items-center text-xs">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] border ${i === 0 ? "border-[#FFD700]/50 text-[#FFD700]" : "border-white/10 text-foreground/40"}`}>
                                                                            {i + 1}
                                                                        </div>
                                                                        <span className="text-foreground/80">{name}</span>
                                                                    </div>
                                                                    <span className="font-mono text-purple-400 font-bold">{Math.round((rev / data.revenue) * 100)}%</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Top Staff */}
                                                    <div className="bg-[#051818]/60 p-6 rounded-[1.5rem] border border-primary/5 relative overflow-hidden">
                                                        <div className="absolute bottom-0 right-0 w-16 h-16 bg-orange-500/10 rounded-full blur-2xl" />
                                                        <h4 className="text-[10px] uppercase font-bold tracking-widest text-foreground/40 mb-4 flex items-center gap-2">
                                                            <Trophy className="w-3 h-3 text-orange-400" /> Top Sales
                                                        </h4>
                                                        <div className="space-y-3">
                                                            {Object.entries(data.topStaff).sort(([, a], [, b]) => b - a).slice(0, 3).map(([name, rev], i) => (
                                                                <div key={name} className="flex justify-between items-center text-xs">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] border ${i === 0 ? "border-[#FFD700]/50 text-[#FFD700]" : "border-white/10 text-foreground/40"}`}>
                                                                            {i + 1}
                                                                        </div>
                                                                        <span className="text-foreground/80">{name}</span>
                                                                    </div>
                                                                    <span className="font-mono text-orange-400 font-bold">฿{rev.toLocaleString()}</span>
                                                                </div>
                                                            ))}
                                                            {Object.keys(data.topStaff).length === 0 && <div className="text-center text-foreground/20 italic text-[10px]">No sales data</div>}
                                                        </div>
                                                    </div>

                                                    {/* Top Sources */}
                                                    <div className="bg-[#051818]/60 p-6 rounded-[1.5rem] border border-primary/5 relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-2xl" />
                                                        <h4 className="text-[10px] uppercase font-bold tracking-widest text-foreground/40 mb-4 flex items-center gap-2">
                                                            <Share2 className="w-3 h-3 text-blue-400" /> Top Sources
                                                        </h4>
                                                        <div className="space-y-3">
                                                            {Object.keys(data.sources).length === 0 ? (
                                                                <div className="text-xs text-foreground/30 italic py-4 text-center">No source data</div>
                                                            ) : (
                                                                Object.entries(data.sources)
                                                                    .sort(([, a], [, b]) => b.revenue - a.revenue)
                                                                    .slice(0, 3)
                                                                    .map(([source, sourceData], i) => (
                                                                        <div key={source} className="flex justify-between items-center text-xs">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] border ${i === 0 ? "border-[#FFD700]/50 text-[#FFD700]" : "border-white/10 text-foreground/40"}`}>
                                                                                    {i + 1}
                                                                                </div>
                                                                                <span className="text-foreground/80">{source}</span>
                                                                            </div>
                                                                            <span className="font-mono text-blue-400 font-bold">
                                                                                <span className="text-[10px] opacity-70 mr-1">฿{sourceData.revenue.toLocaleString()}</span>
                                                                                ({data.revenue > 0 ? Math.round((sourceData.revenue / data.revenue) * 100) : 0}%)
                                                                            </span>
                                                                        </div>
                                                                    ))
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="text-xs font-bold uppercase text-foreground/40">Daily Breakdown</h4>
                                                    <button onClick={() => downloadCSV(month, data)} className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors print:hidden">
                                                        <Download className="w-3 h-3" /> Export CSV
                                                    </button>
                                                </div>

                                                <table className="w-full text-left text-xs">
                                                    <thead>
                                                        <tr className="text-foreground/30 border-b border-primary/5">
                                                            <th className="pb-2 font-normal uppercase tracking-wider">Date</th>
                                                            <th className="pb-2 font-normal uppercase tracking-wider text-right">Rev</th>
                                                            <th className="pb-2 font-normal uppercase tracking-wider text-right">Guests</th>
                                                            <th className="pb-2 font-normal uppercase tracking-wider text-right">AOV</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {Object.entries(data.days).map(([day, d]: any) => (
                                                            <tr key={day} className="border-b border-primary/5 text-foreground/60 hover:bg-white/5">
                                                                <td className="py-2 font-mono">{month} {day}</td>
                                                                <td className="py-2 text-right font-bold text-emerald-400">฿{d.revenue.toLocaleString()}</td>
                                                                <td className="py-2 text-right">{d.guests}</td>
                                                                <td className="py-2 text-right opacity-50">฿{Math.round(d.revenue / d.bookings).toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                        {Object.keys(data.days).length === 0 && <tr><td colSpan={4} className="py-4 text-center italic opacity-30">No data for this month</td></tr>}
                                                    </tbody>
                                                </table>
                                            </motion.div>
                                        )
                                    }
                                </div>
                            )
                        })}
                    </div>

                </div>
            )
            }

            {/* --- LIVE PULSE VIEW (Original) --- */}
            {
                viewMode === "live" && (
                    <>

                        {/* KPI Grid */}
                        <div className="col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Revenue Card (Expanded) */}
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="md:col-span-2 bg-card border border-primary/10 p-6 rounded-[2rem] relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40">Total Revenue</h3>
                                        <div className="font-serif text-3xl md:text-4xl text-foreground mt-1">฿{totalRevenue.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" /> +12.5%
                                    </div>
                                </div>
                                {/* Tiny Area Chart for Trend */}
                                <div className="h-16 w-full opacity-50">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={bookings.slice(0, 10).map((b, i) => ({ val: (b.priceSnapshot || 0) }))}>
                                            <defs>
                                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area type="monotone" dataKey="val" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>

                            {/* AOV Card */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-primary/10 p-6 rounded-[2rem] flex flex-col justify-between">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40">Avg. Order Value</h3>
                                    <div className="font-serif text-2xl text-foreground mt-1">฿{filteredBookings.length ? Math.round(totalRevenue / filteredBookings.length).toLocaleString() : 0}</div>
                                </div>
                                <div className="mt-4 text-[10px] text-foreground/40">Per Guest Transaction</div>
                            </motion.div>

                            {/* Conversion/Occupancy Card */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-primary/10 p-6 rounded-[2rem] flex flex-col justify-between">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40">Guests</h3>
                                    <div className="font-serif text-2xl text-foreground mt-1">{filteredBookings.reduce((acc, b) => acc + b.guests, 0)}</div>
                                </div>
                                <div className="mt-4 flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-6 h-6 rounded-full bg-white/10 border border-black backdrop-blur-sm" />
                                    ))}
                                </div>
                            </motion.div>
                        </div>


                        {/* Flow Rate & Ritual Mix */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Flow Rate Chart */}
                            <div className="bg-card border border-primary/10 p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.3)]">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40">Flow Rate</h3>
                                        <p className="text-xs text-foreground/30">Guest Density by Time Phase</p>
                                    </div>
                                    <Users className="w-5 h-5 text-blue-400" />
                                </div>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={Object.entries(timeDistribution).map(([name, value]) => ({ name, value }))}>
                                            <XAxis dataKey="name" stroke="#ffffff30" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#051818', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                                itemStyle={{ color: '#fff' }}
                                                cursor={{ fill: '#ffffff05' }}
                                            />
                                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40}>
                                                {
                                                    Object.entries(timeDistribution).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 1 ? '#fbbf24' : '#3b82f6'} />
                                                    ))
                                                }
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Ritual Mix Pie */}
                            <div className="bg-card border border-primary/10 p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.3)]">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40">Ritual Mix</h3>
                                        <p className="text-xs text-foreground/30">Popular Treatments</p>
                                    </div>
                                    <Activity className="w-5 h-5 text-purple-400" />
                                </div>
                                <div className="h-64 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={topRituals.map(([name, value]) => ({ name, value }))}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {topRituals.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'][index % 4]} stroke="rgba(0,0,0,0)" />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#051818', border: '1px solid #ffffff10', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    {/* Center Text */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-2xl font-serif text-foreground">{filteredBookings.length}</span>
                                        <span className="text-[9px] uppercase tracking-widest text-foreground/30">Total</span>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                    {topRituals.map(([name, count], i) => (
                                        <div key={name} className="flex items-center gap-2 text-[10px] text-foreground/60 bg-white/5 px-2 py-1 rounded-full">
                                            <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'][i % 4] }} />
                                            {name}
                                        </div>
                                    ))}
                                </div>
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
                    </>
                )
            }

        </div >
    )
}
