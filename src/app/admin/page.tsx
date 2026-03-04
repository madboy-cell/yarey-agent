"use client"

import { useEffect, useState, useMemo, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Container } from "@/components/layout/container"
import { PulseTab } from "@/components/admin/PulseTab"
import { MenuTab } from "@/components/admin/MenuTab"
import { BotanicalsTab } from "@/components/admin/BotanicalsTab"
import { LabTab } from "@/components/admin/LabTab"
import { MembersTab } from "@/components/admin/MembersTab"
import { FinanceTab } from "@/components/admin/FinanceTab"
import { VouchersTab } from "@/components/admin/VouchersTab"
import { CircleTab } from "@/components/admin/CircleTab"

import { Button } from "@/components/ui/button"
import {
    Calendar, Users, Wind, Sun, QrCode, LogOut, Plus, X, Receipt,
    FlaskConical, Gift, Search, Lock, Handshake
} from "lucide-react"

import { useFirestoreCollection, useFirestoreCRUD, useFirestoreDoc } from "@/hooks/useFirestore"
import { updateVibeStats } from "@/lib/vibe"

import { orderBy } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { BookingCard } from "@/components/admin/BookingCard"
import { BookingDetailModal } from "@/components/admin/BookingDetailModal"
import { DailyClosingModal } from "@/components/admin/DailyClosingModal" // Import Z-Report
import { Scanner } from '@yudiel/react-qr-scanner'

// Types
import { Booking, Salesman, Treatment, Voucher, Client, Block, Session, CircleEvent, CircleMedia } from "@/types"

export default function AdminDashboard() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#051818] flex items-center justify-center text-[#D1C09B]">Loading Interface...</div>}>
            <AdminDashboardContent />
        </Suspense>
    )
}

function AdminDashboardContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [activeTab, setActiveTab] = useState<"sanctuary" | "members" | "menu" | "analytics" | "vouchers" | "lab" | "botanicals" | "finance" | "circle">("sanctuary")
    // Handle Deep Links (e.g. from CRM)
    useEffect(() => {
        const tab = searchParams.get("tab")
        const recipient = searchParams.get("recipient")
        const email = searchParams.get("email")
        const clientId = searchParams.get("clientId")

        if (tab === "vouchers") {
            setActiveTab("vouchers")
        } else if (tab === "members") {
            setActiveTab("members")
        }
        // Deep-link recipient is now handled within VouchersTab
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
    const { data: elixirs } = useFirestoreCollection<any>("elixirs") // New: Fetch Elixirs
    const { data: blocks } = useFirestoreCollection<Block>("blocks")
    const { data: vouchers } = useFirestoreCollection<Voucher>("vouchers")
    const { data: salesmen } = useFirestoreCollection<Salesman>("salesmen")
    const { data: sessions } = useFirestoreCollection<Session>("biomarker_logs", [orderBy("timestamp", "desc")])
    const { data: clients } = useFirestoreCollection<Client>("clients")
    const { data: expenses } = useFirestoreCollection<{ id: string, month: string, title: string, amount: number, category: string }>("expenses")
    const { data: targetSettings } = useFirestoreDoc<{ monthlyGoals: Record<string, number> }>("settings", "targets")
    const { data: circleEvents } = useFirestoreCollection<CircleEvent>("circle_events")
    const { data: circleMedia } = useFirestoreCollection<CircleMedia>("circle_media")

    // Derived: Today's Bookings
    const todayStr = new Date().toLocaleDateString("en-CA")
    const todayBookings = rawBookings.filter(b => b.date === todayStr)

    // Derived: Today's Events
    const todayEvents = circleEvents.filter(e =>
        ["confirmed", "completed"].includes(e.status) && e.dates.includes(todayStr)
    )

    // Derived: Today's Media Visits
    const todayMedia = circleMedia.filter(m =>
        ["scheduled", "visited"].includes(m.status) && m.visitDate === todayStr
    )
    const bookings = rawBookings

    // Global Settings (Vibe) - Direct Document Subscription
    const { data: vibeDoc } = useFirestoreDoc<{ current: string, id: string }>("settings", "vibe")
    const vibe = vibeDoc?.current || "Quiet"

    // Prioritize local interaction for snappiness
    const displayVibe = optimisticVibe || vibe

    const [selectedBooking, setSelectedBooking] = useState<any | null>(null)

    // --- CRUD Operations ---
    const bookingOps = useFirestoreCRUD("bookings")
    const settingsOps = useFirestoreCRUD("settings")
    const blockOps = useFirestoreCRUD("blocks")
    const voucherOps = useFirestoreCRUD("vouchers")

    // --- Actions ---

    // Enhanced Update Handler for Modal
    const handleUpdateBooking = async (id: string, updates: any) => {
        await bookingOps.update(id, updates)
        await updateVibeStats()
    }

    const handleDeleteBooking = async (id: string) => {
        await bookingOps.remove(id)
        await updateVibeStats()
    }




    // --- Auto-Pilot: Status Automation ---
    useEffect(() => {
        const checkStatus = () => {
            // Optimization removed: 'finance' is a separate route

            const now = new Date()

            let updated = false
            todayBookings.forEach(b => {
                if (!b.time) return

                // 1. Parse Start Time to Date Object
                const timeMatch = b.time.match(/(\d+):(\d+)\s*(AM|PM)?/i)
                if (!timeMatch) return

                let hours = parseInt(timeMatch[1])
                const minutes = parseInt(timeMatch[2])
                const period = timeMatch[3]

                if (period) {
                    if (period.toUpperCase() === "PM" && hours !== 12) hours += 12
                    else if (period.toUpperCase() === "AM" && hours === 12) hours = 0
                }

                const startTime = new Date()
                startTime.setHours(hours, minutes, 0, 0)

                // 2. Determine Duration & End Time
                const treat = treatments.find(t => t.title === b.treatment)
                const duration = treat?.duration_min || 60
                const endTime = new Date(startTime.getTime() + duration * 60000)

                // 3. Logic: Confirmed -> Arrived (At Start Time)
                if (b.status === "Confirmed" && now >= startTime && now < endTime) {
                    bookingOps.update(b.id, { status: "Arrived" })
                    updated = true
                }

                // 4. Logic: Active -> Complete (At End Time)
                const activeStatuses = ["Confirmed", "Arrived", "In Ritual", "Started", "Checked In"]
                if (activeStatuses.includes(b.status) && now >= endTime) {
                    bookingOps.update(b.id, { status: "Complete" })
                    updated = true
                }
            })

            if (updated) {
                updateVibeStats()
            }
        }

        const interval = setInterval(checkStatus, 60000) // Check every minute
        checkStatus() // Run once immediately
        return () => clearInterval(interval)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [todayBookings.length, treatments.length])

    // Scanner State
    const [isScanning, setIsScanning] = useState(false)
    const [scannedVoucher, setScannedVoucher] = useState<Voucher | null>(null)

    const handleScan = (code: string) => {
        if (!code) return
        // Redirect to Walk-in Booking Flow
        router.push(`/admin/walk-in?voucher=${code}`)
        setIsScanning(false)
    }

    // --- Interactions ---

    // --- Actions ---

    const visitCountMap = useMemo(() => {
        const map = new Map<string, number>()
        bookings.forEach(b => {
            const handle = b.contact?.handle
            if (handle && b.status !== "Cancelled") {
                map.set(handle, (map.get(handle) || 0) + 1)
            }
        })
        return map
    }, [bookings])
    const getVisitCount = (handle?: string) => handle ? (visitCountMap.get(handle) || 1) : 1



    const updateVibe = async (newVibe: string) => {
        try {
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
        await updateVibeStats()
    }

    const handleNote = async (id: string, note: string) => {
        await bookingOps.update(id, { notes: note })
        await updateVibeStats()
    }





    // --- UI Helpers ---

    // Helper: Determine phase from HH:MM or Phase String
    const getCurrentPhase = () => {
        const hour = new Date().getHours()
        if (hour < 12) return "Morning"
        if (hour < 17) return "Sun Peak"
        return "Evening"
    }

    const isBookingInPhase = (bookingTime: string | undefined, distinctPhase: string) => {
        if (!bookingTime) return false
        if (bookingTime.includes(distinctPhase)) return true

        // Robust Regex Parsing
        const match = bookingTime.match(/(\d+):(\d+)\s*(AM|PM)?/i)
        if (!match) return false

        let hours = parseInt(match[1])
        const period = match[3]

        if (period) {
            if (period.toUpperCase() === "PM" && hours !== 12) hours += 12
            else if (period.toUpperCase() === "AM" && hours === 12) hours = 0
        }

        if (distinctPhase === "Morning") return hours < 12
        if (distinctPhase === "Sun Peak") return hours >= 12 && hours < 17
        if (distinctPhase === "Evening") return hours >= 17
        return false
    }

    const timeline = {
        Morning: todayBookings.filter(b => isBookingInPhase(b.time, "Morning")),
        SunPeak: todayBookings.filter(b => isBookingInPhase(b.time, "Sun Peak")),
        Evening: todayBookings.filter(b => isBookingInPhase(b.time, "Evening"))
    }

    // Helper: determine which phase an event belongs to
    const getEventPhase = (event: CircleEvent): string => {
        if (event.blockType === "morning") return "Morning"
        if (event.blockType === "sun_peak") return "SunPeak"
        if (event.blockType === "evening") return "Evening"
        if (event.blockType === "whole_day") return "all" // show in all phases
        // Use startTime to determine phase
        if (event.startTime) {
            const hour = parseInt(event.startTime.split(":")[0])
            if (hour < 12) return "Morning"
            if (hour < 17) return "SunPeak"
            return "Evening"
        }
        return "Morning" // default
    }

    // Helper: determine which phase a media visit belongs to
    const getMediaPhase = (media: CircleMedia): string => {
        if (media.visitTime) {
            const hour = parseInt(media.visitTime.split(":")[0])
            if (hour < 12) return "Morning"
            if (hour < 17) return "SunPeak"
            return "Evening"
        }
        return "Morning" // default
    }

    const statusColors: Record<string, string> = {
        "Confirmed": "bg-primary/10 border-primary/30 text-primary backdrop-blur-sm",
        "Arrived": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        "In Ritual": "bg-orange-500/20 text-orange-300 border-orange-500/30",
        "Redeemed": "bg-white/5 text-foreground/40 border-white/10",
        "Complete": "bg-white/5 text-foreground/40 border-white/10 opacity-60"
    }

    return (
        <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
            <div className="fixed inset-0 noise z-0 pointer-events-none opacity-[0.03]" />

            {/* ═══════════════════════════════════════════════
                TOP BAR — Logo, Phase, Actions
            ═══════════════════════════════════════════════ */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    {/* Row 1: Logo + Phase + Actions */}
                    <div className="h-14 md:h-16 flex items-center justify-between gap-3">
                        {/* Left: Brand */}
                        <div className="flex items-center gap-3 min-w-0">
                            <h1 className="text-lg md:text-xl font-serif text-foreground tracking-tight whitespace-nowrap">Yarey</h1>
                            <div className="hidden md:block w-px h-5 bg-border/40" />
                            <span className="hidden md:block text-[9px] uppercase tracking-[0.4em] text-foreground/30 font-medium whitespace-nowrap">
                                {headerInfo || "STAFF PORTAL"}
                            </span>
                        </div>

                        {/* Right: Quick Actions */}
                        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                            {/* Mobile phase badge */}
                            <span className="md:hidden text-[8px] uppercase tracking-[0.3em] text-primary/60 font-bold mr-1 whitespace-nowrap">
                                {headerInfo?.split("•")[1]?.trim() || ""}
                            </span>

                            <Link href="/admin/walk-in">
                                <Button size="sm" className="h-9 md:h-10 rounded-xl bg-primary text-background hover:bg-primary/90 px-3 md:px-5 text-[10px] md:text-xs font-bold uppercase tracking-wider gap-1.5 shadow-lg shadow-primary/15">
                                    <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Check-in</span>
                                </Button>
                            </Link>

                            <Button
                                onClick={() => setIsScanning(true)}
                                size="sm"
                                variant="outline"
                                className="h-9 md:h-10 w-9 md:w-10 rounded-xl border-border/50 text-foreground/50 hover:text-primary hover:border-primary/40 p-0"
                                title="Scan QR"
                            >
                                <QrCode className="w-4 h-4" />
                            </Button>

                            <Button
                                onClick={() => setShowDailyClosing(true)}
                                size="sm"
                                variant="outline"
                                className="h-9 md:h-10 w-9 md:w-10 rounded-xl border-border/50 text-foreground/50 hover:text-primary hover:border-primary/40 p-0"
                                title="Z-Report"
                            >
                                <Receipt className="w-4 h-4" />
                            </Button>



                            <div className="w-px h-6 bg-border/30 mx-0.5" />



                            <Button
                                onClick={() => signOut(auth)}
                                size="sm"
                                variant="ghost"
                                className="h-9 md:h-10 w-9 md:w-10 rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-500/10 p-0"
                                title="Sign Out"
                            >
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Row 2: Tab Navigation — horizontally scrollable on mobile */}
                    <div className="-mb-px overflow-x-auto scrollbar-hide">
                        <div className="flex gap-0.5 min-w-max">
                            {[
                                { id: "sanctuary", label: "Host View", icon: Calendar },
                                { id: "members", label: "Members", icon: Users },
                                { id: "menu", label: "Menu", icon: FlaskConical },
                                { id: "botanicals", label: "Elixirs", icon: FlaskConical },
                                { id: "vouchers", label: "Vouchers", icon: Gift },
                                { id: "analytics", label: "Analytics", icon: Search },
                                { id: "circle", label: "Circle", icon: Handshake },
                                { id: "finance", label: "Finance", icon: Lock },
                                { id: "lab", label: "Lab", icon: FlaskConical },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-4 md:px-5 py-3 text-[10px] md:text-[11px] uppercase tracking-[0.15em] font-bold whitespace-nowrap border-b-2 transition-all duration-300 ${activeTab === tab.id
                                        ? "border-primary text-primary"
                                        : "border-transparent text-foreground/35 hover:text-foreground/60 hover:border-foreground/10"
                                        }`}
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            {/* ═══════════════════════════════════════════════
                CONTENT
            ═══════════════════════════════════════════════ */}
            <Container className="max-w-7xl relative z-10 pt-8">
                {/* Tab Content */}
                {activeTab === "sanctuary" && (
                    // --- HOST VIEW (Timeline) ---
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[600px]">
                        {Object.entries(timeline).map(([phase, items], i) => {
                            const phaseLabel = phase.replace(/([A-Z])/g, ' $1').trim()
                            const phaseBlock = blocks.find(b => b.time === phaseLabel)
                            return (
                                <div key={phase} className="space-y-6">
                                    <div className="flex items-center justify-between border-b border-border/40 pb-4">
                                        <h3 className="font-serif text-xl text-foreground/60 lowercase flex items-center gap-3">
                                            {i === 0 && <Sun className="w-4 h-4 opacity-50 rotate-[-45deg]" />}
                                            {i === 1 && <Sun className="w-4 h-4 opacity-50" />}
                                            {i === 2 && <Wind className="w-4 h-4 opacity-50" />}
                                            {phaseLabel}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] bg-primary/5 px-3 py-1 rounded-full text-primary font-bold tracking-widest uppercase">
                                                {items.filter(b => ["Arrived", "In Ritual", "Complete"].includes(b.status)).reduce((acc, b) => acc + (Number(b.guests) || 1), 0)}
                                                <span className="opacity-40"> / {items.reduce((acc, b) => acc + (Number(b.guests) || 1), 0)}</span> Guests
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleBlock(phaseLabel)}
                                                className={`h-6 text-[10px] uppercase font-bold tracking-widest border ${phaseBlock ? "bg-red-500 text-white border-red-500 hover:bg-red-600" : "border-border text-foreground/40"}`}
                                            >
                                                {phaseBlock ? "Blocked" : "Block"}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {/* Blocked State Overlay */}
                                        {phaseBlock && (
                                            <div className="bg-red-50/50 border border-red-100 p-6 rounded-[2rem] text-center mb-4">
                                                <div className="text-red-500 font-serif text-xl mb-1">Sanctuary Closed</div>
                                                <div className="text-[10px] uppercase tracking-widest text-red-400 font-bold">{phaseBlock.reason}</div>
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

                                        {/* Event Cards for this phase */}
                                        {todayEvents
                                            .filter(ev => {
                                                const evPhase = getEventPhase(ev)
                                                return evPhase === phase || evPhase === "all"
                                            })
                                            .map(ev => (
                                                <motion.div
                                                    key={`event-${ev.id}`}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-[2rem] p-5 relative overflow-hidden"
                                                >
                                                    <div className="absolute top-3 right-3">
                                                        <span className="text-[8px] uppercase tracking-widest font-bold bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/30">
                                                            🎪 Event
                                                        </span>
                                                    </div>
                                                    <div className="font-serif text-lg text-foreground mb-1">{ev.title}</div>
                                                    <div className="text-[10px] text-foreground/40 mb-3">by {ev.hostName}</div>
                                                    <div className="flex flex-wrap gap-2 text-[10px]">
                                                        <span className="bg-card/50 text-foreground/50 px-2 py-1 rounded-md">
                                                            🕐 {ev.startTime || "—"} → {ev.endTime || "—"}
                                                        </span>
                                                        <span className="bg-card/50 text-foreground/50 px-2 py-1 rounded-md">
                                                            👥 {ev.expectedGuests} guests
                                                        </span>
                                                        <span className={`px-2 py-1 rounded-md font-mono ${ev.financialType === "we_earn" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                                            {ev.financialType === "we_earn" ? "+" : "-"}฿{ev.amount.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    {ev.notes && <div className="text-[10px] text-foreground/30 italic mt-2">{ev.notes}</div>}
                                                </motion.div>
                                            ))}

                                        {/* Media Visit Cards for this phase */}
                                        {todayMedia
                                            .filter(m => getMediaPhase(m) === phase)
                                            .map(m => (
                                                <motion.div
                                                    key={`media-${m.id}`}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 border border-purple-500/30 rounded-[2rem] p-5 relative overflow-hidden"
                                                >
                                                    <div className="absolute top-3 right-3">
                                                        <span className={`text-[8px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full border ${m.status === "visited"
                                                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                                            : "bg-purple-500/20 text-purple-400 border-purple-500/30"
                                                            }`}>
                                                            {m.status === "visited" ? "✅ Visited" : "📸 Media"}
                                                        </span>
                                                    </div>
                                                    <div className="font-serif text-lg text-foreground mb-1">{m.name}</div>
                                                    {m.instagramHandle && (
                                                        <div className="text-[10px] text-pink-400 mb-2">📷 {m.instagramHandle}{m.instagramFollowers ? ` · ${(m.instagramFollowers / 1000).toFixed(1)}K` : ""}</div>
                                                    )}
                                                    <div className="flex flex-wrap gap-2 text-[10px]">
                                                        <span className="bg-card/50 text-foreground/50 px-2 py-1 rounded-md">
                                                            🕐 {m.visitTime || "—"}
                                                        </span>
                                                        {m.treatmentBooked && (
                                                            <span className="bg-card/50 text-foreground/50 px-2 py-1 rounded-md">
                                                                💆 {m.treatmentBooked}
                                                            </span>
                                                        )}
                                                        {m.cost > 0 && (
                                                            <span className="bg-red-500/10 text-red-400 px-2 py-1 rounded-md font-mono">
                                                                -฿{m.cost.toLocaleString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {m.contentDeliverables && <div className="text-[10px] text-foreground/30 mt-2">📝 {m.contentDeliverables}</div>}
                                                </motion.div>
                                            ))}

                                        {items.length === 0 && todayEvents.filter(ev => { const p = getEventPhase(ev); return p === phase || p === "all" }).length === 0 && todayMedia.filter(m => getMediaPhase(m) === phase).length === 0 && <div className="h-32 rounded-[2rem] border border-dashed border-border/40 flex items-center justify-center"><p className="text-foreground/20 text-xs italic">Free flow</p></div>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Detail Modal */}
                <AnimatePresence>
                    {selectedBooking && (
                        <BookingDetailModal
                            booking={selectedBooking}
                            treatments={treatments}
                            salesmen={salesmen}
                            statusColors={statusColors}
                            onClose={() => setSelectedBooking(null)}
                            onSave={handleUpdateBooking}
                            onDelete={handleDeleteBooking}
                        />
                    )}
                </AnimatePresence>
                {activeTab === "menu" && <MenuTab treatments={treatments} />}

                {activeTab === "botanicals" && <BotanicalsTab elixirs={elixirs} />}

                {activeTab === "vouchers" && (
                    <VouchersTab vouchers={vouchers} treatments={treatments} clients={clients} onScan={() => setIsScanning(true)} />
                )}

                {activeTab === "analytics" && (
                    <PulseTab bookings={bookings} treatments={treatments} salesmen={salesmen} expenses={expenses} targetSettings={targetSettings} onEdit={setSelectedBooking} />
                )}

                {activeTab === "members" && <MembersTab clients={clients} bookings={bookings} vouchers={vouchers} />}

                {activeTab === "finance" && <FinanceTab bookings={bookings} salesmen={salesmen} expenses={expenses} />}

                {activeTab === "lab" && <LabTab sessions={sessions} />}

                {activeTab === "circle" && <CircleTab bookings={bookings} expenses={expenses} treatments={treatments} salesmen={salesmen} />}
            </Container>

            {/* ═══════════════════════════════════════════════
                FIXED BOTTOM BAR — Vibe Control
            ═══════════════════════════════════════════════ */}
            <div id="admin-bottom-bar" className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border/30">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 md:h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] uppercase tracking-[0.3em] text-foreground/30 font-bold hidden sm:block">Vibe</span>
                        <div className="flex gap-1.5">
                            {["Quiet", "Moderate", "Lively"].map(v => (
                                <button
                                    type="button"
                                    key={v}
                                    onClick={() => updateVibe(v)}
                                    className={`text-[9px] md:text-[10px] uppercase tracking-wider font-bold px-4 md:px-5 py-1.5 rounded-lg border transition-all duration-300 ${displayVibe === v
                                        ? "bg-primary text-background border-primary shadow-md shadow-primary/20"
                                        : "bg-transparent text-foreground/30 border-border/40 hover:border-primary/40 hover:text-primary/60"
                                        }`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>
                    <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-primary/40">
                        {todayBookings.filter(b => ["Arrived", "In Ritual", "Checked In", "Started"].includes(b.status) && isBookingInPhase(b.time, getCurrentPhase())).reduce((acc, b) => acc + (b.guests || 1), 0)} Guests Now
                    </span>
                </div>
            </div>

            {/* Daily Closing Modal */}
            <AnimatePresence>
                {showDailyClosing && (
                    <DailyClosingModal date={new Date().toISOString().split('T')[0]} bookings={bookings} onClose={() => setShowDailyClosing(false)} />
                )}
            </AnimatePresence>

            {/* Scanner Modal */}
            <AnimatePresence>
                {isScanning && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                        <div className="bg-card rounded-2xl p-6 max-w-md w-full relative border border-border/30 shadow-2xl">
                            <button onClick={() => setIsScanning(false)} className="absolute top-4 right-4 p-2 bg-secondary rounded-full hover:bg-primary/10 transition-colors"><X className="w-5 h-5 text-foreground/60" /></button>
                            <h3 className="text-xl font-serif text-foreground mb-4 text-center">Scan Guest Ticket</h3>
                            <div className="rounded-xl overflow-hidden aspect-square bg-black border border-border/20">
                                <Scanner onScan={(result) => { if (result && result.length > 0) { handleScan(result[0].rawValue) } }} />
                            </div>
                            <p className="text-center text-foreground/30 mt-4 text-sm">Point camera at the QR code</p>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Scanned Voucher Detail Modal */}
            <AnimatePresence>
                {scannedVoucher && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#0c2627] border border-primary/20 rounded-2xl p-8 max-w-sm w-full shadow-2xl space-y-6">
                            <div className="text-center space-y-2">
                                <div className={`inline-block px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${scannedVoucher.status === 'ISSUED' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>{scannedVoucher.status}</div>
                                <h3 className="text-2xl font-serif text-primary">{scannedVoucher.treatmentTitle}</h3>
                                <p className="text-white/60 text-sm">For {scannedVoucher.recipientName}</p>
                            </div>
                            <div className="bg-black/20 rounded-xl p-4 text-center space-y-1 border border-white/5">
                                <p className="text-[10px] uppercase tracking-widest text-white/40">Voucher Code</p>
                                <p className="font-mono text-xl font-bold text-white tracking-widest">{scannedVoucher.code}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <p className="text-[10px] uppercase tracking-widest text-white/40">Value</p>
                                    <p className="text-white font-medium">฿{(scannedVoucher.pricePaid || 0).toLocaleString()}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] uppercase tracking-widest text-white/40">Expires</p>
                                    <p className="text-white font-medium">{scannedVoucher.expiresAt ? new Date(scannedVoucher.expiresAt).toLocaleDateString() : 'Never'}</p>
                                </div>
                            </div>
                            {scannedVoucher.status === "ISSUED" && (
                                <Button onClick={async () => {
                                    const isPackage = scannedVoucher.type === "package"
                                    const currentRemaining = typeof scannedVoucher.creditsRemaining === 'number' ? scannedVoucher.creditsRemaining : (scannedVoucher.creditsTotal || 1)
                                    if (!confirm(isPackage ? `Deduct 1 Credit? (${currentRemaining} remaining)` : `Redeem ${scannedVoucher.code} for ${scannedVoucher.recipientName}?`)) return
                                    if (isPackage) {
                                        const newRemaining = currentRemaining - 1
                                        const fullyRedeemed = newRemaining <= 0
                                        await voucherOps.update(scannedVoucher.id, { creditsRemaining: newRemaining, status: fullyRedeemed ? "REDEEMED" : "ISSUED", redeemedAt: fullyRedeemed ? new Date().toISOString() : undefined })
                                        alert(fullyRedeemed ? "✅ Package Finalized!" : `✅ Used 1 Credit. Remaining: ${newRemaining}`)
                                        setScannedVoucher(null)
                                    } else {
                                        await voucherOps.update(scannedVoucher.id, { status: "REDEEMED", redeemedAt: new Date().toISOString() })
                                        setScannedVoucher(null)
                                        alert("✅ Voucher Redeemed Successfully!")
                                    }
                                }} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90">
                                    {scannedVoucher.type === "package" ? `Use Credit (${scannedVoucher.creditsRemaining} Left)` : "Redeem Now"}
                                </Button>
                            )}
                            <Button variant="ghost" onClick={() => setScannedVoucher(null)} className="w-full text-white/40 hover:text-white">Close</Button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    )
}

