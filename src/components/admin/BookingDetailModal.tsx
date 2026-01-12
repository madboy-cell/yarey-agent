
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { X, Trash2, Save, User, Mail, Phone, Clock, FileText, Activity, Calendar, Globe, CreditCard, DollarSign, Users, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { nationalities } from "@/lib/nationalities"

interface BookingDetailModalProps {
    booking: any
    treatments?: any[]
    salesmen?: any[]
    onClose: () => void
    onSave: (id: string, updates: any) => void
    onDelete: (id: string) => void
    statusColors: Record<string, string>
}

export const BookingDetailModal = ({ booking, treatments = [], salesmen = [], onClose, onSave, onDelete, statusColors }: BookingDetailModalProps) => {
    const [formData, setFormData] = useState(booking)

    useEffect(() => {
        setFormData(booking)
    }, [booking])

    const handleChange = (field: string, value: any) => {
        if (field.startsWith("contact.")) {
            const contactField = field.split(".")[1]
            setFormData({
                ...formData,
                contact: { ...formData.contact, [contactField]: value }
            })
        } else {
            setFormData({ ...formData, [field]: value })
        }
    }

    const handleSave = () => {
        onSave(booking.id, formData)
        onClose()
    }

    const handleDelete = () => {
        if (confirm("Are you sure you want to permanently delete this booking?")) {
            onDelete(booking.id)
            onClose()
        }
    }

    const getTimeValue = (timeStr: string) => {
        if (!timeStr) return ""
        return timeStr.split(" ")[0]
    }

    // Find salesman and therapist names
    const salesman = salesmen.find(s => s.id === formData.salesmanId)
    const therapist = salesmen.find(s => s.id === formData.therapistId)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0c2627] w-full max-w-2xl rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-primary/20 overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-8 pb-4 flex justify-between items-start border-b border-primary/10 bg-[#042A40]/30">
                    <div>
                        <h2 className="font-serif text-2xl text-primary tracking-wide">Booking Details</h2>
                        <div className="flex items-center gap-2 mt-2">
                            <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border backdrop-blur-md ${statusColors[formData.status]?.replace('bg-white', 'bg-white/10') || "bg-primary/20 text-primary border-primary/20"}`}>
                                {formData.status}
                            </div>
                            <span className="text-[10px] font-mono text-foreground/40">ID: {formData.id}</span>
                        </div>
                    </div>
                    <Button variant="ghost" onClick={onClose} className="rounded-full h-10 w-10 p-0 hover:bg-white/5 text-foreground/60 hover:text-foreground">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Body - Scrollable */}
                <div className="p-8 overflow-y-auto space-y-8 flex-1">

                    {/* Revenue Summary Card */}
                    <div className="bg-gradient-to-r from-primary/20 to-emerald-500/10 border border-primary/30 rounded-2xl p-6">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <div className="text-[10px] uppercase tracking-widest text-foreground/40">Total Revenue</div>
                                <div className="text-2xl font-mono font-bold text-primary">฿{(formData.priceSnapshot || 0).toLocaleString()}</div>
                            </div>
                            <div>
                                <div className="text-[10px] uppercase tracking-widest text-foreground/40">Guests</div>
                                <div className="text-2xl font-mono font-bold text-foreground">{formData.guests || 1}</div>
                            </div>
                            <div>
                                <div className="text-[10px] uppercase tracking-widest text-foreground/40">Payment</div>
                                <div className="text-lg font-bold text-foreground">{formData.paymentMethod || "—"}</div>
                            </div>
                        </div>
                    </div>

                    {/* Guest Info Section */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold flex items-center gap-2">
                            <User className="w-3 h-3" /> Guest Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-foreground/60">Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-black focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    value={formData.contact?.name || ""}
                                    onChange={(e) => handleChange("contact.name", e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-foreground/60">Source</label>
                                <input
                                    type="text"
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-black focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    value={formData.contact?.source || ""}
                                    onChange={(e) => handleChange("contact.source", e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-foreground/60">Email</label>
                                <div className="relative">
                                    <Mail className="w-3 h-3 absolute left-4 top-3 text-gray-400" />
                                    <input
                                        type="email"
                                        className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm text-black focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        value={formData.contact?.email || ""}
                                        onChange={(e) => handleChange("contact.email", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-foreground/60">Phone / Handle</label>
                                <div className="relative">
                                    <Phone className="w-3 h-3 absolute left-4 top-3 text-gray-400" />
                                    <input
                                        type="text"
                                        className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm text-black focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        value={formData.contact?.handle || ""}
                                        onChange={(e) => handleChange("contact.handle", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1 col-span-2">
                                <label className="text-xs font-semibold text-foreground/60">Nationality</label>
                                <div className="relative">
                                    <Globe className="w-3 h-3 absolute left-4 top-3 text-gray-400" />
                                    <input
                                        type="text"
                                        list="nationality-list"
                                        className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm text-black focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        placeholder="Type to search..."
                                        value={formData.contact?.nationality || ""}
                                        onChange={(e) => handleChange("contact.nationality", e.target.value)}
                                    />
                                    <datalist id="nationality-list">
                                        {nationalities.map(n => (
                                            <option key={n} value={n} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items/Treatments Section */}
                    {formData.items && formData.items.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold flex items-center gap-2">
                                <Users className="w-3 h-3" /> Guest Treatments ({formData.items.length} items)
                            </h3>
                            <div className="space-y-2">
                                {formData.items.map((item: any, idx: number) => (
                                    <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
                                        <div>
                                            <div className="font-medium text-foreground">{item.treatment || item.title}</div>
                                            <div className="text-xs text-foreground/40">
                                                {item.guestLabel || `Guest ${idx + 1}`}
                                                {item.duration && ` • ${item.duration} min`}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono text-primary font-bold">฿{(item.price || item.price_thb || 0).toLocaleString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* If no items array, show single treatment */}
                    {(!formData.items || formData.items.length === 0) && (
                        <div className="space-y-4">
                            <h3 className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold flex items-center gap-2">
                                <Activity className="w-3 h-3" /> Treatment
                            </h3>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="font-medium text-foreground">{formData.treatment || "—"}</div>
                                        <div className="text-xs text-foreground/40">{formData.guests || 1} guest(s)</div>
                                    </div>
                                    <div className="font-mono text-primary font-bold">฿{(formData.priceSnapshot || 0).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sales & Commission Section */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold flex items-center gap-2">
                            <DollarSign className="w-3 h-3" /> Sales & Commission
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                                <div className="text-[10px] uppercase tracking-widest text-orange-400/60 mb-1">Sold By</div>
                                <div className="font-bold text-orange-400">{salesman?.nickname || salesman?.name || "—"}</div>
                                {formData.commissionAmount > 0 && (
                                    <div className="text-xs text-foreground/40 mt-1">
                                        Commission: <span className="text-orange-400 font-mono">฿{formData.commissionAmount.toLocaleString()}</span>
                                        <span className="opacity-50"> ({Math.round((formData.commissionSnapshot || 0) * 100)}%)</span>
                                    </div>
                                )}
                            </div>
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                                <div className="text-[10px] uppercase tracking-widest text-purple-400/60 mb-1">Therapist</div>
                                <div className="font-bold text-purple-400">{therapist?.nickname || therapist?.name || "—"}</div>
                                {formData.therapistCostSnapshot > 0 && (
                                    <div className="text-xs text-foreground/40 mt-1">
                                        Cost: <span className="text-purple-400 font-mono">฿{formData.therapistCostSnapshot.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Booking Info Section */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold flex items-center gap-2">
                            <Calendar className="w-3 h-3" /> Schedule & Status
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-foreground/60">Date</label>
                                <input
                                    type="date"
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-black focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    value={formData.date || ""}
                                    onChange={(e) => handleChange("date", e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-foreground/60">Time</label>
                                <div className="relative">
                                    <Clock className="w-3 h-3 absolute left-4 top-3 text-gray-400" />
                                    <input
                                        type="time"
                                        className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm text-black focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        value={getTimeValue(formData.time)}
                                        onChange={(e) => handleChange("time", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-foreground/60">Payment Method</label>
                                <select
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-black focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    value={formData.paymentMethod || ""}
                                    onChange={(e) => handleChange("paymentMethod", e.target.value)}
                                >
                                    <option value="">Select...</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Transfer">Bank Transfer</option>
                                    <option value="Credit Card">Credit Card</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-foreground/60">Status</label>
                                <select
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-black focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    value={formData.status}
                                    onChange={(e) => handleChange("status", e.target.value)}
                                >
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Arrived">Arrived</option>
                                    <option value="In Ritual">In Ritual</option>
                                    <option value="Complete">Complete</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground/60">Notes</label>
                            <textarea
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                                value={formData.notes || ""}
                                onChange={(e) => handleChange("notes", e.target.value)}
                                placeholder="Add guest preferences..."
                            />
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-primary/10 bg-[#042A40]/30 flex justify-between items-center">
                    <Button
                        variant="ghost"
                        onClick={handleDelete}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4"
                    >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Booking
                    </Button>

                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="rounded-xl px-6 border-white/10 text-foreground hover:bg-white/5 hover:text-white bg-transparent">
                            Cancel
                        </Button>
                        <Button onClick={handleSave} className="bg-primary text-[#0A2021] hover:bg-primary/90 rounded-xl px-8 font-bold">
                            <Save className="w-4 h-4 mr-2" /> Save Changes
                        </Button>
                    </div>
                </div>

            </motion.div>
        </div>
    )
}
