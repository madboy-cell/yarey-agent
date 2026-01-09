"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Lock, DollarSign, Calendar, Printer, TrendingUp, AlertCircle, Download, Plus, Trash2, User, Edit2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useFirestoreCollection, useFirestoreCRUD, useFirestoreDoc } from "@/hooks/useFirestore" // added CRUD import
import { Booking, Salesman } from "../page" // Import types from main admin
import { generatePayslip } from "@/lib/pdf/generatePayslip"

// Local Types for Payroll
interface PayrollEntry {
    staffId: string
    name: string
    role: string
    baseSalary: number
    commissionCount: number
    salesComm: number
    serviceHours: number
    serviceComm: number
    totalPayout: number
}

interface OutsourceEntry {
    hours: number
    cost: number
}

interface Expense {
    id: string
    month: string // YYYY-MM
    title: string
    amount: number
    category: string
}

export default function FinancePage() {
    // -- Data --
    const { data: bookings } = useFirestoreCollection<Booking>("bookings")
    const { data: staff } = useFirestoreCollection<Salesman>("salesmen")
    const { data: expenses } = useFirestoreCollection<Expense>("expenses")
    const { data: outsourceSettings } = useFirestoreDoc<{ rate: number }>("settings", "outsource")
    const expenseOps = useFirestoreCRUD("expenses")
    const salesmanOps = useFirestoreCRUD("salesmen")
    const settingsOps = useFirestoreCRUD("settings")

    // -- State --
    const [isUnlocked, setIsUnlocked] = useState(false)
    const [activeTab, setActiveTab] = useState<"report" | "staff">("report")
    const [pinInput, setPinInput] = useState("")
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM
    const [expenseForm, setExpenseForm] = useState({ title: "", amount: "", category: "Fixed Cost" })

    // -- Printing --
    const handlePrintPayslip = (entry: PayrollEntry) => {
        generatePayslip({
            period: selectedMonth, // e.g. "2026-01"
            generatedDate: new Date().toLocaleDateString(),
            staff: {
                name: entry.name,
                role: entry.role,
                id: entry.staffId
            },
            earnings: {
                baseSalary: entry.baseSalary,
                salesCommission: entry.salesComm,
                salesCount: entry.commissionCount,
                serviceFee: entry.serviceComm,
                other: 0
            },
            deductions: {
                tax: 0,
                socialSecurity: 0,
                other: 0
            },
            netPay: entry.totalPayout
        })
    }

    // -- Derived Data (Snapshot) --
    // -- Staff Form State --
    const [isAddingStaff, setIsAddingStaff] = useState(false)
    const [editingStaffId, setEditingStaffId] = useState<string | null>(null)
    const [staffForm, setStaffForm] = useState<Partial<Salesman>>({
        name: "", nickname: "", commissionRate: 0.05, active: true, role: "sales", baseSalary: 15000, hourlyRate: 100
    })

    // -- Staff Actions --
    const handleAddStaff = async () => {
        if (!staffForm.name || !staffForm.nickname) return
        await salesmanOps.add({
            ...staffForm,
            active: true,
            joinedDate: new Date().toISOString()
        })
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

    const [tempOutsourceRate, setTempOutsourceRate] = useState<string>("")

    // -- Authentication --

    // -- Authentication --
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        if (pinInput === "1999" || pinInput === "8888") { // Simple Owner PIN
            setIsUnlocked(true)
        } else {
            alert("Incorrect Owner PIN")
            setPinInput("")
        }
    }

    // -- Calculation Engine --
    const payrollData = useMemo(() => {
        if (!bookings.length || !staff.length) return { staffEntries: [], outsource: { hours: 0, cost: 0 }, totalRevenue: 0 }

        // 1. Filter Bookings by Month
        const filteredBookings = bookings.filter(b => b.date.startsWith(selectedMonth))

        // 2. Calculate Total Revenue for Context
        const totalRevenue = filteredBookings.reduce((sum, b) => sum + (b.priceSnapshot || 0), 0)

        // 3. Initialize Staff Maps
        const staffMap = new Map<string, StaffPayrollEntry>()
        // Pre-fill active staff
        staff.filter(s => s.active).forEach(s => {
            staffMap.set(s.id, {
                staffId: s.id,
                name: s.nickname,
                role: s.role || "sales",
                baseSalary: s.baseSalary || 0,
                commissionCount: 0,
                salesComm: 0,
                serviceHours: 0,
                serviceComm: 0,
                totalPayout: s.baseSalary || 0
            })
        })

        // 4. Outsource Tracker
        let outsourceHours = 0
        let outsourceCost = 0

        // 5. Aggregate
        filteredBookings.forEach(b => {
            // A. Sales Commission
            if (b.salesmanId && staffMap.has(b.salesmanId)) {
                const entry = staffMap.get(b.salesmanId)!
                entry.commissionCount += 1
                entry.salesComm += (b.commissionAmount || 0)
                entry.totalPayout += (b.commissionAmount || 0)
            }

            // B. Service (Therapist) Commission
            if (b.therapistId === "OUTSOURCE") {
                // If we tracked hours... currently rely on costSnapshot
                // Reverse engineer hours if needed: cost / rate
                outsourceCost += (b.therapistCostSnapshot || 0)
            } else if (b.therapistId && staffMap.has(b.therapistId)) {
                const entry = staffMap.get(b.therapistId)!
                // approximate hours from snapshot if available, or just use cost
                entry.serviceComm += (b.therapistCostSnapshot || 0)
                entry.totalPayout += (b.therapistCostSnapshot || 0)

                // Track hours (approximate)
                // If treatment duration is available locally? No, it's on the booking object?
                // Booking object has 'treatment' string, but not duration. 
                // However, we saved `therapistCostSnapshot`.
            }
        })

        return {
            staffEntries: Array.from(staffMap.values()),
            outsource: { hours: outsourceHours, cost: outsourceCost },
            totalRevenue
        }
    }, [bookings, staff, selectedMonth])

    const activeExpenses = expenses.filter(e => e.month === selectedMonth)
    const totalExpenses = activeExpenses.reduce((sum, e) => sum + e.amount, 0)
    const totalPayrollParams = payrollData.staffEntries.reduce((sum, e) => sum + e.totalPayout, 0) + payrollData.outsource.cost

    const netProfit = payrollData.totalRevenue - totalPayrollParams - totalExpenses

    const handleAddExpense = async () => {
        if (!expenseForm.title || !expenseForm.amount) return
        await expenseOps.add({
            month: selectedMonth,
            title: expenseForm.title,
            amount: Number(expenseForm.amount),
            category: expenseForm.category
        })
        setExpenseForm({ title: "", amount: "", category: "Fixed Cost" })
    }

    const handleDeleteExpense = async (id: string) => {
        if (confirm("Remove this expense?")) await expenseOps.remove(id)
    }

    // -- Render --

    if (!isUnlocked) {
        return (
            <div className="min-h-screen bg-[#051818] flex items-center justify-center p-4">
                <div className="bg-[#0c2627] p-8 rounded-3xl border border-primary/20 shadow-2xl max-w-sm w-full text-center space-y-6">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                        <Lock className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-serif text-white">Owner Access</h1>
                        <p className="text-white/40 text-xs uppercase tracking-widest mt-2">Financial Introspection</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value)}
                            className="w-full bg-black/30 border border-primary/30 rounded-xl px-4 py-3 text-center text-white font-mono text-lg focus:outline-none focus:border-primary"
                            placeholder="ENTER PIN"
                            autoFocus
                        />
                        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-[#051818] font-bold rounded-xl py-6">
                            Unlock Vault
                        </Button>
                    </form>
                    <Link href="/admin">
                        <p className="text-xs text-white/20 hover:text-white transition-colors mt-4">Return to Dashboard</p>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#051818] text-[#F2F2F2] p-6 font-sans relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('/noise.png')] z-0" />

            <div className="max-w-6xl mx-auto space-y-8 relative z-10">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Link href="/admin" className="text-xs uppercase tracking-widest text-gray-500 hover:text-white mb-2 inline-flex items-center gap-2 font-bold transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Operations Dashboard
                        </Link>
                        <h1 className="text-3xl md:text-4xl font-serif text-[#D1C09B]">Financial Pulse</h1>
                    </div>
                    <div className="flex items-center gap-4 bg-[#0c2627] p-2 pr-4 rounded-xl shadow-lg border border-white/5">
                        <div className="w-10 h-10 rounded-lg bg-[#D1C09B]/10 flex items-center justify-center text-[#D1C09B]">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent border-none focus:outline-none font-bold text-lg text-white cursor-pointer color-scheme-dark"
                        />
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-4 border-b border-white/10 pb-4">
                    <button
                        onClick={() => setActiveTab("report")}
                        className={`text-sm font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors ${activeTab === "report" ? "bg-[#D1C09B] text-[#051818]" : "text-gray-500 hover:text-white"}`}
                    >
                        Financial Report
                    </button>
                    <button
                        onClick={() => setActiveTab("staff")}
                        className={`text-sm font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors ${activeTab === "staff" ? "bg-[#D1C09B] text-[#051818]" : "text-gray-500 hover:text-white"}`}
                    >
                        Staff Management
                    </button>
                </div>

                {activeTab === "report" ? (
                    <div className="space-y-8">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Revenue */}
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-[#0c2627] text-white p-6 rounded-3xl shadow-lg border border-white/5 relative overflow-hidden group hover:border-[#D1C09B]/20 transition-all">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#D1C09B]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-[#D1C09B]/20 transition-all" />
                                <p className="text-xs uppercase tracking-widest text-white/40 mb-2">Total Revenue (Est.)</p>
                                <h2 className="text-4xl font-serif text-[#D1C09B]">฿{payrollData.totalRevenue.toLocaleString()}</h2>
                                <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 w-fit px-2 py-1 rounded-lg">
                                    <TrendingUp className="w-3 h-3" />
                                    <span>Gross Income</span>
                                </div>
                            </motion.div>

                            {/* Total Payroll */}
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-[#0c2627] p-6 rounded-3xl shadow-lg border border-white/5 hover:border-[#D1C09B]/20 transition-all">
                                <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Total Payroll Liability</p>
                                <h2 className="text-4xl font-serif text-white">฿{totalPayrollParams.toLocaleString()}</h2>
                                <div className="mt-4 text-xs text-gray-500">
                                    Includes Base Salary + Commissions
                                </div>
                            </motion.div>

                            {/* Net Profit */}
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className={`p-6 rounded-3xl shadow-lg border transition-all bg-[#0c2627] ${netProfit >= 0 ? "border-emerald-500/20 hover:border-emerald-500/40" : "border-red-500/20 hover:border-red-500/40"}`}>
                                <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Net Profit (Est.)</p>
                                <h2 className={`text-4xl font-serif ${netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {netProfit < 0 ? "-" : ""}฿{Math.abs(netProfit).toLocaleString()}
                                </h2>
                                <div className="mt-4 text-xs text-gray-500">
                                    Revenue - (Payroll + OpEx)
                                </div>
                            </motion.div>
                        </div>

                        {/* Expenses Section */}
                        <div className="bg-[#0c2627] rounded-[2rem] shadow-lg border border-white/5 p-8">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-serif text-[#D1C09B]">Operational Costs</h3>
                                    <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Rent, Utilities, Supplies</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-serif text-white/80">฿{totalExpenses.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 mb-8 bg-[#051818]/50 p-6 rounded-2xl items-end border border-white/5">
                                <div className="w-full md:flex-1">
                                    <label className="text-xs uppercase font-bold text-gray-500 mb-2 block">Expense Name</label>
                                    <input
                                        value={expenseForm.title} onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })}
                                        className="w-full p-3 bg-[#0c2627] rounded-xl border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#D1C09B] transition-colors" placeholder="e.g. Electricity Bill"
                                    />
                                </div>
                                <div className="w-full md:w-48">
                                    <label className="text-xs uppercase font-bold text-gray-500 mb-2 block">Category</label>
                                    <select
                                        value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                                        className="w-full p-3 bg-[#0c2627] rounded-xl border border-white/10 text-white focus:outline-none focus:border-[#D1C09B] transition-colors appearance-none"
                                    >
                                        <option>Fixed Cost</option>
                                        <option>Utilities</option>
                                        <option>Supplies</option>
                                        <option>Maintenance</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div className="w-full md:w-40">
                                    <label className="text-xs uppercase font-bold text-gray-500 mb-2 block">Amount (฿)</label>
                                    <input
                                        type="number"
                                        value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                        className="w-full p-3 bg-[#0c2627] rounded-xl border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#D1C09B] transition-colors" placeholder="0.00"
                                    />
                                </div>
                                <Button onClick={handleAddExpense} className="bg-[#D1C09B] hover:bg-[#b0a07f] text-[#051818] rounded-xl h-[50px] px-6 font-bold shadow-lg shadow-[#D1C09B]/10 w-full md:w-auto">
                                    <Plus className="w-5 h-5 mr-2" /> Add Expense
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {activeExpenses.length === 0 && <p className="text-center text-gray-600 italic py-8 border-2 border-dashed border-white/5 rounded-xl">No expenses recorded for this month.</p>}
                                {activeExpenses.map(e => (
                                    <div key={e.id} className="flex justify-between items-center py-4 border-b border-white/5 hover:bg-white/[0.02] px-4 rounded-lg transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 text-xs font-bold border border-white/5">
                                                {e.category[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white/90">{e.title}</div>
                                                <div className="text-[10px] uppercase text-gray-500">{e.category}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-mono font-bold text-[#D1C09B]">฿{e.amount.toLocaleString()}</span>
                                            <button onClick={() => handleDeleteExpense(e.id)} className="text-gray-600 hover:text-red-400 transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payroll Table */}
                        <div className="bg-[#0c2627] rounded-[2rem] shadow-lg border border-white/5 overflow-hidden">
                            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#0c2627]">
                                <div>
                                    <h3 className="text-xl font-serif text-[#D1C09B]">Staff Payroll (View Only)</h3>
                                    <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Breakdown by Commission & Service</p>
                                </div>
                                <Button variant="outline" className="gap-2 rounded-xl text-xs uppercase tracking-widest font-bold border-white/10 text-gray-400 hover:text-white hover:bg-white/5">
                                    <Download className="w-4 h-4" /> Export CSV
                                </Button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-xs uppercase tracking-widest text-gray-500 bg-[#051818]/30 border-b border-white/5">
                                            <th className="px-8 py-5 font-bold">Staff Member</th>
                                            <th className="px-8 py-5 font-bold">Base Salary</th>
                                            <th className="px-8 py-5 font-bold">Sales Comm.</th>
                                            <th className="px-8 py-5 font-bold">Service Fees</th>
                                            <th className="px-8 py-5 font-bold text-right">Total Payout</th>
                                            <th className="px-8 py-5 font-bold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {payrollData.staffEntries.map((entry) => (
                                            <tr key={entry.staffId} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="font-bold text-lg text-white">{entry.name}</div>
                                                    <div className="text-xs text-gray-500 uppercase tracking-wider bg-white/5 w-fit px-2 py-0.5 rounded mt-1">{entry.role}</div>
                                                </td>
                                                <td className="px-8 py-6 font-mono text-gray-400">
                                                    ฿{entry.baseSalary.toLocaleString()}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="font-mono text-[#D1C09B] font-medium">฿{entry.salesComm.toLocaleString()}</div>
                                                    <div className="text-[10px] text-gray-600">{entry.commissionCount} Sales</div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="font-mono text-emerald-400 font-medium">฿{entry.serviceComm.toLocaleString()}</div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="font-serif text-2xl text-white">฿{entry.totalPayout.toLocaleString()}</div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <Button onClick={() => handlePrintPayslip(entry)} size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white">
                                                        <Printer className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}

                                        {/* Outsource Row */}
                                        <tr className="bg-white/[0.01] hover:bg-white/[0.03]">
                                            <td className="px-8 py-6">
                                                <div className="font-bold text-lg text-gray-400 italic">External / Outsource</div>
                                                <div className="text-xs text-gray-600 uppercase tracking-wider bg-white/5 w-fit px-2 py-0.5 rounded mt-1">Vendor</div>
                                            </td>
                                            <td className="px-8 py-6 text-gray-600">-</td>
                                            <td className="px-8 py-6 text-gray-600">-</td>
                                            <td className="px-8 py-6 font-mono text-emerald-600/50 font-medium">฿{payrollData.outsource.cost.toLocaleString()}</td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="font-serif text-xl text-gray-500">฿{payrollData.outsource.cost.toLocaleString()}</div>
                                            </td>
                                            <td className="px-8 py-6 text-right"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    // --- STAFF MANAGEMENT TAB ---
                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-serif text-[#D1C09B]">Team Management</h2>
                            <Button onClick={() => setIsAddingStaff(true)} className="bg-[#D1C09B] text-[#051818] hover:bg-[#b0a07f] rounded-xl font-bold">
                                <Plus className="w-4 h-4 mr-2" /> Add New Staff
                            </Button>
                        </div>

                        {/* Global Settings Card */}
                        <div className="bg-[#0c2627] p-6 rounded-3xl border border-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-white text-lg">External / Outsource Rate</h3>
                                <p className="text-xs text-gray-500">Standard hourly rate paid to outsourced therapists.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Current Rate</p>
                                    <p className="font-mono text-[#D1C09B] font-bold text-xl">฿{outsourceSettings?.rate || 300}</p>
                                </div>
                                <div className="h-8 w-px bg-white/10 mx-2" />
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder={(outsourceSettings?.rate || 300).toString()}
                                        value={tempOutsourceRate}
                                        onChange={(e) => setTempOutsourceRate(e.target.value)}
                                        className="w-24 p-2 bg-[#051818] rounded-lg border border-white/10 text-white text-right focus:outline-none focus:border-[#D1C09B]"
                                    />
                                    <Button
                                        disabled={!tempOutsourceRate}
                                        onClick={async () => {
                                            await settingsOps.set("outsource", { rate: Number(tempOutsourceRate) })
                                            setTempOutsourceRate("")
                                            alert("Outsource rate updated!")
                                        }}
                                        className="bg-white/10 hover:bg-white/20 text-white rounded-lg"
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {staff.filter(s => s.active).map(s => (
                                <motion.div key={s.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0c2627] p-6 rounded-3xl flex items-center justify-between border border-white/5 hover:border-[#D1C09B]/20 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-white/5 text-[#D1C09B] flex items-center justify-center border border-white/5">
                                            {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full rounded-full object-cover" /> : <User className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-white">{s.nickname}</h3>
                                            <p className="text-xs text-gray-500">{s.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-xs uppercase font-bold text-gray-500">{s.role || "sales"}</p>
                                            <div className="flex flex-col items-end">
                                                <span className="font-mono font-bold text-[#D1C09B] text-sm">฿{s.baseSalary?.toLocaleString() || 0}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => startEditStaff(s)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-blue-400 transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteStaff(s.id)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-red-400 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Staff Modal */}
                        <AnimatePresence>
                            {isAddingStaff && (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                                >
                                    <div className="bg-[#0c2627] p-8 rounded-3xl w-full max-w-md shadow-2xl relative border border-white/10">
                                        <button onClick={() => setIsAddingStaff(false)} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400">
                                            <X className="w-5 h-5" />
                                        </button>

                                        <h2 className="text-2xl font-serif mb-6 text-[#D1C09B]">{editingStaffId ? "Edit Staff" : "Add New Staff"}</h2>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs uppercase font-bold text-gray-500 mb-2 block">Full Name</label>
                                                <input
                                                    value={staffForm.name}
                                                    onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                                                    className="w-full p-3 bg-[#051818] rounded-xl border border-white/10 text-white focus:outline-none focus:border-[#D1C09B]"
                                                    placeholder="e.g. Somchai Jai-dee"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs uppercase font-bold text-gray-500 mb-2 block">Nickname</label>
                                                    <input
                                                        value={staffForm.nickname}
                                                        onChange={e => setStaffForm({ ...staffForm, nickname: e.target.value })}
                                                        className="w-full p-3 bg-[#051818] rounded-xl border border-white/10 text-white focus:outline-none focus:border-[#D1C09B]"
                                                        placeholder="e.g. Chai"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs uppercase font-bold text-gray-500 mb-2 block">Role</label>
                                                    <select
                                                        value={staffForm.role}
                                                        onChange={e => setStaffForm({ ...staffForm, role: e.target.value as any })}
                                                        className="w-full p-3 bg-[#051818] rounded-xl border border-white/10 text-white focus:outline-none focus:border-[#D1C09B]"
                                                    >
                                                        <option value="sales">Sales Only</option>
                                                        <option value="therapist">Therapist Only</option>
                                                        <option value="dual">Dual (Both)</option>
                                                        <option value="manager">Manager</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Financials */}
                                            <div className="p-4 bg-orange-500/5 rounded-xl space-y-3 border border-orange-500/10">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold uppercase text-[#D1C09B]">Payroll Settings</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Base Salary</label>
                                                        <input
                                                            type="number"
                                                            value={staffForm.baseSalary}
                                                            onChange={e => setStaffForm({ ...staffForm, baseSalary: Number(e.target.value) })}
                                                            className="w-full p-2 bg-[#051818] rounded-lg border border-white/10 text-white focus:outline-none focus:border-[#D1C09B]"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Comm. %</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={staffForm.commissionRate}
                                                            onChange={e => setStaffForm({ ...staffForm, commissionRate: Number(e.target.value) })}
                                                            className="w-full p-2 bg-[#051818] rounded-lg border border-white/10 text-white focus:outline-none focus:border-[#D1C09B]"
                                                        />
                                                    </div>
                                                    {(staffForm.role === "therapist" || staffForm.role === "dual") && (
                                                        <div className="col-span-2">
                                                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Hourly Service Rate</label>
                                                            <input
                                                                type="number"
                                                                value={staffForm.hourlyRate}
                                                                onChange={e => setStaffForm({ ...staffForm, hourlyRate: Number(e.target.value) })}
                                                                className="w-full p-2 bg-[#051818] rounded-lg border border-white/10 text-white focus:outline-none focus:border-[#D1C09B]"
                                                                placeholder="e.g. 100"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 flex gap-3">
                                            <Button onClick={() => setIsAddingStaff(false)} variant="ghost" className="flex-1 rounded-xl text-gray-500 hover:text-white hover:bg-white/10">Cancel</Button>
                                            <Button
                                                onClick={editingStaffId ? handleUpdateStaff : handleAddStaff}
                                                disabled={!staffForm.name || !staffForm.nickname}
                                                className="flex-1 rounded-xl bg-[#D1C09B] text-[#051818] hover:bg-[#b0a07f] disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                                            >
                                                {editingStaffId ? "Save Changes" : "Create Member"}
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    )
}
