"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Lock, DollarSign, Calendar, Printer, TrendingUp, TrendingDown,
    Plus, Trash2, User, Edit2, X, Shield, Wallet, Users2, Receipt,
    Briefcase, Eye, EyeOff, RefreshCw, RotateCcw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirestoreCRUD, useFirestoreDoc, useFirestoreCollection } from "@/hooks/useFirestore"
import { Booking, Salesman, Voucher } from "@/types"
import { generatePayslip } from "@/lib/pdf/generatePayslip"

// Types
interface PayrollEntry {
    staffId: string
    name: string
    role: string
    baseSalary: number
    commissionCount: number
    salesComm: number
    voucherComm: number
    hourlyRate?: number
    serviceHours: number
    serviceComm: number
    totalPayout: number
}

interface Expense {
    id: string
    month: string
    title: string
    amount: number
    category: string
}

interface RecurringExpense {
    id: string
    title: string
    amount: number
    category: string
    active: boolean
}

interface FinanceTabProps {
    bookings: Booking[]
    salesmen: Salesman[]
    expenses: Expense[]
    vouchers: Voucher[]
}

export function FinanceTab({ bookings, salesmen, expenses, vouchers }: FinanceTabProps) {
    // Auth
    const [isUnlocked, setIsUnlocked] = useState(false)
    const [pinInput, setPinInput] = useState("")
    const [pinError, setPinError] = useState(false)

    // Sub-tabs
    const [activeSection, setActiveSection] = useState<"overview" | "payroll" | "expenses" | "staff">("overview")

    // Data & CRUD
    const { data: outsourceSettings } = useFirestoreDoc<{ rate: number }>("settings", "outsource")
    const { data: recurringExpenses } = useFirestoreCollection<RecurringExpense>("recurringExpenses")
    const expenseOps = useFirestoreCRUD("expenses")
    const recurringOps = useFirestoreCRUD("recurringExpenses")
    const salesmanOps = useFirestoreCRUD("salesmen")
    const settingsOps = useFirestoreCRUD("settings")

    // State
    // Default to previous month (current month has incomplete data)
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date()
        d.setMonth(d.getMonth() - 1)
        return d.toISOString().slice(0, 7)
    })
    const [expenseForm, setExpenseForm] = useState({ title: "", amount: "", category: "Fixed Cost" })
    const [recurringForm, setRecurringForm] = useState({ title: "", amount: "", category: "Fixed Cost" })
    const [showRecurring, setShowRecurring] = useState(false)
    const [isApplying, setIsApplying] = useState(false)
    const [isAddingStaff, setIsAddingStaff] = useState(false)
    const [editingStaffId, setEditingStaffId] = useState<string | null>(null)
    const [staffForm, setStaffForm] = useState<Partial<Salesman>>({
        name: "", nickname: "", commissionRate: 0.05, active: true, role: "sales", baseSalary: 15000, hourlyRate: 100
    })
    const [tempOutsourceRate, setTempOutsourceRate] = useState<string>("")

    const OWNER_PIN = "8888"
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        if (pinInput === OWNER_PIN) {
            setIsUnlocked(true)
            setPinError(false)
        } else {
            setPinError(true)
            setPinInput("")
            setTimeout(() => setPinError(false), 2000)
        }
    }

    // === STAFF ACTIONS ===
    const handleAddStaff = async () => {
        if (!staffForm.name || !staffForm.nickname) return
        await salesmanOps.add({ ...staffForm, active: true, joinedDate: new Date().toISOString() })
        setIsAddingStaff(false)
        resetStaffForm()
    }

    const handleUpdateStaff = async () => {
        if (!editingStaffId) return
        await salesmanOps.update(editingStaffId, staffForm)
        setIsAddingStaff(false)
        resetStaffForm()
    }

    const handleDeleteStaff = async (id: string) => {
        if (confirm("Delete this staff member?")) await salesmanOps.remove(id)
    }

    const startEditStaff = (s: Salesman) => {
        setStaffForm(s)
        setEditingStaffId(s.id)
        setIsAddingStaff(true)
    }

    const resetStaffForm = () => {
        setStaffForm({ name: "", nickname: "", commissionRate: 0.05, active: true, role: "sales", baseSalary: 15000, hourlyRate: 100 })
        setEditingStaffId(null)
    }

    // === PAYSLIP ===
    const handlePrintPayslip = (entry: PayrollEntry) => {
        generatePayslip({
            period: selectedMonth,
            generatedDate: new Date().toLocaleDateString(),
            staff: { name: entry.name, role: entry.role, id: entry.staffId },
            earnings: { baseSalary: entry.baseSalary, salesCommission: entry.salesComm, voucherCommission: entry.voucherComm, salesCount: entry.commissionCount, serviceFee: entry.serviceComm, other: 0 },
            deductions: { tax: 0, socialSecurity: 0, other: 0 },
            netPay: entry.totalPayout
        })
    }

    // === EXPENSE ACTIONS ===
    const handleAddExpense = async () => {
        if (!expenseForm.title || !expenseForm.amount) return
        await expenseOps.add({ month: selectedMonth, title: expenseForm.title, amount: Number(expenseForm.amount), category: expenseForm.category })
        setExpenseForm({ title: "", amount: "", category: "Fixed Cost" })
    }

    const handleDeleteExpense = async (id: string) => {
        if (confirm("Remove this expense?")) await expenseOps.remove(id)
    }

    // === RECURRING EXPENSES ===
    const handleAddRecurring = async () => {
        if (!recurringForm.title || !recurringForm.amount) return
        await recurringOps.add({ title: recurringForm.title, amount: Number(recurringForm.amount), category: recurringForm.category, active: true })
        setRecurringForm({ title: "", amount: "", category: "Fixed Cost" })
    }

    const handleDeleteRecurring = async (id: string) => {
        if (confirm("Remove this recurring cost?")) await recurringOps.remove(id)
    }

    const handleApplyRecurring = async () => {
        const activeRecurring = recurringExpenses.filter(r => r.active)
        if (!activeRecurring.length) return alert("No active recurring costs to apply.")
        const existing = expenses.filter(e => e.month === selectedMonth)
        const alreadyApplied = activeRecurring.filter(r => existing.some(e => e.title === r.title && e.amount === r.amount))
        const toApply = activeRecurring.filter(r => !existing.some(e => e.title === r.title && e.amount === r.amount))
        if (!toApply.length) return alert(`All ${alreadyApplied.length} recurring costs already exist for this month.`)
        if (!confirm(`Apply ${toApply.length} recurring cost${toApply.length > 1 ? 's' : ''} to ${selectedMonth}?${alreadyApplied.length ? ` (${alreadyApplied.length} already applied)` : ''}`)) return
        setIsApplying(true)
        for (const r of toApply) {
            await expenseOps.add({ month: selectedMonth, title: r.title, amount: r.amount, category: r.category })
        }
        setIsApplying(false)
        alert(`✅ Applied ${toApply.length} recurring cost${toApply.length > 1 ? 's' : ''}!`)
    }

    // === CALCULATION ENGINE ===
    const payrollData = useMemo(() => {
        if (!bookings.length || !salesmen.length) return { staffEntries: [], outsource: { hours: 0, cost: 0 }, totalRevenue: 0 }

        const filteredBookings = bookings.filter(b => b.date.startsWith(selectedMonth))
        const totalRevenue = filteredBookings.reduce((sum, b) => sum + (b.priceSnapshot || 0), 0)

        const staffMap = new Map<string, PayrollEntry>()
        salesmen.filter(s => s.active).forEach(s => {
            staffMap.set(s.id, {
                staffId: s.id, name: s.nickname, role: s.role || "sales",
                baseSalary: s.baseSalary || 0, hourlyRate: s.hourlyRate || 0,
                commissionCount: 0, salesComm: 0, voucherComm: 0, serviceHours: 0, serviceComm: 0,
                totalPayout: s.baseSalary || 0
            })
        })

        let outsourceHours = 0, outsourceCost = 0

        filteredBookings.forEach(b => {
            if (b.salesmanId && staffMap.has(b.salesmanId)) {
                const entry = staffMap.get(b.salesmanId)!
                entry.commissionCount += 1
                entry.salesComm += (b.commissionAmount || 0)
                entry.totalPayout += (b.commissionAmount || 0)
            }
            if (b.therapistId === "OUTSOURCE") {
                outsourceCost += (b.therapistCostSnapshot || 0)
                outsourceHours += (b.therapistCostSnapshot || 0) / 300
            } else if (b.therapistId && staffMap.has(b.therapistId)) {
                const entry = staffMap.get(b.therapistId)!
                const cost = b.therapistCostSnapshot || 0
                entry.serviceComm += cost
                entry.totalPayout += cost
                if (entry.hourlyRate && entry.hourlyRate > 0) entry.serviceHours += cost / entry.hourlyRate
            }
        })

        // Include voucher commissions in staff payroll
        const filteredVouchers = vouchers.filter(v => {
            if (!v.issuedAt) return false
            return v.issuedAt.startsWith(selectedMonth)
        })

        // Add voucher revenue to total
        const voucherRevenue = filteredVouchers
            .filter(v => v.pricePaid > 0 && !v.giftedFrom && !v.boundType)
            .reduce((sum, v) => sum + v.pricePaid, 0)

        filteredVouchers.forEach(v => {
            if (!v.issuedByStaffId || !v.commissionAmount) return
            if (staffMap.has(v.issuedByStaffId)) {
                const entry = staffMap.get(v.issuedByStaffId)!
                entry.voucherComm += v.commissionAmount
                entry.totalPayout += v.commissionAmount
                entry.commissionCount += 1
            }
        })

        return { staffEntries: Array.from(staffMap.values()), outsource: { hours: outsourceHours, cost: outsourceCost }, totalRevenue: totalRevenue + voucherRevenue }
    }, [bookings, salesmen, selectedMonth, vouchers])

    const activeExpenses = expenses.filter(e => e.month === selectedMonth)
    const totalExpenses = activeExpenses.reduce((sum, e) => sum + e.amount, 0)
    const totalPayroll = payrollData.staffEntries.reduce((sum, e) => sum + e.totalPayout, 0) + payrollData.outsource.cost
    const netProfit = payrollData.totalRevenue - totalPayroll - totalExpenses
    const profitMargin = payrollData.totalRevenue > 0 ? Math.round((netProfit / payrollData.totalRevenue) * 100) : 0
    const activeStaff = salesmen.filter(s => s.active)

    const categoryIcon = (cat: string) => {
        switch (cat) {
            case "Fixed Cost": return "F"
            case "Utilities": return "U"
            case "Supplies": return "S"
            case "Maintenance": return "M"
            case "Marketing": return "Mk"
            default: return "O"
        }
    }

    // ═══════════════════════════════════
    //  PIN GATE
    // ═══════════════════════════════════
    if (!isUnlocked) {
        return (
            <div className="flex items-center justify-center py-16 md:py-24">
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-xs"
                >
                    <div className="text-center space-y-8">
                        {/* Icon */}
                        <div className="relative mx-auto w-16 h-16">
                            <div className="absolute inset-0 rounded-full bg-primary/5 animate-[pulse_3s_ease-in-out_infinite]" />
                            <div className="relative w-16 h-16 rounded-full bg-card/50 backdrop-blur-sm flex items-center justify-center border border-border/30">
                                <Shield className="w-7 h-7 text-primary/60" />
                            </div>
                        </div>

                        {/* Text */}
                        <div>
                            <h2 className="text-xl font-serif text-foreground">Owner Access</h2>
                            <p className="text-foreground/30 text-[10px] uppercase tracking-[0.3em] mt-2">Financial Dashboard</p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleLogin} className="space-y-3">
                            <input
                                type="password"
                                value={pinInput}
                                onChange={(e) => setPinInput(e.target.value)}
                                className={`w-full bg-secondary border rounded-xl px-4 py-3.5 text-center text-foreground font-mono text-lg tracking-[0.4em] focus:outline-none transition-all placeholder:text-foreground/30 placeholder:tracking-[0.2em] placeholder:text-xs ${pinError
                                    ? "border-red-500/40 bg-red-500/5"
                                    : "border-border/30 focus:border-primary/50"
                                    }`}
                                placeholder="ENTER PIN"
                                autoFocus
                            />
                            {pinError && (
                                <motion.p
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-red-400/80 text-[10px] uppercase tracking-widest"
                                >
                                    Incorrect PIN
                                </motion.p>
                            )}
                            <Button
                                type="submit"
                                disabled={!pinInput}
                                className="w-full bg-primary hover:bg-primary/90 text-background font-bold rounded-xl h-12 text-[10px] uppercase tracking-[0.2em] disabled:opacity-30 transition-all"
                            >
                                <Lock className="w-3.5 h-3.5 mr-2" /> Unlock
                            </Button>
                        </form>
                    </div>
                </motion.div>
            </div>
        )
    }

    // ═══════════════════════════════════
    //  MAIN CONTENT
    // ═══════════════════════════════════
    return (
        <div className="space-y-8">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="font-serif text-2xl text-foreground mb-1">Financial Pulse</h2>
                    <p className="text-sm text-foreground/60">Payroll, costs, and profit analysis.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-card/30 backdrop-blur-sm px-3 py-2 rounded-xl border border-border/30">
                        <Calendar className="w-3.5 h-3.5 text-foreground/30" />
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent border-none focus:outline-none font-bold text-sm text-foreground cursor-pointer [color-scheme:dark]"
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setIsUnlocked(false); setPinInput("") }}
                        className="h-9 rounded-xl border-border/50 text-foreground/30 hover:text-red-400 hover:border-red-400/30 text-[10px] uppercase tracking-wider font-bold gap-1.5"
                        title="Re-lock Finance"
                    >
                        <Lock className="w-3 h-3" /> Lock
                    </Button>
                </div>
            </div>

            {/* ── KPI Stats Row (always visible) ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-card/50 backdrop-blur-sm p-4 md:p-5 rounded-2xl border border-border/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-lg md:text-xl font-serif text-foreground">฿{payrollData.totalRevenue.toLocaleString()}</div>
                            <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Revenue</div>
                        </div>
                    </div>
                </div>
                <div className="bg-card/50 backdrop-blur-sm p-4 md:p-5 rounded-2xl border border-border/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-lg md:text-xl font-serif text-foreground">฿{totalPayroll.toLocaleString()}</div>
                            <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Payroll</div>
                        </div>
                    </div>
                </div>
                <div className="bg-card/50 backdrop-blur-sm p-4 md:p-5 rounded-2xl border border-border/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                            <Receipt className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-lg md:text-xl font-serif text-foreground">฿{totalExpenses.toLocaleString()}</div>
                            <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Expenses</div>
                        </div>
                    </div>
                </div>
                <div className={`bg-card/50 backdrop-blur-sm p-4 md:p-5 rounded-2xl border ${netProfit >= 0 ? "border-emerald-500/20" : "border-red-500/20"}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${netProfit >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                            {netProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                        <div>
                            <div className={`text-lg md:text-xl font-serif ${netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {netProfit < 0 ? "-" : ""}฿{Math.abs(netProfit).toLocaleString()}
                            </div>
                            <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-foreground/40 font-bold">
                                Net {profitMargin}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Sub-Navigation ── */}
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                {[
                    { id: "overview", label: "Overview" },
                    { id: "payroll", label: "Payroll" },
                    { id: "expenses", label: "Expenses" },
                    { id: "staff", label: "Team" },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSection(tab.id as any)}
                        className={`px-4 md:px-5 py-2 rounded-xl text-[10px] md:text-[11px] uppercase tracking-[0.15em] font-bold whitespace-nowrap transition-all duration-300 ${activeSection === tab.id
                            ? "bg-primary/15 text-primary border border-primary/20"
                            : "text-foreground/35 hover:text-foreground/60 border border-transparent"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══════════════════════════════════
                 OVERVIEW
            ═══════════════════════════════════ */}
            {activeSection === "overview" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    {/* Revenue Breakdown Bar */}
                    <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/30 p-5 md:p-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-3 mb-4">Revenue Allocation</h3>
                        <div className="h-3 rounded-full overflow-hidden flex bg-card/80 mb-4">
                            {payrollData.totalRevenue > 0 && (
                                <>
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((totalPayroll / payrollData.totalRevenue) * 100, 100)}%` }} transition={{ duration: 0.6, delay: 0.1 }} className="bg-blue-500/50 h-full" />
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((totalExpenses / payrollData.totalRevenue) * 100, 100)}%` }} transition={{ duration: 0.6, delay: 0.2 }} className="bg-amber-500/50 h-full" />
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min((netProfit / payrollData.totalRevenue) * 100, 100))}%` }} transition={{ duration: 0.6, delay: 0.3 }} className={`h-full ${netProfit >= 0 ? "bg-emerald-500/50" : "bg-red-500/50"}`} />
                                </>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                            {[
                                { color: "bg-blue-500/50", label: "Payroll", value: `฿${totalPayroll.toLocaleString()}` },
                                { color: "bg-amber-500/50", label: "Expenses", value: `฿${totalExpenses.toLocaleString()}` },
                                { color: netProfit >= 0 ? "bg-emerald-500/50" : "bg-red-500/50", label: netProfit >= 0 ? "Profit" : "Loss", value: `${netProfit < 0 ? "-" : ""}฿${Math.abs(netProfit).toLocaleString()}` },
                            ].map(i => (
                                <div key={i.label} className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${i.color}`} />
                                    <span className="text-[10px] text-foreground/40">{i.label}</span>
                                    <span className="text-[10px] font-mono text-foreground/60">{i.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Payroll Preview */}
                    <div className="bg-card/20 backdrop-blur-md border border-border/20 rounded-2xl overflow-hidden">
                        <div className="p-5 border-b border-border/10 flex justify-between items-center">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40">Payroll Summary</h3>
                            <button onClick={() => setActiveSection("payroll")} className="text-[10px] text-primary uppercase tracking-wider font-bold hover:text-primary/80 transition-colors">
                                View Details →
                            </button>
                        </div>
                        <div className="divide-y divide-border/10">
                            {payrollData.staffEntries.slice(0, 5).map(e => (
                                <div key={e.staffId} className="flex items-center justify-between px-5 py-3.5 hover:bg-primary/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-card/50 flex items-center justify-center text-foreground/30 border border-border/20">
                                            <User className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-foreground">{e.name}</div>
                                            <div className="text-[10px] text-foreground/30 uppercase">{e.role}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono text-sm text-primary">฿{e.totalPayout.toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                            {payrollData.staffEntries.length === 0 && (
                                <div className="p-8 text-center text-foreground/20 italic text-sm">No data for this month</div>
                            )}
                        </div>
                    </div>

                    {/* Quick Expense Preview */}
                    <div className="bg-card/20 backdrop-blur-md border border-border/20 rounded-2xl overflow-hidden">
                        <div className="p-5 border-b border-border/10 flex justify-between items-center">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40">Expense Summary</h3>
                            <button onClick={() => setActiveSection("expenses")} className="text-[10px] text-primary uppercase tracking-wider font-bold hover:text-primary/80 transition-colors">
                                Manage →
                            </button>
                        </div>
                        <div className="divide-y divide-border/10">
                            {activeExpenses.slice(0, 5).map(e => (
                                <div key={e.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-primary/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-card/50 flex items-center justify-center text-foreground/30 border border-border/20 text-[10px] font-bold">
                                            {categoryIcon(e.category)}
                                        </div>
                                        <div>
                                            <div className="text-sm text-foreground">{e.title}</div>
                                            <div className="text-[10px] text-foreground/30 uppercase">{e.category}</div>
                                        </div>
                                    </div>
                                    <span className="font-mono text-sm text-primary/80">฿{e.amount.toLocaleString()}</span>
                                </div>
                            ))}
                            {activeExpenses.length === 0 && (
                                <div className="p-8 text-center text-foreground/20 italic text-sm">No expenses this month</div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ═══════════════════════════════════
                 PAYROLL
            ═══════════════════════════════════ */}
            {activeSection === "payroll" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="bg-card/20 backdrop-blur-md border border-border/20 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="p-5 md:p-6 border-b border-border/10 flex flex-col md:flex-row justify-between md:items-center gap-3 bg-card/60">
                            <div>
                                <h3 className="font-serif text-xl text-foreground">Staff Payroll</h3>
                                <p className="text-[10px] text-foreground/30 uppercase tracking-wider mt-1">Base + Commission + Service Fees</p>
                            </div>
                            <span className="font-serif text-xl text-primary">฿{totalPayroll.toLocaleString()}</span>
                        </div>

                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                            <table className="w-full text-left">
                                <thead className="bg-card/60 border-b border-border/20 sticky top-0 backdrop-blur-md z-10">
                                    <tr>
                                        <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Staff</th>
                                        <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Base</th>
                                        <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Sales Comm.</th>
                                        <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Voucher Comm.</th>
                                        <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Service Fees</th>
                                        <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold text-right">Total</th>
                                        <th className="p-5 text-[10px] uppercase tracking-widest text-foreground/40 font-bold text-right w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/10">
                                    {payrollData.staffEntries.map(entry => (
                                        <tr key={entry.staffId} className="hover:bg-primary/5 transition-colors group">
                                            <td className="p-5">
                                                <div className="font-serif text-base text-foreground group-hover:text-primary transition-colors">{entry.name}</div>
                                                <span className="px-2 py-0.5 rounded-full bg-foreground/5 border border-border/10 text-[9px] uppercase tracking-wider font-bold text-foreground/40 mt-1 inline-block">{entry.role}</span>
                                            </td>
                                            <td className="p-5 font-mono text-sm text-foreground/50">฿{entry.baseSalary.toLocaleString()}</td>
                                            <td className="p-5">
                                                <div className="font-mono text-sm text-primary/80">฿{entry.salesComm.toLocaleString()}</div>
                                                {entry.commissionCount > 0 && <div className="text-[10px] text-foreground/25">{entry.commissionCount} sales</div>}
                                            </td>
                                            <td className="p-5">
                                                <div className="font-mono text-sm text-orange-400/80">฿{entry.voucherComm.toLocaleString()}</div>
                                            </td>
                                            <td className="p-5">
                                                <div className="font-mono text-sm text-emerald-400/80">฿{entry.serviceComm.toLocaleString()}</div>
                                                {entry.serviceHours > 0 && <div className="text-[10px] text-foreground/25">{Number(entry.serviceHours.toFixed(1))} hrs</div>}
                                            </td>
                                            <td className="p-5 text-right">
                                                <div className="font-serif text-lg text-foreground">฿{entry.totalPayout.toLocaleString()}</div>
                                            </td>
                                            <td className="p-5 text-right">
                                                <Button onClick={() => handlePrintPayslip(entry)} size="sm" variant="ghost"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-foreground/30 hover:text-primary h-8 w-8 p-0">
                                                    <Printer className="w-3.5 h-3.5" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Outsource Row */}
                                    {payrollData.outsource.cost > 0 && (
                                        <tr className="bg-card/10">
                                            <td className="p-5">
                                                <div className="font-serif text-base text-foreground/40 italic">External / Outsource</div>
                                                <span className="px-2 py-0.5 rounded-full bg-foreground/5 border border-border/10 text-[9px] uppercase tracking-wider font-bold text-foreground/25 mt-1 inline-block">Vendor</span>
                                            </td>
                                            <td className="p-5 text-foreground/15">—</td>
                                            <td className="p-5 text-foreground/15">—</td>
                                            <td className="p-5">
                                                <div className="font-mono text-sm text-emerald-400/40">฿{payrollData.outsource.cost.toLocaleString()}</div>
                                                {payrollData.outsource.hours > 0 && <div className="text-[10px] text-foreground/20">~{Number(payrollData.outsource.hours.toFixed(1))} hrs</div>}
                                            </td>
                                            <td className="p-5 text-right">
                                                <div className="font-serif text-lg text-foreground/40">฿{payrollData.outsource.cost.toLocaleString()}</div>
                                            </td>
                                            <td className="p-5"></td>
                                        </tr>
                                    )}

                                    {payrollData.staffEntries.length === 0 && (
                                        <tr><td colSpan={6} className="p-12 text-center text-foreground/20 italic text-sm">No payroll data for {selectedMonth}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ═══════════════════════════════════
                 EXPENSES
            ═══════════════════════════════════ */}
            {activeSection === "expenses" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    {/* Add Expense Form */}
                    <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/30 p-5 md:p-6">
                        <div className="flex justify-between items-center mb-5">
                            <div>
                                <h3 className="font-serif text-lg text-foreground">Add Expense</h3>
                                <p className="text-[10px] text-foreground/30 uppercase tracking-wider mt-0.5">Rent, Utilities, Supplies</p>
                            </div>
                            <span className="font-serif text-xl text-foreground/60">฿{totalExpenses.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col md:flex-row gap-3 items-end">
                            <div className="w-full md:flex-1">
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-1.5 block">Name</label>
                                <input
                                    value={expenseForm.title} onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })}
                                    className="w-full p-3 bg-secondary border border-border/50 rounded-xl text-foreground placeholder-foreground/30 focus:outline-none focus:border-primary/50 transition-colors text-sm"
                                    placeholder="e.g. Electricity Bill"
                                />
                            </div>
                            <div className="w-full md:w-40">
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-1.5 block">Category</label>
                                <select
                                    value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                                    className="w-full p-3 bg-secondary border border-border/50 rounded-xl text-foreground focus:outline-none focus:border-primary/50 transition-colors appearance-none text-sm"
                                >
                                    <option>Fixed Cost</option>
                                    <option>Utilities</option>
                                    <option>Supplies</option>
                                    <option>Maintenance</option>
                                    <option>Marketing</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div className="w-full md:w-32">
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-1.5 block">Amount (฿)</label>
                                <input
                                    type="number"
                                    value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                    className="w-full p-3 bg-secondary border border-border/50 rounded-xl text-foreground placeholder-foreground/30 focus:outline-none focus:border-primary/50 transition-colors text-sm"
                                    placeholder="0"
                                />
                            </div>
                            <Button onClick={handleAddExpense} className="h-[46px] rounded-xl bg-primary hover:bg-primary/90 text-background text-xs uppercase tracking-wider font-bold px-5 w-full md:w-auto">
                                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add
                            </Button>
                        </div>
                    </div>

                    {/* Expense List */}
                    <div className="bg-card/20 backdrop-blur-md border border-border/20 rounded-2xl overflow-hidden">
                        <div className="p-5 bg-card/60 border-b border-border/20">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40">
                                {selectedMonth.replace("-", " / ")} — {activeExpenses.length} Entries
                            </h3>
                        </div>
                        <div className="divide-y divide-border/10">
                            {activeExpenses.map(e => (
                                <div key={e.id} className="flex items-center justify-between px-5 py-4 hover:bg-primary/5 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-card/50 flex items-center justify-center text-foreground/30 text-[10px] font-bold border border-border/20">
                                            {categoryIcon(e.category)}
                                        </div>
                                        <div>
                                            <div className="text-sm text-foreground">{e.title}</div>
                                            <div className="text-[10px] text-foreground/25 uppercase tracking-wider">{e.category}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-sm text-primary/80">฿{e.amount.toLocaleString()}</span>
                                        <button
                                            onClick={() => handleDeleteExpense(e.id)}
                                            className="p-1.5 rounded-lg text-foreground/15 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {activeExpenses.length === 0 && (
                                <div className="p-12 text-center text-foreground/20 italic text-sm">
                                    No expenses recorded for this month
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Recurring Costs ── */}
                    <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/30 overflow-hidden">
                        <div className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-border/20">
                            <div>
                                <h3 className="font-serif text-lg text-foreground">Recurring Monthly Costs</h3>
                                <p className="text-[10px] text-foreground/40 uppercase tracking-wider mt-0.5">Auto-apply to any month</p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleApplyRecurring}
                                    disabled={isApplying || !recurringExpenses.filter(r => r.active).length}
                                    variant="outline"
                                    size="sm"
                                    className="h-9 rounded-xl border-primary/30 text-primary hover:bg-primary/10 text-[10px] uppercase tracking-wider font-bold gap-1.5 disabled:opacity-30"
                                >
                                    <RotateCcw className={`w-3.5 h-3.5 ${isApplying ? 'animate-spin' : ''}`} />
                                    Apply to {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0].slice(2)}
                                </Button>
                                <Button
                                    onClick={() => setShowRecurring(!showRecurring)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 rounded-xl text-foreground/40 hover:text-foreground text-[10px] uppercase tracking-wider font-bold"
                                >
                                    {showRecurring ? 'Hide' : 'Edit'}
                                </Button>
                            </div>
                        </div>

                        {/* Recurring List */}
                        <div className="divide-y divide-border/10">
                            {recurringExpenses.filter(r => r.active).map(r => (
                                <div key={r.id} className="flex items-center justify-between px-5 py-3.5 group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary/60 text-xs font-bold border border-primary/10">
                                            ↻
                                        </div>
                                        <div>
                                            <div className="text-sm text-foreground">{r.title}</div>
                                            <div className="text-[10px] text-foreground/30 uppercase tracking-wider">{r.category} • Monthly</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-sm text-primary">฿{r.amount.toLocaleString()}</span>
                                        {showRecurring && (
                                            <button onClick={() => handleDeleteRecurring(r.id)} className="p-1.5 rounded-lg text-foreground/15 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {recurringExpenses.filter(r => r.active).length === 0 && (
                                <div className="p-8 text-center text-foreground/20 italic text-sm">No recurring costs set up yet</div>
                            )}
                        </div>

                        {/* Add Recurring Form */}
                        {showRecurring && (
                            <div className="border-t border-border/20 p-5">
                                <p className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold mb-3">Add Recurring Cost</p>
                                <div className="flex flex-col md:flex-row gap-3 items-end">
                                    <div className="w-full md:flex-1">
                                        <input
                                            value={recurringForm.title} onChange={e => setRecurringForm({ ...recurringForm, title: e.target.value })}
                                            className="w-full p-3 bg-secondary border border-border/50 rounded-xl text-foreground placeholder-foreground/30 focus:outline-none focus:border-primary/50 text-sm"
                                            placeholder="e.g. Office Rent"
                                        />
                                    </div>
                                    <div className="w-full md:w-36">
                                        <select
                                            value={recurringForm.category} onChange={e => setRecurringForm({ ...recurringForm, category: e.target.value })}
                                            className="w-full p-3 bg-secondary border border-border/50 rounded-xl text-foreground focus:outline-none focus:border-primary/50 appearance-none text-sm"
                                        >
                                            <option>Fixed Cost</option>
                                            <option>Utilities</option>
                                            <option>Supplies</option>
                                            <option>Maintenance</option>
                                            <option>Marketing</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                    <div className="w-full md:w-28">
                                        <input
                                            type="number"
                                            value={recurringForm.amount} onChange={e => setRecurringForm({ ...recurringForm, amount: e.target.value })}
                                            className="w-full p-3 bg-secondary border border-border/50 rounded-xl text-foreground placeholder-foreground/30 focus:outline-none focus:border-primary/50 text-sm"
                                            placeholder="฿ 0"
                                        />
                                    </div>
                                    <Button onClick={handleAddRecurring} className="h-[46px] rounded-xl bg-primary hover:bg-primary/90 text-background text-xs uppercase tracking-wider font-bold px-5 w-full md:w-auto">
                                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* ═══════════════════════════════════
                 TEAM MANAGEMENT
            ═══════════════════════════════════ */}
            {activeSection === "staff" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    {/* Header + Add Button */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <h3 className="font-serif text-xl text-foreground">Team Management</h3>
                            <p className="text-sm text-foreground/50 mt-0.5">{salesmen.length} staff · {activeStaff.length} active</p>
                        </div>
                        <Button onClick={() => setIsAddingStaff(true)} size="sm" className="h-9 rounded-xl bg-primary text-background hover:bg-primary/90 text-[10px] md:text-xs font-bold uppercase tracking-wider gap-1.5">
                            <Plus className="w-3.5 h-3.5" /> Add Staff
                        </Button>
                    </div>

                    {/* Team Stats Row */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-card/50 backdrop-blur-sm p-4 md:p-5 rounded-2xl border border-border/30">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Users2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-xl font-serif text-foreground">{activeStaff.length}</div>
                                    <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Active</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-card/50 backdrop-blur-sm p-4 md:p-5 rounded-2xl border border-border/30">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-xl font-serif text-foreground">฿{totalPayroll.toLocaleString()}</div>
                                    <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-foreground/40 font-bold">This Month</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-card/50 backdrop-blur-sm p-4 md:p-5 rounded-2xl border border-border/30">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-xl font-serif text-foreground">฿{activeStaff.length > 0 ? Math.round(totalPayroll / activeStaff.length).toLocaleString() : 0}</div>
                                    <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Avg / Head</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Outsource Rate Card */}
                    <div className="bg-card/50 backdrop-blur-sm p-5 rounded-2xl border border-border/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h4 className="text-sm font-bold text-foreground">Outsource Hourly Rate</h4>
                            <p className="text-[10px] text-foreground/40 mt-0.5">Standard rate for vendor therapists</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-mono text-lg text-primary font-bold">฿{outsourceSettings?.rate || 300}</span>
                            <div className="h-6 w-px bg-border/30" />
                            <div className="flex gap-1.5">
                                <input
                                    type="number"
                                    placeholder={(outsourceSettings?.rate || 300).toString()}
                                    value={tempOutsourceRate}
                                    onChange={(e) => setTempOutsourceRate(e.target.value)}
                                    className="w-20 p-2 bg-secondary rounded-lg border border-border/50 text-foreground text-right text-sm focus:outline-none focus:border-primary/50 transition-colors"
                                />
                                <Button
                                    disabled={!tempOutsourceRate}
                                    onClick={async () => {
                                        await settingsOps.set("outsource", { rate: Number(tempOutsourceRate) })
                                        setTempOutsourceRate("")
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="h-[38px] rounded-lg border-border/50 text-foreground/60 hover:text-primary text-xs disabled:opacity-30"
                                >
                                    Save
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Staff Cards */}
                    <div className="space-y-3">
                        {salesmen.map(s => {
                            const perf = payrollData.staffEntries.find(e => e.staffId === s.id)
                            const monthBookings = bookings.filter(b => b.date.startsWith(selectedMonth) && (b.salesmanId === s.id || b.therapistId === s.id))
                            const revenueGenerated = monthBookings.reduce((sum, b) => sum + (b.priceSnapshot || 0), 0)
                            return (
                                <motion.div
                                    key={s.id} layout
                                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                    className={`bg-card/40 backdrop-blur-sm rounded-2xl border overflow-hidden transition-all group ${s.active ? "border-border/30 hover:border-primary/25" : "border-border/10 opacity-50"}`}
                                >
                                    {/* Main row */}
                                    <div className="p-4 md:p-5 flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center border border-border/30 overflow-hidden flex-shrink-0">
                                                {s.photoUrl
                                                    ? <img src={s.photoUrl} className="w-full h-full object-cover" alt={s.nickname} />
                                                    : <User className="w-5 h-5 text-foreground/40" />
                                                }
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-serif text-base text-foreground truncate">{s.nickname}</div>
                                                <div className="text-[10px] text-foreground/40 truncate">{s.name}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                                            <span className={`px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-wider font-bold border ${s.role === "manager" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                                s.role === "therapist" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                    s.role === "dual" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                        "bg-foreground/5 text-foreground/50 border-border/20"
                                                }`}>{s.role || "sales"}</span>

                                            {/* Toggle active */}
                                            <button
                                                onClick={async () => await salesmanOps.update(s.id, { active: !s.active })}
                                                className={`p-1.5 rounded-lg transition-colors ${s.active ? "text-emerald-400 hover:bg-emerald-500/10" : "text-foreground/20 hover:bg-foreground/5"}`}
                                                title={s.active ? "Deactivate" : "Activate"}
                                            >
                                                {s.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                            </button>
                                            <button onClick={() => startEditStaff(s)} className="p-1.5 rounded-lg text-foreground/30 hover:bg-card/80 hover:text-blue-400 transition-colors">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleDeleteStaff(s.id)} className="p-1.5 rounded-lg text-foreground/20 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Performance strip */}
                                    {s.active && (
                                        <div className="px-4 md:px-5 pb-4 md:pb-5">
                                            <div className="grid grid-cols-4 gap-3 p-3 bg-background/40 rounded-xl border border-border/10">
                                                <div>
                                                    <div className="text-[9px] text-foreground/30 uppercase tracking-wider mb-0.5">Base</div>
                                                    <div className="font-mono text-xs text-foreground/70">฿{(s.baseSalary || 0).toLocaleString()}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-foreground/30 uppercase tracking-wider mb-0.5">Bookings</div>
                                                    <div className="font-mono text-xs text-foreground/70">{monthBookings.length}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-foreground/30 uppercase tracking-wider mb-0.5">Revenue</div>
                                                    <div className="font-mono text-xs text-primary">฿{revenueGenerated.toLocaleString()}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-foreground/30 uppercase tracking-wider mb-0.5">Earned</div>
                                                    <div className="font-mono text-xs text-emerald-400">฿{(perf?.totalPayout || s.baseSalary || 0).toLocaleString()}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )
                        })}
                    </div>

                    {salesmen.length === 0 && (
                        <div className="text-center py-12 text-foreground/30 italic text-sm border-2 border-dashed border-border/20 rounded-2xl">
                            No staff members yet — add your first team member above
                        </div>
                    )}
                </motion.div>
            )}

            {/* ═══ STAFF ADD/EDIT MODAL ═══ */}
            <AnimatePresence>
                {isAddingStaff && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-background border border-border/30 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-5"
                        >
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-serif text-primary">{editingStaffId ? "Edit Staff" : "New Staff"}</h2>
                                <button onClick={() => { setIsAddingStaff(false); resetStaffForm() }} className="p-2 rounded-xl hover:bg-card/50 text-foreground/40">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Full Name</label>
                                    <input
                                        value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                                        className="w-full p-3 bg-secondary border border-border/50 rounded-xl text-foreground placeholder-foreground/30 focus:outline-none focus:border-primary/50 text-sm"
                                        placeholder="e.g. Somchai Jai-dee"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Nickname</label>
                                        <input
                                            value={staffForm.nickname} onChange={e => setStaffForm({ ...staffForm, nickname: e.target.value })}
                                            className="w-full p-3 bg-secondary border border-border/50 rounded-xl text-foreground placeholder-foreground/30 focus:outline-none focus:border-primary/50 text-sm"
                                            placeholder="e.g. Chai"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Role</label>
                                        <select
                                            value={staffForm.role} onChange={e => setStaffForm({ ...staffForm, role: e.target.value as any })}
                                            className="w-full p-3 bg-secondary border border-border/50 rounded-xl text-foreground focus:outline-none focus:border-primary/50 text-sm appearance-none"
                                        >
                                            <option value="sales">Sales Only</option>
                                            <option value="therapist">Therapist Only</option>
                                            <option value="dual">Dual (Both)</option>
                                            <option value="manager">Manager</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Payroll Settings */}
                                <div className="p-4 bg-primary/5 rounded-xl space-y-3 border border-primary/10">
                                    <span className="text-[10px] font-bold uppercase text-primary/70 tracking-widest">Payroll Settings</span>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-1 block">Base Salary</label>
                                            <input type="number" value={staffForm.baseSalary} onChange={e => setStaffForm({ ...staffForm, baseSalary: Number(e.target.value) })}
                                                className="w-full p-2.5 bg-secondary rounded-lg border border-border/50 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-1 block">Comm. %</label>
                                            <input type="number" step="0.01" value={staffForm.commissionRate} onChange={e => setStaffForm({ ...staffForm, commissionRate: Number(e.target.value) })}
                                                className="w-full p-2.5 bg-secondary rounded-lg border border-border/50 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                                        </div>
                                        {(staffForm.role === "therapist" || staffForm.role === "dual") && (
                                            <div className="col-span-2">
                                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-1 block">Hourly Service Rate</label>
                                                <input type="number" value={staffForm.hourlyRate} onChange={e => setStaffForm({ ...staffForm, hourlyRate: Number(e.target.value) })}
                                                    className="w-full p-2.5 bg-secondary rounded-lg border border-border/50 text-foreground placeholder-foreground/30 focus:outline-none focus:border-primary/50 text-sm" placeholder="e.g. 100" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button onClick={() => { setIsAddingStaff(false); resetStaffForm() }} variant="ghost" className="flex-1 rounded-xl text-foreground/40 hover:text-foreground">Cancel</Button>
                                <Button
                                    onClick={editingStaffId ? handleUpdateStaff : handleAddStaff}
                                    disabled={!staffForm.name || !staffForm.nickname}
                                    className="flex-1 rounded-xl bg-primary text-background hover:bg-primary/90 font-bold disabled:opacity-30"
                                >
                                    {editingStaffId ? "Save Changes" : "Add to Team"}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
