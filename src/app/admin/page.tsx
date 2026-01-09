"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Container } from "@/components/layout/container"
import { PulseTab } from "@/components/admin/PulseTab"
import { Button } from "@/components/ui/button"
import {
    Users, Calendar, Clock, MoreVertical, Wind, Sun, Users2, CheckCircle2,
    Trash2, QrCode, MessageCircle, Play, CheckSquare, LogOut, Plus, Edit2,
    Card, Eye, EyeOff, Save, X, LayoutGrid, List, MapPin, Receipt, Gift, Mail, Download, FlaskConical, DollarSign, User, ChevronDown
} from "lucide-react"
import html2canvas from "html2canvas"
import { useFirestoreCollection, useFirestoreCRUD, useFirestoreDoc } from "@/hooks/useFirestore"
import { db } from "@/lib/firebase"
import { collection, doc, onSnapshot } from "firebase/firestore"
import { BookingCard } from "@/components/admin/BookingCard"
import { BookingDetailModal } from "@/components/admin/BookingDetailModal"
import { DailyClosingModal } from "@/components/admin/DailyClosingModal" // Import Z-Report

// Types
export interface Booking {
    id: string
    guests: number
    time: string
    date: string
    status: string
    treatment: string
    contact?: {
        name: string
        method: string
        handle: string
    }
    notes?: string
    priceSnapshot?: number
    paymentMethod?: "Cash" | "Transfer" | "Credit Card"
    // Salesman / Commission
    salesmanId?: string
    commissionSnapshot?: number
    commissionAmount?: number
}

interface Salesman {
    id: string
    name: string
    nickname: string
    commissionRate: number
    active: boolean
    photoUrl?: string
    joinedDate: string
}

interface Treatment {
    id: string
    title: string
    category: string
    duration_min: number
    price_thb: number
    description: string
    active: boolean
    includes?: string[]
}

interface Block {
    id: string
    time: string
    date: string
    reason: string
}

interface Voucher {
    id: string
    code: string
    treatmentId: string
    treatmentTitle: string
    pricePaid: number
    originalPrice: number
    status: "ISSUED" | "REDEEMED" | "VOID"
    recipientName: string
    issuedAt: string
    expiresAt?: string
    clientId?: string
}

interface Client {
    id: string
    name: string
    email: string
    phone?: string
}

interface Session {
    id: string
    guestName: string
    createdAt: number
    pillarID: number
    metrics: {
        intake: {
            hrv: number
            rhr: number
            respRate: number
        }
    }
    output: {
        pillarName: string
        trigger: string
    }
}

export default function AdminDashboard() {
    const searchParams = useSearchParams()
    const [activeTab, setActiveTab] = useState<"sanctuary" | "menu" | "pulse" | "vouchers" | "lab">("sanctuary")

    // Handle Deep Links (e.g. from CRM)
    useEffect(() => {
        const tab = searchParams.get("tab")
        const recipient = searchParams.get("recipient")
        const email = searchParams.get("email")
        const clientId = searchParams.get("clientId")

        if (tab === "vouchers") {
            setActiveTab("vouchers")
        }
        if (recipient) {
            setVoucherForm(prev => ({ ...prev, recipientName: recipient, clientId: clientId || undefined }))
        }
    }, [searchParams])
    // Optimistic UI for instant feedback
    const [optimisticVibe, setOptimisticVibe] = useState<string | null>(null)
    const [headerInfo, setHeaderInfo] = useState("")

    // Live Clock & Phase Logic
    useEffect(() => {
        const updateHeader = () => {
            const now = new Date()
            const date = now.toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()
            const hour = now.getHours()
            let phase = "MORNING"
            // 7AM-2PM Morning, 2PM-5PM Sun Peak, 5PM+ Evening (Matches logic elsewhere)
            if (hour >= 14) phase = "SUN PEAK"
            if (hour >= 17) phase = "EVENING"

            setHeaderInfo(`${date} • ${phase}`)
        }
        updateHeader()
        const timer = setInterval(updateHeader, 60000)
        return () => clearInterval(timer)
    }, [])

    // --- Remote Data ---
    const [showDailyClosing, setShowDailyClosing] = useState(false)

    // Data Fetching
    const { data: rawBookings } = useFirestoreCollection<Booking>("bookings")
    const { data: treatments } = useFirestoreCollection<Treatment>("treatments")
    const { data: blocks } = useFirestoreCollection<Block>("blocks")
    const { data: vouchers } = useFirestoreCollection<Voucher>("vouchers")
    const { data: salesmen } = useFirestoreCollection<Salesman>("salesmen")
    const { data: sessions } = useFirestoreCollection<Session>("sessions")
    const { data: clients } = useFirestoreCollection<Client>("clients") // Fetch Clients

    // Derived: Today's Bookings
    const todayStr = new Date().toLocaleDateString("en-CA")
    const todayBookings = rawBookings.filter(b => b.date === "Today" || b.date === todayStr)
    const bookings = rawBookings // Alias backwards compatibility for history lookups like 'getVisitCount'

    // Global Settings (Vibe) - Direct Document Subscription
    const { data: vibeDoc } = useFirestoreDoc<{ current: string, id: string }>("settings", "vibe")
    const vibe = vibeDoc?.current || "Quiet"

    // Prioritize local interaction for snappiness
    const displayVibe = optimisticVibe || vibe

    const [selectedBooking, setSelectedBooking] = useState<any | null>(null)

    // --- CRUD Operations ---
    const bookingOps = useFirestoreCRUD("bookings")
    const treatmentOps = useFirestoreCRUD("treatments")
    const salesmanOps = useFirestoreCRUD("salesmen")
    const settingsOps = useFirestoreCRUD("settings")
    const blockOps = useFirestoreCRUD("blocks")
    const voucherOps = useFirestoreCRUD("vouchers")

    // --- Actions ---

    // Enhanced Update Handler for Modal
    const handleUpdateBooking = async (id: string, updates: any) => {
        await bookingOps.update(id, updates)
    }

    const handleDeleteBooking = async (id: string) => {
        await bookingOps.remove(id)
    }

    // Delete All Bookings Function
    const handleDeleteAllBookings = async () => {
        const confirmMessage = `⚠️ WARNING: This will permanently delete ALL ${rawBookings.length} bookings from the database.\n\nType "DELETE ALL" to confirm:`
        const userInput = prompt(confirmMessage)

        if (userInput === "DELETE ALL") {
            try {
                console.log(`🗑️  Deleting ${rawBookings.length} bookings...`)

                // Delete all bookings one by one
                for (const booking of rawBookings) {
                    await bookingOps.remove(booking.id)
                }

                alert(`✅ Successfully deleted ${rawBookings.length} bookings!`)
            } catch (error) {
                console.error('Error deleting bookings:', error)
                alert('❌ Error deleting bookings. Check console for details.')
            }
        } else if (userInput !== null) {
            alert('Deletion cancelled. You must type "DELETE ALL" exactly.')
        }
    }

    // Form State for Treatments
    const [isEditing, setIsEditing] = useState(false)
    const [currentTreatment, setCurrentTreatment] = useState<Partial<Treatment>>({})
    const [deleteId, setDeleteId] = useState<string | null>(null)

    // Form State for Vouchers
    const [voucherForm, setVoucherForm] = useState({
        treatmentId: "",
        pricePaid: 0,
        recipientName: "",
        validityPeriod: "3M", // 1M, 3M, 6M, 1Y, CUSTOM
        customExpiration: "",
        clientId: undefined as string | undefined
    })
    const [generatedVoucher, setGeneratedVoucher] = useState<Voucher | null>(null)
    const [isMemberSearchOpen, setIsMemberSearchOpen] = useState(false)

    // Ticket Generation State
    const [tempVoucher, setTempVoucher] = useState<Voucher | null>(null)
    const [downloadingId, setDownloadingId] = useState<string | null>(null)
    const ticketRef = useRef<HTMLDivElement>(null)

    // --- Interactions ---

    // --- Actions ---

    const getVisitCount = (handle?: string) => {
        if (!handle) return 1
        return bookings.filter(b => b.contact?.handle === handle && b.status !== "Cancelled").length
    }

    const getPillarColor = (id: number) => {
        switch (id) {
            case 1: return "bg-purple-100 text-purple-600 border-purple-200" // Nervous
            case 2: return "bg-red-100 text-red-600 border-red-200" // Repair
            case 3: return "bg-emerald-100 text-emerald-600 border-emerald-200" // Resilience
            case 4: return "bg-blue-100 text-blue-600 border-blue-200" // Respiratory
            case 5: return "bg-amber-100 text-amber-600 border-amber-200" // Circadian
            default: return "bg-gray-100 text-gray-600 border-gray-200"
        }
    }

    const updateVibe = async (newVibe: string) => {
        try {
            console.log("Updating vibe to:", newVibe)
            setOptimisticVibe(newVibe) // Instant visual update
            // Use set to ensure we target/create the specific 'vibe' document ID
            await settingsOps.set("vibe", { id: "vibe", current: newVibe })
        } catch (err: any) {
            console.error("Vibe Update Error:", err)
            alert(`Failed to update vibe: ${err.message}`)
            setOptimisticVibe(null) // Revert on failure
        }
    }

    const toggleBlock = async (timeSlot: string) => {
        const existing = blocks.find(b => b.time === timeSlot)
        if (existing) {
            if (confirm(`Unblock ${timeSlot}?`)) {
                await blockOps.remove(existing.id)
            }
        } else {
            const reason = prompt(`Reason for blocking ${timeSlot}? (e.g. Maintenance)`, "Private Event")
            if (reason) {
                await blockOps.add({ time: timeSlot, date: "Today", reason })
            }
        }
    }

    const handleStatus = async (id: string, newStatus: string) => {
        await bookingOps.update(id, { status: newStatus })
    }

    const handleNote = async (id: string, note: string) => {
        await bookingOps.update(id, { notes: note })
    }

    // Treatment Logic
    const saveTreatment = async () => {
        if (!currentTreatment.title || !currentTreatment.price_thb) return alert("Title and Price required")

        const payload = {
            title: currentTreatment.title,
            price_thb: currentTreatment.price_thb,
            duration_min: currentTreatment.duration_min,
            category: currentTreatment.category,
            description: currentTreatment.description,
            active: currentTreatment.active ?? true,
            includes: currentTreatment.includes || []
        }

        if (currentTreatment.id) {
            await treatmentOps.update(currentTreatment.id, payload)
        } else {
            await treatmentOps.add(payload)
        }

        setIsEditing(false)
        setCurrentTreatment({})
    }

    const deleteTreatment = (id: string) => {
        setDeleteId(id)
    }

    const confirmDelete = async () => {
        if (deleteId) {
            await treatmentOps.remove(deleteId)
            setDeleteId(null)
        }
    }

    const toggleActive = async (id: string) => {
        const t = treatments.find(x => x.id === id)
        if (t) {
            await treatmentOps.update(id, { active: !t.active })
        }
    }

    // Voucher Logic
    const generateVoucher = async () => {
        if (!voucherForm.treatmentId) return alert("Please select a treatment")

        // Strict Member Check
        if (!voucherForm.clientId) {
            return alert("Restricted: You must select a valid member from the search list. Walk-in guests must be registered first.")
        }

        const treatment = treatments.find(t => t.id === voucherForm.treatmentId)
        if (!treatment) return

        const code = `PROMO-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

        const newVoucher = {
            code,
            treatmentId: treatment.id,
            // Prepend duration for easy parsing by Member Portal regex
            treatmentTitle: `${treatment.duration_min}m | ${treatment.title}`,
            pricePaid: voucherForm.pricePaid,
            originalPrice: treatment.price_thb,
            status: "ISSUED",
            recipientName: voucherForm.recipientName,
            clientId: voucherForm.clientId,
            issuedAt: new Date().toISOString(),
            expiresAt: (() => {
                const d = new Date()
                if (voucherForm.validityPeriod === "1M") d.setMonth(d.getMonth() + 1)
                else if (voucherForm.validityPeriod === "3M") d.setMonth(d.getMonth() + 3)
                else if (voucherForm.validityPeriod === "6M") d.setMonth(d.getMonth() + 6)
                else if (voucherForm.validityPeriod === "1Y") d.setFullYear(d.getFullYear() + 1)
                else if (voucherForm.validityPeriod === "CUSTOM" && voucherForm.customExpiration) return new Date(voucherForm.customExpiration).toISOString()
                else d.setMonth(d.getMonth() + 3) // Default fallback
                return d.toISOString()
            })()
        }

        const id = await voucherOps.add(newVoucher)
        setGeneratedVoucher({ ...newVoucher, id } as Voucher)

        setVoucherForm(prev => ({ ...prev, recipientName: "" }))
    }

    // Auto-fill price when treatment selected
    useEffect(() => {
        if (voucherForm.treatmentId) {
            const t = treatments.find(x => x.id === voucherForm.treatmentId)
            if (t) setVoucherForm(prev => ({ ...prev, pricePaid: t.price_thb }))
        }
    }, [voucherForm.treatmentId, treatments])

    // --- Ticket Download Logic ---
    const downloadTicket = async (v: Voucher) => {
        setDownloadingId(v.id)
        setTempVoucher(v)

        // Wait for render
        setTimeout(async () => {
            if (ticketRef.current) {
                try {
                    const canvas = await html2canvas(ticketRef.current, {
                        backgroundColor: null, // Transparent bg if needed, but we have styles
                        scale: 2, // High res
                        logging: false,
                        useCORS: true // For images if any (noise texture)
                    })

                    const link = document.createElement('a')
                    link.download = `Yarey_Ticket_${v.code}.png`
                    link.href = canvas.toDataURL('image/png')
                    link.click()
                } catch (err: any) {
                    console.error("Ticket generation failed", err)
                    alert(`Failed to generate ticket image: ${err?.message || "Unknown error"}`)
                }
            } else {
                console.error("Ticket ref not found")
                alert("Ticket generation failed: DOM element not ready.")
            }
            setDownloadingId(null)
            setTempVoucher(null)
        }, 800) // Increased delay slightly to be safe
    }


    // --- UI Helpers ---

    // Helper: Determine phase from HH:MM or Phase String
    const getCurrentPhase = () => {
        const hour = new Date().getHours()
        if (hour < 14) return "Morning"
        if (hour < 17) return "Sun Peak"
        return "Evening"
    }

    const isBookingInPhase = (bookingTime: string | undefined, distinctPhase: string) => {
        if (!bookingTime) return false
        if (bookingTime.includes(distinctPhase)) return true
        const [timePart, period] = bookingTime.split(" ")
        let [hours] = timePart.split(":").map(Number)
        if (isNaN(hours)) return false

        // Convert 12-hour to 24-hour format
        if (period) {
            if (period.toUpperCase() === "PM" && hours !== 12) {
                hours += 12
            } else if (period.toUpperCase() === "AM" && hours === 12) {
                hours = 0
            }
        }

        if (distinctPhase === "Morning") return hours < 14
        if (distinctPhase === "Sun Peak") return hours >= 14 && hours < 17
        if (distinctPhase === "Evening") return hours >= 17
        return false
    }

    const timeline = {
        Morning: todayBookings.filter(b => isBookingInPhase(b.time, "Morning")),
        SunPeak: todayBookings.filter(b => isBookingInPhase(b.time, "Sun Peak")),
        Evening: todayBookings.filter(b => isBookingInPhase(b.time, "Evening"))
    }

    const statusColors: any = {
        "Confirmed": "bg-primary/10 border-primary/30 text-primary backdrop-blur-sm",
        "Arrived": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        "In Ritual": "bg-orange-500/20 text-orange-300 border-orange-500/30",
        "Redeemed": "bg-white/5 text-foreground/40 border-white/10",
        "Complete": "bg-white/5 text-foreground/40 border-white/10 opacity-60"
    }

    return (
        <div className="min-h-screen bg-background py-16 aura-bg relative overflow-hidden">
            <div className="fixed inset-0 noise z-0 pointer-events-none opacity-[0.03]" />

            <Container className="max-w-7xl relative z-10 hidden lg:block">

                {/* Header */}
                <header className="flex justify-between items-end mb-12">
                    <div className="space-y-4">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-[10px] uppercase tracking-[0.5em] text-primary/60 font-medium"
                        >
                            {headerInfo || "STAFF PORTAL • PHUKET"}
                        </motion.div>
                        <h1 className="text-4xl md:text-6xl font-serif text-foreground tracking-tighter lowercase leading-none">Host Sanctuary.</h1>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Tab Switcher */}
                        <div className="bg-white/50 backdrop-blur-sm p-1 rounded-full flex border border-border/50">
                            {[
                                { id: "sanctuary", label: "Host View" },
                                { id: "menu", label: "Menu CMS" },
                                { id: "vouchers", label: "Vouchers" },
                                { id: "pulse", label: "Pulse" },
                                { id: "lab", label: "Lab" }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeTab === tab.id ? "bg-primary text-white shadow-lg" : "text-foreground/40 hover:text-foreground"}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>


                        {/* New Booking Action */}
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                onClick={() => setShowDailyClosing(true)}
                                className="rounded-full border-primary/20 text-primary hover:bg-primary/5 px-4 py-2 h-auto text-xs font-bold uppercase tracking-widest w-10 h-10 p-0 flex items-center justify-center"
                                title="Daily Closing Z-Report"
                            >
                                <Receipt className="w-4 h-4" />
                            </Button>

                            <Link href="/admin/finance">
                                <Button variant="outline" className="rounded-full border-primary/20 text-primary hover:bg-primary/5 px-4 py-2 h-auto text-xs font-bold uppercase tracking-widest w-10 h-10 p-0 flex items-center justify-center" title="Finance & Payroll">
                                    <DollarSign className="w-4 h-4" />
                                </Button>
                            </Link>
                            <Link href="/admin/clients">
                                <Button variant="outline" className="rounded-full border-primary/20 text-primary hover:bg-primary/5 px-4 py-2 h-auto text-xs font-bold uppercase tracking-widest w-10 h-10 p-0 flex items-center justify-center" title="Client CRM">
                                    <User className="w-4 h-4" />
                                </Button>
                            </Link>
                            <Link href="/admin/walk-in">
                                <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 h-auto text-xs font-bold uppercase tracking-widest shadow-xl shadow-primary/20">
                                    <Plus className="w-4 h-4 mr-2" /> New Booking
                                </Button>
                            </Link>
                            <Button
                                onClick={handleDeleteAllBookings}
                                variant="outline"
                                className="rounded-full border-red-500/20 text-red-500 hover:bg-red-500/5 px-6 py-2 h-auto text-xs font-bold uppercase tracking-widest"
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete All
                            </Button>

                        </div>
                    </div>
                </header>

                {/* Tab Content */}
                {activeTab === "sanctuary" && (
                    // --- HOST VIEW (Timeline) ---
                    <div className="grid grid-cols-3 gap-8 min-h-[600px]">
                        {Object.entries(timeline).map(([phase, items], i) => (
                            <div key={phase} className="space-y-6">
                                <div className="flex items-center justify-between border-b border-border/40 pb-4">
                                    <h3 className="font-serif text-xl text-foreground/60 lowercase flex items-center gap-3">
                                        {i === 0 && <Sun className="w-4 h-4 opacity-50 rotate-[-45deg]" />}
                                        {i === 1 && <Sun className="w-4 h-4 opacity-50" />}
                                        {i === 2 && <Wind className="w-4 h-4 opacity-50" />}
                                        {phase.replace(/([A-Z])/g, ' $1').trim()}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] bg-primary/5 px-3 py-1 rounded-full text-primary font-bold tracking-widest uppercase">
                                            {items.filter(b => ["Arrived", "In Ritual", "Complete"].includes(b.status)).reduce((acc, b) => acc + (Number(b.guests) || 1), 0)}
                                            <span className="opacity-40"> / {items.reduce((acc, b) => acc + (Number(b.guests) || 1), 0)}</span> Guests
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleBlock(phase.replace(/([A-Z])/g, ' $1').trim())}
                                            className={`h-6 text-[10px] uppercase font-bold tracking-widest border ${blocks.find(b => b.time === phase.replace(/([A-Z])/g, ' $1').trim()) ? "bg-red-500 text-white border-red-500 hover:bg-red-600" : "border-border text-foreground/40"}`}
                                        >
                                            {blocks.find(b => b.time === phase.replace(/([A-Z])/g, ' $1').trim()) ? "Blocked" : "Block"}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {/* Blocked State Overlay */}
                                    {blocks.find(b => b.time === phase.replace(/([A-Z])/g, ' $1').trim()) && (
                                        <div className="bg-red-50/50 border border-red-100 p-6 rounded-[2rem] text-center mb-4">
                                            <div className="text-red-500 font-serif text-xl mb-1">Sanctuary Closed</div>
                                            <div className="text-[10px] uppercase tracking-widest text-red-400 font-bold">{blocks.find(b => b.time === phase.replace(/([A-Z])/g, ' $1').trim())?.reason}</div>
                                        </div>
                                    )}

                                    <AnimatePresence>
                                        {items.map(booking => (
                                            <BookingCard
                                                key={booking.id}
                                                booking={{ ...booking, visitCount: getVisitCount(booking.contact?.handle) }}
                                                statusColors={statusColors}
                                                onClick={() => setSelectedBooking({ ...booking, visitCount: getVisitCount(booking.contact?.handle) })}
                                            />
                                        ))}
                                    </AnimatePresence>

                                    {items.length === 0 && <div className="h-32 rounded-[2rem] border border-dashed border-border/40 flex items-center justify-center"><p className="text-foreground/20 text-xs italic">Free flow</p></div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Detail Modal */}
                <AnimatePresence>
                    {selectedBooking && (
                        <BookingDetailModal
                            booking={selectedBooking}
                            treatments={treatments}
                            statusColors={statusColors}
                            onClose={() => setSelectedBooking(null)}
                            onSave={handleUpdateBooking}
                            onDelete={handleDeleteBooking}
                        />
                    )}
                </AnimatePresence>
                {
                    activeTab === "menu" && (
                        // --- MENU MANAGER (CMS) ---
                        <div className="grid grid-cols-12 gap-12">
                            <div className="col-span-8 space-y-8">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-serif text-2xl text-foreground">Treatment Menu</h2>
                                    <Button onClick={() => { setCurrentTreatment({}); setIsEditing(true) }} className="rounded-full px-6 bg-primary text-white hover:bg-primary/90">
                                        <Plus className="w-4 h-4 mr-2" /> Add New
                                    </Button>
                                </div>

                                <div className="bg-[#042A40]/30 backdrop-blur-md border border-primary/10 rounded-[2rem] overflow-hidden shadow-2xl">
                                    <table className="w-full text-left">
                                        <thead className="bg-secondary/30 border-b border-primary/10">
                                            <tr>
                                                <th className="p-6 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Treatment</th>
                                                <th className="p-6 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Category</th>
                                                <th className="p-6 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Price</th>
                                                <th className="p-6 text-[10px] uppercase tracking-widest text-foreground/40 font-bold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-primary/5">
                                            {treatments.map((t) => (
                                                <tr key={t.id} className={`hover:bg-primary/5 transition-colors ${!t.active ? "opacity-50" : ""}`}>
                                                    <td className="p-6">
                                                        <div className="font-serif text-lg">{t.title}</div>
                                                        <div className="text-xs text-foreground/50">{t.duration_min} Minutes</div>
                                                    </td>
                                                    <td className="p-6">
                                                        <span className="px-3 py-1 rounded-full bg-background border border-border text-[10px] uppercase tracking-wider font-bold">{t.category}</span>
                                                    </td>
                                                    <td className="p-6 font-mono text-sm">฿{t.price_thb.toLocaleString()}</td>
                                                    <td className="p-6 text-right space-x-2">
                                                        <Button variant="ghost" onClick={() => toggleActive(t.id)} title={t.active ? "Hide" : "Show"}>
                                                            {t.active ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                                                        </Button>
                                                        <Button variant="ghost" onClick={() => { setCurrentTreatment(t); setIsEditing(true) }}>
                                                            <Edit2 className="w-4 h-4 text-blue-500" />
                                                        </Button>
                                                        <Button variant="ghost" onClick={() => deleteTreatment(t.id)}>
                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Edit Form Panel */}
                            <div className="col-span-4">
                                <AnimatePresence>
                                    {isEditing && (
                                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-card rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-primary/20 sticky top-32 backdrop-blur-md">
                                            <div className="flex justify-between items-center mb-8">
                                                <h3 className="font-serif text-xl">{currentTreatment.id ? "Edit Ritual" : "New Ritual"}</h3>
                                                <Button variant="ghost" onClick={() => setIsEditing(false)}><X className="w-5 h-5" /></Button>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold ml-2">Title</label>
                                                    <input type="text" className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" value={currentTreatment.title || ""} onChange={e => setCurrentTreatment({ ...currentTreatment, title: e.target.value })} placeholder="e.g. Deep Tissue" />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold ml-2">Price (THB)</label>
                                                        <input type="number" className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" value={currentTreatment.price_thb || ""} onChange={e => setCurrentTreatment({ ...currentTreatment, price_thb: Number(e.target.value) })} placeholder="2500" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold ml-2">Duration (Min)</label>
                                                        <input type="number" className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" value={currentTreatment.duration_min || ""} onChange={e => setCurrentTreatment({ ...currentTreatment, duration_min: Number(e.target.value) })} placeholder="60" />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold ml-2">Category</label>
                                                    <select className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" value={currentTreatment.category || "Massage"} onChange={e => setCurrentTreatment({ ...currentTreatment, category: e.target.value })}>
                                                        <option value="Massage">Massage</option>
                                                        <option value="Nordic Zone">Nordic Zone</option>
                                                        <option value="Rest">Rest</option>
                                                        <option value="Package">Package</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold ml-2">Description</label>
                                                    <textarea className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary min-h-[100px]" value={currentTreatment.description || ""} onChange={e => setCurrentTreatment({ ...currentTreatment, description: e.target.value })} placeholder="Guest facing copy..." />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold ml-2">Includes (CSV)</label>
                                                    <input type="text" className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" value={currentTreatment.includes?.join(", ") || ""} onChange={e => setCurrentTreatment({ ...currentTreatment, includes: e.target.value.split(",").map(s => s.trim()) })} placeholder="Sauna, Tea, Scrub" />
                                                </div>

                                                <Button onClick={saveTreatment} className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white py-6">
                                                    <Save className="w-4 h-4 mr-2" /> Save Ritual
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === "vouchers" && (
                        <div className="grid grid-cols-12 gap-12">
                            {/* 1. Generator Panel (Left) */}
                            <div className="col-span-5 space-y-8">
                                <div>
                                    <h2 className="font-serif text-2xl text-foreground mb-1">Issue Voucher</h2>
                                    <p className="text-sm text-foreground/60">Generate prepaid codes for social media sales.</p>
                                </div>

                                <div className="bg-[#0c2627] rounded-[2rem] p-8 border border-primary/20 shadow-lg space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold ml-2">Select Ritual</label>
                                        <select
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-primary appearance-none"
                                            value={voucherForm.treatmentId}
                                            onChange={(e) => setVoucherForm(prev => ({ ...prev, treatmentId: e.target.value }))}
                                        >
                                            <option value="">-- Choose Treatment --</option>
                                            {treatments.filter(t => t.active).map(t => (
                                                <option key={t.id} value={t.id}>{t.duration_min}m | {t.title} ({t.price_thb} THB)</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold ml-2">Promo Price (THB)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-primary"
                                            value={voucherForm.pricePaid}
                                            onChange={(e) => setVoucherForm(prev => ({ ...prev, pricePaid: Number(e.target.value) }))}
                                        />
                                        <p className="text-[10px] text-foreground/40 italic pl-2">Current Standard Price: {treatments.find(t => t.id === voucherForm.treatmentId)?.price_thb || 0} THB</p>
                                    </div>

                                    <div className="space-y-2 relative">
                                        <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold ml-2">Recipient Name</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-primary placeholder:text-gray-300 pr-10"
                                                placeholder="Select or type member name..."
                                                value={voucherForm.recipientName}
                                                onFocus={() => setIsMemberSearchOpen(true)}
                                                onBlur={() => setTimeout(() => setIsMemberSearchOpen(false), 200)}
                                                onChange={(e) => {
                                                    setVoucherForm(prev => ({ ...prev, recipientName: e.target.value, clientId: undefined }))
                                                    setIsMemberSearchOpen(true)
                                                }}
                                            />

                                            {/* Status Icon */}
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                {voucherForm.clientId ? (
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>

                                            {/* Member Suggestions Dropdown */}
                                            {isMemberSearchOpen && (
                                                <div className="absolute top-full left-0 w-full bg-white mt-1 rounded-xl shadow-xl border border-gray-100 z-50 max-h-60 overflow-y-auto">
                                                    {clients
                                                        .filter(c => c.name.toLowerCase().includes(voucherForm.recipientName.toLowerCase()))
                                                        .slice(0, 100)
                                                        .map(client => (
                                                            <div
                                                                key={client.id}
                                                                className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0 text-black transition-colors"
                                                                onClick={() => setVoucherForm(prev => ({ ...prev, recipientName: client.name, clientId: client.id }))}
                                                            >
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-sm text-gray-900">{client.name}</span>
                                                                    <span className="text-[10px] text-gray-500">{client.email}</span>
                                                                </div>
                                                                <div className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                                                    {client.phone || "-"}
                                                                </div>
                                                            </div>
                                                        ))
                                                    }
                                                    {clients.length === 0 && (
                                                        <div className="p-4 text-center text-xs text-gray-400 italic">No members found. Sync from history?</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold ml-2">Validity Period</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <select
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-primary"
                                                value={voucherForm.validityPeriod}
                                                onChange={(e) => setVoucherForm(prev => ({ ...prev, validityPeriod: e.target.value }))}
                                            >
                                                <option value="1M">1 Month</option>
                                                <option value="3M">3 Months (Standard)</option>
                                                <option value="6M">6 Months</option>
                                                <option value="1Y">1 Year</option>
                                                <option value="CUSTOM">Specific Date</option>
                                            </select>
                                            {voucherForm.validityPeriod === "CUSTOM" && (
                                                <input
                                                    type="date"
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-primary"
                                                    value={voucherForm.customExpiration}
                                                    onChange={(e) => setVoucherForm(prev => ({ ...prev, customExpiration: e.target.value }))}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <Button onClick={generateVoucher} className="w-full py-6 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm uppercase tracking-widest">
                                        <Gift className="w-4 h-4 mr-2" /> Generate Ticket
                                    </Button>
                                </div>
                            </div>

                            {/* 2. Visual Output (Right) */}
                            <div className="col-span-7 space-y-8">
                                <div>
                                    <h2 className="font-serif text-2xl text-foreground mb-1">Active Vouchers</h2>
                                    <p className="text-sm text-foreground/60">{vouchers.filter(v => v.status === "ISSUED").length} codes ready to redeem.</p>
                                </div>

                                {generatedVoucher && (
                                    <div className="mb-12">
                                        <div className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold mb-4">Latest Generated Ticket</div>
                                        <div className="aspect-[1.8/1] bg-[#F5F2F0] rounded-[2rem] border border-stone-200 relative overflow-hidden flex flex-col items-center justify-center p-8 noise shadow-2xl">
                                            <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-stone-300 via-stone-100 to-stone-300" />

                                            <div className="text-center space-y-2 mb-6">
                                                <p className="text-[10px] tracking-[0.4em] uppercase text-stone-400">Yarey Wellness</p>
                                                <h3 className="text-3xl font-serif text-stone-800">{generatedVoucher.treatmentTitle}</h3>
                                            </div>

                                            <div className="bg-white px-8 py-4 rounded-xl border border-dashed border-stone-300 flex items-center gap-6 shadow-sm">
                                                <div className="text-right">
                                                    <p className="text-[9px] uppercase tracking-widest text-stone-400">Code</p>
                                                    <p className="font-mono text-xl font-bold text-stone-800 tracking-wider">{generatedVoucher.code}</p>
                                                </div>
                                                <div className="h-8 w-px bg-stone-200" />
                                                <div>
                                                    <p className="text-[9px] uppercase tracking-widest text-stone-400">Value</p>
                                                    <p className="font-serif text-xl text-primary">{generatedVoucher.pricePaid.toLocaleString()}.-</p>
                                                </div>
                                            </div>

                                            <div className="absolute bottom-6 text-center text-stone-400">
                                                <p className="text-[9px] italic">Valid for {generatedVoucher.recipientName}</p>
                                                <p className="text-[8px] uppercase tracking-widest mt-1">Expires: {generatedVoucher.expiresAt ? new Date(generatedVoucher.expiresAt).toLocaleDateString() : "N/A"}</p>
                                            </div>
                                        </div>
                                        <div className="text-center mt-4">
                                            <p className="text-xs text-foreground/40">Screenshot above to send to client</p>
                                        </div>
                                    </div>
                                )}

                                {/* List of active codes */}
                                <div className="bg-[#042A40]/30 backdrop-blur-md border border-primary/10 rounded-[2rem] overflow-hidden max-h-[400px] overflow-y-auto shadow-2xl">
                                    <table className="w-full text-left">
                                        <thead className="bg-[#0F2E2E]/60 border-b border-primary/10 sticky top-0 backdrop-blur-md">
                                            <tr>
                                                <th className="p-4 pl-6 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Code</th>
                                                <th className="p-4 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Details</th>
                                                <th className="p-4 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Status</th>
                                                <th className="p-4 text-[10px] uppercase tracking-widest text-foreground/40 font-bold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/10">
                                            {vouchers.map((v) => (
                                                <tr key={v.id} className="hover:bg-primary/5 transition-colors">
                                                    <td className="p-4 pl-6 font-mono text-xs font-bold text-foreground/70">{v.code}</td>
                                                    <td className="p-4">
                                                        <div className="font-medium text-sm">{v.treatmentTitle}</div>
                                                        <div className="text-[10px] text-foreground/40">For {v.recipientName} • ฿{v.pricePaid.toLocaleString()}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        {(() => {
                                                            const isExpired = v.expiresAt && new Date() > new Date(v.expiresAt) && v.status === "ISSUED"
                                                            const displayStatus = isExpired ? "EXPIRED" : v.status
                                                            const statusStyle = displayStatus === 'ISSUED' ? 'bg-emerald-100 text-emerald-600' :
                                                                displayStatus === 'REDEEMED' ? 'bg-gray-100 text-gray-400' :
                                                                    'bg-red-100 text-red-500' // EXPIRED or VOID

                                                            return (
                                                                <div className="flex flex-col items-start gap-1">
                                                                    <span className={`px-2 py-1 rounded text-[9px] uppercase font-bold tracking-wider ${statusStyle}`}>
                                                                        {displayStatus}
                                                                    </span>
                                                                    {v.expiresAt && (
                                                                        <span className="text-[9px] text-foreground/30">Exp: {new Date(v.expiresAt).toLocaleDateString()}</span>
                                                                    )}
                                                                </div>
                                                            )
                                                        })()}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        {v.status === "ISSUED" ? (
                                                            <>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        const subject = encodeURIComponent(`Digital Voucher: ${v.treatmentTitle}`)
                                                                        const body = encodeURIComponent(`Dear ${v.recipientName},\n\nHere is your prepaid digital voucher for Yarey Wellness.\n\nCode: ${v.code}\nValue: ฿${v.pricePaid.toLocaleString()}\n\nPlease present this code upon arrival to redeem your ritual.\n\nWarm regards,\nYarey Team`)
                                                                        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
                                                                    }}
                                                                    className="h-8 rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 text-[10px] uppercase font-bold tracking-wider px-3 mr-2"
                                                                >
                                                                    <Mail className="w-3 h-3 mr-2" /> Email
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled={downloadingId === v.id}
                                                                    onClick={() => downloadTicket(v)}
                                                                    className="h-8 rounded-full border-stone-200 text-stone-600 hover:bg-stone-50 text-[10px] uppercase font-bold tracking-wider px-3"
                                                                >
                                                                    {downloadingId === v.id ? (
                                                                        <span className="animate-pulse">Gen...</span>
                                                                    ) : (
                                                                        <>
                                                                            <Download className="w-3 h-3 mr-2" />
                                                                            Ticket
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <span className="text-foreground/20 text-[10px] mr-2">-</span>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={async () => {
                                                                if (confirm("Are you sure you want to delete this voucher? This cannot be undone.")) {
                                                                    await voucherOps.remove(v.id)
                                                                }
                                                            }}
                                                            className="h-8 w-8 rounded-full text-foreground/20 hover:text-red-500 hover:bg-red-500/10 p-0"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                            </div>
                        </div>
                    )
                }

                {
                    activeTab === "pulse" && (
                        <PulseTab bookings={bookings} treatments={treatments} salesmen={salesmen} onEdit={setSelectedBooking} />
                    )
                }

                {
                    activeTab === "lab" && (
                        <div className="space-y-8">
                            <div>
                                <h2 className="font-serif text-2xl text-foreground mb-1">The Alchemist's Lab</h2>
                                <p className="text-sm text-foreground/60">Biometric analysis history and guest physiology.</p>
                            </div>

                            <div className="bg-[#042A40]/30 backdrop-blur-md border border-primary/10 rounded-[2rem] overflow-hidden shadow-2xl">
                                <table className="w-full text-left">
                                    <thead className="bg-[#0F2E2E]/60 border-b border-primary/10">
                                        <tr>
                                            <th className="p-6 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Time</th>
                                            <th className="p-6 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Guest</th>
                                            <th className="p-6 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Assigned Pillar</th>
                                            <th className="p-6 text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Trigger</th>
                                            <th className="p-6 text-[10px] uppercase tracking-widest text-foreground/40 font-bold text-right">Metrics</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/10">
                                        {(sessions as Session[]).sort((a, b) => b.createdAt - a.createdAt).map(s => (
                                            <tr key={s.id} className="hover:bg-primary/5 transition-colors">
                                                <td className="p-6 text-xs font-mono text-foreground/60">
                                                    {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    <div className="text-[10px] opacity-50">{new Date(s.createdAt).toLocaleDateString()}</div>
                                                </td>
                                                <td className="p-6 font-medium text-sm">{s.guestName}</td>
                                                <td className="p-6">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold border ${getPillarColor(s.pillarID)}`}>
                                                        {s.output.pillarName}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-xs text-foreground/60 max-w-xs truncate" title={s.output.trigger}>
                                                    {s.output.trigger}
                                                </td>
                                                <td className="p-6 text-right font-mono text-[10px] text-foreground/50 space-x-3">
                                                    <span title="HRV">♥ {Math.round(s.metrics.intake.hrv)}ms</span>
                                                    <span title="Resting Heart Rate">⚡ {Math.round(s.metrics.intake.rhr)}bpm</span>
                                                    <span title="Respiration">💨 {s.metrics.intake.respRate.toFixed(1)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                        {sessions.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-12 text-center text-foreground/30 italic text-sm">No analysis sessions recorded yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                }

                {/* Env Control Footer */}
                <div className="mt-20 border-t border-border/40 pt-10 flex justify-between items-center relative z-50 pointer-events-auto">
                    <div className="flex gap-4 items-center">
                        <h4 className="text-[10px] uppercase tracking-widest font-bold text-foreground/40">Sanctuary Vibe:</h4>
                        <div className="flex gap-2">
                            {["Quiet", "Moderate", "Lively"].map(v => (
                                <button
                                    type="button"
                                    key={v}
                                    onClick={() => updateVibe(v)}
                                    className={`
                                        text-[10px] uppercase tracking-wider font-bold px-6 py-2 rounded-full border transition-all duration-300 cursor-pointer select-none
                                        ${displayVibe === v
                                            ? "bg-primary text-[#051818] border-primary shadow-lg shadow-primary/20 scale-105"
                                            : "bg-transparent text-primary/60 border-primary/30 hover:border-primary/60 hover:text-primary"}
                                    `}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>

                        {/* Active Guest Counter */}
                        <div className="w-px h-6 bg-[#9A4E2F]/20 mx-2" />
                        <span className="text-[10px] uppercase tracking-widest font-bold text-[#9A4E2F]/40">
                            {todayBookings
                                .filter(b => ["Arrived", "In Ritual", "Checked In", "Started"].includes(b.status) && isBookingInPhase(b.time, getCurrentPhase()))
                                .reduce((acc, b) => acc + (b.guests || 1), 0)} Guests
                        </span>
                    </div>
                </div>

                {/* Daily Closing Modal */}
                <AnimatePresence>
                    {showDailyClosing && (
                        <DailyClosingModal
                            date={new Date().toISOString().split('T')[0]}
                            bookings={bookings}
                            onClose={() => setShowDailyClosing(false)}
                        />
                    )}
                </AnimatePresence>

            </Container >
            <div className="lg:hidden h-screen flex items-center justify-center p-8 text-center bg-background">
                <div className="space-y-4">
                    <p className="font-serif text-2xl text-foreground">Desktop/Tablet Required</p>
                    <p className="text-sm text-foreground/60">Please use the Host Station on a larger screen.</p>
                </div>
            </div>
            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#0c2627] border border-primary/20 rounded-[2rem] p-8 max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] space-y-6"
                        >
                            <div className="text-center space-y-2">
                                <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto">
                                    <Trash2 className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-serif text-foreground">Remove Ritual?</h3>
                                <p className="text-sm text-foreground/60">This action cannot be undone. The treatment will be removed from the menu immediately.</p>
                            </div>
                            <div className="flex gap-4">
                                <Button variant="ghost" onClick={() => setDeleteId(null)} className="flex-1 rounded-xl">Cancel</Button>
                                <Button onClick={confirmDelete} className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white">Delete</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Hidden Ticket Render Container */}
            {/* We use a zero-size overflow-hidden container to keep it in the DOM but invisible. 
                Move completely off-screen can sometimes cause html2canvas to fail on some browsers/optimizations. */}
            <div style={{ position: "fixed", top: 0, left: 0, width: 0, height: 0, overflow: "hidden" }}>
                {tempVoucher && (
                    <div
                        ref={ticketRef}
                        className="w-[800px] h-[450px] relative overflow-hidden flex flex-col items-center justify-between p-12 shrink-0"
                        style={{ backgroundColor: "#051818", color: "#EAEAEA", fontFamily: "serif" }}
                    >
                        {/* Gold Border Frame */}
                        <div className="absolute inset-4 border border-[#D1C09B] opacity-30 pointer-events-none" />
                        <div className="absolute inset-5 border border-[#D1C09B] opacity-10 pointer-events-none" />

                        {/* Top Branding */}
                        <div className="text-center w-full pt-4 relative z-10">
                            <p className="text-[10px] tracking-[0.6em] uppercase font-bold" style={{ color: "#D1C09B" }}>Gift Certificate</p>
                            <div className="w-12 h-px bg-[#D1C09B] mx-auto mt-4 opacity-50" />
                        </div>

                        {/* Center Content */}
                        <div className="text-center space-y-2 relative z-10">
                            <p className="text-base tracking-[0.2em] uppercase opacity-60 font-sans" style={{ color: "#fff" }}>Yarey Wellness</p>
                            <h3 className="text-5xl font-serif tracking-wide text-white drop-shadow-lg leading-tight" style={{ textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
                                {tempVoucher.treatmentTitle}
                            </h3>
                        </div>

                        {/* Details Box (Gold & Dark) */}
                        <div className="w-[600px] flex items-center justify-between bg-[#082221] border border-[#D1C09B] px-10 py-6 relative z-10 shadow-2xl">
                            {/* Decorative Corners for Box */}
                            <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-[#D1C09B]" />
                            <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-[#D1C09B]" />
                            <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-[#D1C09B]" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-[#D1C09B]" />

                            <div className="text-left">
                                <p className="text-[8px] uppercase tracking-[0.2em] mb-1 font-sans" style={{ color: "#D1C09B" }}>Voucher Code</p>
                                <p className="font-mono text-3xl font-bold tracking-widest text-white">{tempVoucher.code}</p>
                            </div>

                            <div className="h-10 w-px bg-[#D1C09B] opacity-20" />

                            <div className="text-right">
                                <p className="text-[8px] uppercase tracking-[0.2em] mb-1 font-sans" style={{ color: "#D1C09B" }}>Value</p>
                                <p className="font-serif text-3xl font-medium text-[#D1C09B]">฿{tempVoucher.pricePaid.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="text-center w-full pb-2 relative z-10 opacity-60 font-sans">
                            <p className="text-[10px] tracking-wider uppercase mb-1">Presented to</p>
                            <p className="text-lg font-serif italic text-white mb-2">{tempVoucher.recipientName}</p>
                            <div className="flex justify-center gap-4 text-[9px] uppercase tracking-widest text-[#D1C09B]">
                                <span>Expires: {tempVoucher.expiresAt ? new Date(tempVoucher.expiresAt).toLocaleDateString() : "Never"}</span>
                                <span>•</span>
                                <span>Sanctuary Phuket</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    )
}
