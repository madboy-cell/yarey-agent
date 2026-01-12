"use client"

import { useEffect, useState, Suspense } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Calendar } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { ServiceGrid } from "@/components/admin/walkin/ServiceGrid"
import { TimeSlotPicker } from "@/components/admin/walkin/TimeSlotPicker"
import { GroupBookingCart, CartItem } from "@/components/admin/walkin/GroupBookingCart"
import { useFirestoreCollection, useFirestoreCRUD, useFirestoreDoc } from "@/hooks/useFirestore"
import { Toaster, toast } from "sonner" // Import Toast

// Types - Shared
import { Treatment, Booking, Salesman, Voucher, Client } from "@/types"

export default function WalkInDashboard() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#051818] flex items-center justify-center text-[#D1C09B]">Loading...</div>}>
            <WalkInDashboardContent />
        </Suspense>
    )
}

function WalkInDashboardContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Data State (Firestore)
    const { data: treatments } = useFirestoreCollection<Treatment>("treatments")
    const { data: vouchers } = useFirestoreCollection<Voucher>("vouchers")
    const { data: salesmen } = useFirestoreCollection<Salesman>("salesmen")
    const { data: clients } = useFirestoreCollection<Client>("clients")

    // CRUD Ops
    const bookingOps = useFirestoreCRUD("bookings")
    const voucherOps = useFirestoreCRUD("vouchers")
    const clientOps = useFirestoreCRUD("clients")
    const { data: outsourceSettings } = useFirestoreDoc<{ rate: number }>("settings", "outsource")

    // Session State
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]) // YYYY-MM-DD
    const [selectedTime, setSelectedTime] = useState("Now")
    const [activeGuestId, setActiveGuestId] = useState<string>("guest-1")
    const [selectedSalesmanId, setSelectedSalesmanId] = useState<string | null>(null)
    const [cart, setCart] = useState<CartItem[]>([
        { tempId: "guest-1", name: "Guest 1", treatment: null, time: "Now", isHotelGuest: false, sendConfirmation: false, source: "Walk-in" }
    ])

    // Auto-Populate Voucher from URL (Scan Redirection)
    useEffect(() => {
        const voucherCode = searchParams.get("voucher")
        if (voucherCode && vouchers.length > 0) {
            // Find voucher
            const voucher = vouchers.find(v => v.code === voucherCode && (v.status === "ISSUED" || (v.type === "package" && (v.creditsRemaining || 0) > 0)))

            if (voucher) {
                // Determine treatment details (even if 0 price)
                const treatmentTitle = voucher.treatmentTitle
                const treatment = treatments.find(t => t.id === voucher.treatmentId) || {
                    id: voucher.treatmentId,
                    title: treatmentTitle,
                    price_thb: 0,
                    duration_min: 0 // Fallback
                } as any

                // Find linked client if exists
                const linkedClient = voucher.clientId ? clients.find(c => c.id === voucher.clientId) : null

                // Update first guest
                setCart(prev => {
                    const first = prev[0]
                    // If first guest is empty/new, populate it.
                    if (!first.treatment && !first.voucherCode) {
                        return [{
                            ...first,
                            name: linkedClient?.name || voucher.recipientName || "Guest 1",
                            email: linkedClient?.email,
                            phone: linkedClient?.phone,
                            treatment: {
                                id: treatment.id,
                                title: treatment.title,
                                price_thb: 0,
                                duration_min: treatment.duration_min
                            },
                            voucherId: voucher.id,
                            voucherCode: voucher.code,
                            manualDiscount: 0
                        }, ...prev.slice(1)]
                    }
                    return prev
                })
            }
        }
    }, [searchParams, vouchers, treatments])

    // Time Change Logic: Auto-toggle confirmation
    const handleTimeSelect = (time: string) => {
        setSelectedTime(time)
        const isFuture = time !== "Now" || selectedDate !== new Date().toISOString().split('T')[0]

        // Update all guests to the new time, and set default confirmation if future
        setCart(prev => prev.map(g => ({ ...g, time, sendConfirmation: isFuture ? true : g.sendConfirmation })))
    }

    // Date Change Logic
    const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value
        setSelectedDate(newDate)

        // If date is future, auto-enable details?
        const isFuture = newDate !== new Date().toISOString().split('T')[0]
        if (isFuture && selectedTime === "Now") {
            setCart(prev => prev.map(g => ({ ...g, sendConfirmation: true })))
        }
    }

    // --- Actions ---

    // Select Treatment -> Apply to Active Guest
    const handleSelectTreatment = (treatment: Treatment) => {
        setCart(prev => prev.map(g => {
            if (g.tempId === activeGuestId) {
                // If they previously had a voucher, clear it if they select a different treatment manually?
                // OR: prevent selecting different treatment if voucher is locked?
                // For simplicity: If they click the grid, it overrides the voucher (removes it).
                return {
                    ...g,
                    treatment,
                    time: selectedTime,
                    voucherId: undefined, // Clear voucher if manual override
                    voucherCode: undefined
                }
            }
            return g
        }))

        // Auto-advance
        const currentIndex = cart.findIndex(g => g.tempId === activeGuestId)
        if (currentIndex < cart.length - 1) {
            const nextGuest = cart[currentIndex + 1]
            if (!nextGuest.treatment) {
                setActiveGuestId(nextGuest.tempId)
            }
        }
    }

    const handleAddGuest = () => {
        const newId = `guest-${Math.random().toString(36).substr(2, 5)}`
        const isFuture = selectedTime !== "Now" || selectedDate !== new Date().toISOString().split('T')[0]
        setCart(prev => [...prev, {
            tempId: newId,
            name: `Guest ${prev.length + 1}`,
            treatment: null,
            time: selectedTime,
            isHotelGuest: false,
            sendConfirmation: isFuture,
            source: "Walk-in"
        }])
        setActiveGuestId(newId)
    }

    const handleRemoveGuest = (id: string) => {
        if (cart.length <= 1) return
        setCart(prev => prev.filter(g => g.tempId !== id))
        if (activeGuestId === id) {
            setActiveGuestId(cart[0].tempId)
        }
    }

    const handleUpdateGuest = (id: string, updates: Partial<CartItem>) => {
        setCart(prev => prev.map(g => g.tempId === id ? { ...g, ...updates } : g))
    }

    const handleCopyPrevious = (id: string) => {
        const index = cart.findIndex(g => g.tempId === id)
        if (index > 0) {
            const prevGuest = cart[index - 1]
            if (prevGuest.treatment) {
                setCart(prev => prev.map(g => g.tempId === id ? {
                    ...g,
                    treatment: prevGuest.treatment, // This might copy the price=0 if previous was voucher... that's a bug risk.
                    // If previous was voucher, we SHOULD NOT copy the voucher ID, just the treatment info?
                    // But if it's price 0, we should probably reset price to standard unless we copy voucher (which we can't, unique).
                    // FIX: Find the standard treatment price from the list.
                    time: prevGuest.time,
                    source: prevGuest.source,
                    nationality: prevGuest.nationality
                } : g))

                // If we copied a voucher-priced treatment, we need to correct the price back to standard
                // unless we actually support copying the voucher (which implies re-using the code? No).
                // So... let's check.
                if (prevGuest.voucherId) {
                    // Get real price
                    const realTreatment = treatments.find(t => t.id === prevGuest.treatment?.id)
                    if (realTreatment) {
                        handleUpdateGuest(id, {
                            treatment: realTreatment, // Reset to full price object
                            voucherId: undefined,
                            voucherCode: undefined
                        })
                    }
                }
            }
        }
    }

    // Voucher Logic
    const handleValidateVoucher = (code: string): Voucher | null => {
        const cleanCode = code.trim().toUpperCase()
        // 1. Check if used in CURRENT cart (prevent double redemption in same session)
        const alreadyInCart = cart.some(g => g.voucherCode === cleanCode)
        if (alreadyInCart) {
            toast.error("Code already applied to another guest in this session.")
            return null
        }

        // 2. Check DB
        const voucher = vouchers.find(v => v.code === cleanCode && v.status === "ISSUED")
        if (voucher) {
            // Check Expiration
            if (voucher.expiresAt && new Date() > new Date(voucher.expiresAt)) {
                toast.error(`Voucher Expired on ${new Date(voucher.expiresAt).toLocaleDateString()}`)
                return null
            }
            return voucher
        }
        return null
    }

    const handleCheckout = async (paymentMethod: string) => {
        if (cart.some(g => !g.treatment)) {
            toast.error("Please select a treatment for all guests.")
            return
        }

        const groupId = `grp-${Math.random().toString(36).substr(2, 9)}`
        const batchPromises: Promise<any>[] = []

        // 1. Create Bookings
        for (const guest of cart) {
            // Logic: Calculate revenue contribution
            let revenue = 0
            if (guest.voucherId) {
                const v = vouchers.find(v => v.id === guest.voucherId)
                revenue = v ? v.pricePaid : 0
            } else {
                const rawPrice = guest.treatment ? guest.treatment.price_thb : 0
                const discount = guest.manualDiscount || 0
                revenue = Math.max(0, rawPrice - discount)
            }

            // 2. Update Client Visits
            if (guest.email && clients) {
                const client = clients.find(c => c.email.toLowerCase() === (guest.email || "").toLowerCase().trim())
                if (client) {
                    const visits = (client.visits || 0) + 1
                    batchPromises.push(clientOps.update(client.id, { visits }))
                }
            }

            // 3. If voucher used, redeem it
            if (guest.voucherId) {
                const v = vouchers.find(v => v.id === guest.voucherId)
                if (v) {
                    if (v.type === "package") {
                        const currentRemaining = typeof v.creditsRemaining === 'number' ? v.creditsRemaining : (v.creditsTotal || 1)
                        const newRemaining = currentRemaining - 1
                        const fullyRedeemed = newRemaining <= 0

                        batchPromises.push(voucherOps.update(guest.voucherId, {
                            creditsRemaining: newRemaining,
                            status: fullyRedeemed ? "REDEEMED" : "ISSUED",
                            redeemedAt: fullyRedeemed ? new Date().toISOString() : null
                        }))
                    } else {
                        batchPromises.push(voucherOps.update(guest.voucherId, { status: "REDEEMED", redeemedAt: new Date().toISOString() }))
                    }
                }
            }

            // Calculate commission amount
            const commissionAmount = selectedSalesmanId ? (revenue * (salesmen.find(s => s.id === selectedSalesmanId)?.commissionRate || 0)) : 0;

            // Calculate therapist cost snapshot
            const therapistCostSnapshot = (() => {
                if (!guest.therapistId || !guest.treatment) return 0
                const durationHrs = guest.treatment.duration_min / 60
                if (guest.therapistId === "OUTSOURCE") {
                    return durationHrs * (outsourceSettings?.rate || 300) // Use dynamic rate from settings, fallback to 300
                }
                const therapist = salesmen.find(s => s.id === guest.therapistId)
                return durationHrs * (therapist?.hourlyRate || 0)
            })();

            const newBooking: Omit<Booking, "id"> = { // ID generated by Firestore
                guests: 1,
                time: guest.time === "Now" ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : guest.time,
                date: selectedDate,
                status: (guest.time === "Now" && selectedDate === new Date().toISOString().split('T')[0]) ? "Arrived" : "Confirmed",
                treatment: guest.treatment!.title,
                contact: {
                    name: guest.name,
                    method: guest.source || (guest.isHotelGuest ? "Hotel Guest" : "Walk-In"),
                    handle: guest.isHotelGuest ? `Room ${guest.room || '?'}` : (guest.phone || groupId),
                    email: guest.email || null,
                    nationality: guest.nationality || null,
                    source: guest.source || null
                },
                notes: `POS Booking. ${guest.manualDiscount ? `DISCOUNTED [-${guest.manualDiscount}]` : ""} ${guest.voucherCode ? `PREPAID [${guest.voucherCode}]` : ""} ${guest.sendConfirmation ? `Confirmation sent to ${guest.email}` : ""}. Nat: ${guest.nationality || 'Unknown'}`,
                isWalkIn: true,
                groupId: groupId,
                priceSnapshot: revenue,
                // Commission Logic - Defaults to null/0, no undefined
                salesmanId: selectedSalesmanId || null,
                commissionSnapshot: selectedSalesmanId ? (salesmen.find(s => s.id === selectedSalesmanId)?.commissionRate || 0) : 0,
                commissionAmount: commissionAmount,

                // Therapist Logic
                therapistId: guest.therapistId || null,
                therapistCostSnapshot: therapistCostSnapshot,
                paymentMethod: paymentMethod as any
            }
            batchPromises.push(bookingOps.add(newBooking))
        }

        try {
            await Promise.all(batchPromises)
            toast.success(`Booking Confirmed! Group ID: ${groupId}`)
            router.push("/admin")
        } catch (err: any) {
            console.error("Checkout Failed:", err)
            toast.error("Checkout Failed: " + err.message)
        }
    }

    return (
        <div className="h-screen w-screen overflow-hidden flex bg-background">

            {/* LEFT: Commander (65%) */}
            <div className="w-[65%] flex flex-col relative bg-[#051818]">
                {/* Header */}
                <div className="p-6 pb-2 flex items-center justify-between gap-4">
                    <Link href="/admin" className="flex items-center text-gray-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Exit POS
                    </Link>

                    {/* Date Picker */}
                    <div className="flex items-center gap-2 bg-[#0c2627] px-4 py-2 rounded-lg border border-white/10 shadow-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={handleDateSelect}
                            className="bg-transparent text-sm font-bold uppercase tracking-wider text-white focus:outline-none cursor-pointer"
                        />
                    </div>

                    <div className="text-right">
                        <h1 className="font-serif text-2xl text-white/90">Sanctuary POS</h1>
                    </div>
                </div>

                {/* Time Picker */}
                <div className="px-6 py-2">
                    <TimeSlotPicker selectedTime={selectedTime} onSelect={handleTimeSelect} />
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-hidden relative">
                    <ServiceGrid treatments={treatments} onSelect={handleSelectTreatment} />

                    {/* Empty State / Loading */}
                    {treatments.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-foreground/30">
                            <p>No treatments found. Please check Admin CMS.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: Cart (35%) */}
            <div className="w-[35%] h-full relative z-10">
                <GroupBookingCart
                    cart={cart}
                    activeGuestId={activeGuestId}
                    onSelectGuest={setActiveGuestId}
                    onAddGuest={handleAddGuest}
                    onRemoveGuest={handleRemoveGuest}
                    onUpdateGuest={handleUpdateGuest}
                    onCopyPrevious={handleCopyPrevious}
                    onCheckout={handleCheckout}
                    onValidateVoucher={handleValidateVoucher}
                    salesmen={salesmen}
                    selectedSalesmanId={selectedSalesmanId}
                    onSelectSalesman={setSelectedSalesmanId}
                />
            </div>

        </div>
    )
}
