"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Edit2, Check, X, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useFirestoreCollection, useFirestoreCRUD } from "@/hooks/useFirestore"

export interface Salesman {
    id: string
    name: string
    nickname: string
    commissionRate: number // Sales Commission (e.g. 5%)
    active: boolean
    photoUrl?: string
    joinedDate: string
    // New Fields
    role?: "sales" | "therapist" | "dual" | "manager"
    baseSalary?: number
    hourlyRate?: number
}

export default function SalesStaffPage() {
    const { data: salesmen } = useFirestoreCollection<Salesman>("salesmen")
    const salesmanOps = useFirestoreCRUD("salesmen")

    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Form State
    const [formData, setFormData] = useState<Partial<Salesman>>({
        name: "",
        nickname: "",
        commissionRate: 0.05,
        active: true,
        role: "sales",
        baseSalary: 15000,
        hourlyRate: 100
    })

    // -- Actions --

    const handleAdd = async () => {
        if (!formData.name || !formData.nickname) return

        const newOne = {
            name: formData.name,
            nickname: formData.nickname,
            commissionRate: formData.commissionRate || 0.05,
            active: true,
            photoUrl: formData.photoUrl || "",
            joinedDate: new Date().toISOString(),
            role: formData.role || "sales",
            baseSalary: formData.baseSalary || 0,
            hourlyRate: formData.hourlyRate || 0
        }

        await salesmanOps.add(newOne)
        setIsAdding(false)
        resetForm()
    }

    const handleUpdate = async () => {
        if (!editingId || !formData.name) return

        if (editingId) {
            await salesmanOps.update(editingId, formData)
        }
        setEditingId(null)
        resetForm()
    }

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure? This will soft-delete the staff member.")) {
            // Soft delete
            await salesmanOps.update(id, { active: false })
        }
    }

    const resetForm = () => {
        setFormData({ name: "", nickname: "", commissionRate: 0.05, active: true, role: "sales", baseSalary: 15000, hourlyRate: 100 })
        setEditingId(null)
    }

    const startEdit = (s: Salesman) => {
        setEditingId(s.id)
        setFormData(s)
        setIsAdding(true)
    }

    return (
        <div className="min-h-screen bg-[#F4EFE6] p-8 font-sans text-[#2D2824]">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <Link href="/admin" className="text-xs uppercase tracking-widest text-black/30 hover:text-black mb-4 inline-block font-bold">
                            ← Back to Dashboard
                        </Link>
                        <h1 className="text-4xl font-serif mb-2">Sales Staff</h1>
                        <p className="text-black/40">Manage commissions and team members</p>
                    </div>
                    <Button onClick={() => { setIsAdding(true); resetForm(); }} size="lg" className="rounded-full bg-[#8B4513] hover:bg-[#6d360f]">
                        <Plus className="w-5 h-5 mr-2" /> Add Staff
                    </Button>
                </div>

                {/* Add/Edit Form Overlay */}
                <AnimatePresence>
                    {isAdding && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        >
                            <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl relative">
                                <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>

                                <h2 className="text-2xl font-serif mb-6">{editingId ? "Edit Staff" : "Add New Staff"}</h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs uppercase font-bold text-gray-400">Full Name</label>
                                        <input
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full mt-1 p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-[#8B4513]"
                                            placeholder="e.g. Somchai Jai-dee"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs uppercase font-bold text-gray-400">Nickname</label>
                                            <input
                                                value={formData.nickname}
                                                onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                                                className="w-full mt-1 p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-[#8B4513]"
                                                placeholder="e.g. Chai"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase font-bold text-gray-400">Role</label>
                                            <select
                                                value={formData.role}
                                                onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                                className="w-full mt-1 p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-[#8B4513]"
                                            >
                                                <option value="sales">Sales Only</option>
                                                <option value="therapist">Therapist Only</option>
                                                <option value="dual">Dual (Both)</option>
                                                <option value="manager">Manager</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Financials */}
                                    <div className="p-4 bg-orange-50 rounded-xl space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold uppercase text-[#8B4513]">Payroll Settings</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-gray-400">Base Salary (THB)</label>
                                                <input
                                                    type="number"
                                                    value={formData.baseSalary}
                                                    onChange={e => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                                                    className="w-full mt-1 p-2 bg-white rounded-lg border border-orange-100 focus:outline-none focus:border-[#8B4513]"
                                                />
                                            </div>
                                            {(formData.role === "sales" || formData.role === "dual" || formData.role === "manager") && (
                                                <div>
                                                    <label className="text-[10px] uppercase font-bold text-gray-400">Comm. %</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.commissionRate}
                                                        onChange={e => setFormData({ ...formData, commissionRate: Number(e.target.value) })}
                                                        className="w-full mt-1 p-2 bg-white rounded-lg border border-orange-100 focus:outline-none focus:border-[#8B4513]"
                                                    />
                                                </div>
                                            )}
                                            {(formData.role === "therapist" || formData.role === "dual") && (
                                                <div className="col-span-2">
                                                    <label className="text-[10px] uppercase font-bold text-gray-400">Hourly Service Rate (THB)</label>
                                                    <input
                                                        type="number"
                                                        value={formData.hourlyRate}
                                                        onChange={e => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                                                        className="w-full mt-1 p-2 bg-white rounded-lg border border-orange-100 focus:outline-none focus:border-[#8B4513]"
                                                        placeholder="e.g. 100"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <Button onClick={() => setIsAdding(false)} variant="ghost" className="flex-1 rounded-xl text-gray-500 hover:text-black hover:bg-gray-100">Cancel</Button>
                                    <Button
                                        onClick={editingId ? handleUpdate : handleAdd}
                                        disabled={!formData.name || !formData.nickname}
                                        className="flex-1 rounded-xl bg-[#8B4513] hover:bg-[#6d360f] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {editingId ? "Save Changes" : "Create Member"}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Staff List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {salesmen.filter(s => s.active).map(s => (
                        <motion.div key={s.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl flex items-center justify-between border border-transparent hover:border-[#8B4513]/20 transition-all shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-orange-50 text-[#8B4513] flex items-center justify-center">
                                    {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full rounded-full object-cover" /> : <User className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{s.nickname}</h3>
                                    <p className="text-xs text-gray-400">{s.name}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-xs uppercase font-bold text-gray-300">{s.role || "sales"}</p>
                                    <div className="flex flex-col items-end">
                                        {(s.role === "sales" || s.role === "dual" || !s.role) && (
                                            <span className="font-mono font-bold text-[#8B4513] text-sm">Comm: {(s.commissionRate * 100)}%</span>
                                        )}
                                        {(s.role === "therapist" || s.role === "dual") && (
                                            <span className="font-mono font-bold text-emerald-600 text-xs">Rate: {s.hourlyRate}฿/hr</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => startEdit(s)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-blue-500">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(s.id)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {/* Inactive Section (if any) could go here */}
                </div>
            </div>
        </div >
    )
}
