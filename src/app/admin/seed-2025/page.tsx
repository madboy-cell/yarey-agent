"use client"

import { useEffect, useState } from 'react'
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Guest names for realistic data
const guestNames = [
    "Emma Wilson", "James Chen", "Tanaka Family", "Sophie Martin", "Michael Brown",
    "Lisa Anderson", "David Kim", "Sarah Johnson", "Tom Harris", "Anna Schmidt",
    "Yamamoto Group", "Chris Taylor", "Nina Petrova", "Robert Lee", "Maria Garcia",
    "John Smith", "Wong Family", "Alex Turner", "Olivia Davis", "Lucas Müller"
]

const emailDomains = ["gmail.com", "outlook.com", "yahoo.com", "hotmail.com", "icloud.com"]
const sources = ["Online", "Walk-in", "Instagram", "Agent", "Referral", "Phone"]

// Expenses for January 2025
const testExpenses2025 = [
    { month: "2025-01", title: "Electricity", amount: 8500, category: "Utilities" },
    { month: "2025-01", title: "Water", amount: 2500, category: "Utilities" },
    { month: "2025-01", title: "Cleaning Supplies", amount: 3200, category: "Supplies" },
    { month: "2025-01", title: "Massage Oil & Aromatherapy", amount: 4500, category: "Supplies" },
    { month: "2025-01", title: "Internet", amount: 1200, category: "Utilities" },
    { month: "2025-01", title: "Rent", amount: 45000, category: "Fixed Cost" },
    { month: "2025-01", title: "Insurance", amount: 5000, category: "Fixed Cost" },
]

interface Treatment {
    id: string
    title: string
    price_thb: number
    duration_min?: number
}

export default function SeedPage() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'checking' | 'done' | 'error'>('idle')
    const [existing2025Count, setExisting2025Count] = useState(0)
    const [addedCount, setAddedCount] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [treatments, setTreatments] = useState<Treatment[]>([])
    const [previewBookings, setPreviewBookings] = useState<any[]>([])

    // Helper to pick random
    const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

    // Generate realistic bookings for January 2025
    const generateBookings = (treatmentsList: Treatment[]) => {
        const bookings: any[] = []
        const times = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"]

        // Generate 18 bookings spread across January
        const bookingDays = [2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 24, 25, 26]

        for (const day of bookingDays) {
            const treatment = pickRandom(treatmentsList)
            const guests = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 2 : Math.floor(Math.random() * 2) + 1
            const guestName = pickRandom(guestNames)
            const email = guestName.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '') + '@' + pickRandom(emailDomains)

            bookings.push({
                date: `2025-01-${String(day).padStart(2, '0')}`,
                time: pickRandom(times),
                guests: guests,
                treatment: treatment.title,
                priceSnapshot: treatment.price_thb * guests,
                status: "Complete",
                contact: {
                    name: guestName,
                    method: "email",
                    handle: email,
                    source: pickRandom(sources)
                }
            })
        }

        return bookings
    }

    // Check existing 2025 data and fetch treatments on mount
    useEffect(() => {
        const init = async () => {
            setStatus('checking')
            try {
                // Check existing bookings
                const bookingsRef = collection(db, 'bookings')
                const q = query(bookingsRef, where('date', '>=', '2025-01-01'), where('date', '<=', '2025-12-31'))
                const snapshot = await getDocs(q)
                setExisting2025Count(snapshot.size)

                // Fetch treatments from Firestore
                const treatmentsRef = collection(db, 'treatments')
                const treatmentsSnapshot = await getDocs(treatmentsRef)
                const treatmentsList = treatmentsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    title: doc.data().title,
                    price_thb: doc.data().price_thb,
                    duration_min: doc.data().duration_min
                })) as Treatment[]
                setTreatments(treatmentsList)

                // Generate preview with real treatment prices
                if (treatmentsList.length > 0) {
                    const preview = generateBookings(treatmentsList)
                    setPreviewBookings(preview)
                }

                setStatus('idle')
            } catch (err: any) {
                setError(err.message)
                setStatus('error')
            }
        }
        init()
    }, [])

    const seedData = async () => {
        if (treatments.length === 0) {
            setError("No treatments found in database. Please add treatments first.")
            return
        }

        setStatus('loading')
        setAddedCount(0)
        try {
            const bookingsRef = collection(db, 'bookings')

            // Fetch existing salesmen
            const salesmenRef = collection(db, 'salesmen')
            const salesmenSnapshot = await getDocs(salesmenRef)
            const salesmen = salesmenSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as { id: string, commissionRate?: number, hourlyRate?: number }[]

            // Fetch outsource rate from settings
            const outsourceSettingsRef = collection(db, 'settings')
            const outsourceSnapshot = await getDocs(outsourceSettingsRef)
            let outsourceRate = 200 // Default fallback
            outsourceSnapshot.docs.forEach(doc => {
                if (doc.id === 'outsource') {
                    outsourceRate = doc.data().rate || 200
                }
            })

            const pickRandomOpt = <T,>(arr: T[]): T | undefined => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : undefined

            // Generate fresh bookings with real treatment prices
            const bookingsToAdd = generateBookings(treatments)

            for (const booking of bookingsToAdd) {
                const salesman = pickRandomOpt(salesmen)
                // 70% chance of outsource, 30% chance of known therapist
                const useOutsource = Math.random() > 0.3
                const therapist = useOutsource ? null : pickRandomOpt(salesmen)

                // Commission calculation
                const commissionRate = salesman?.commissionRate ?? 0.05
                const commissionAmount = Math.round(booking.priceSnapshot * commissionRate)

                // Therapist cost calculation
                // Find treatment to get duration
                const treatmentData = treatments.find(t => t.title === booking.treatment)
                const treatmentHours = treatmentData ? (treatmentData.duration_min || 90) / 60 : 1.5

                let therapistCostSnapshot = 0
                if (therapist && therapist.hourlyRate) {
                    // Known therapist - use their hourly rate
                    therapistCostSnapshot = Math.round(therapist.hourlyRate * treatmentHours)
                } else {
                    // Outsource - use outsource rate from settings
                    therapistCostSnapshot = Math.round(outsourceRate * treatmentHours)
                }

                await addDoc(bookingsRef, {
                    ...booking,
                    salesmanId: salesman?.id || null,
                    commissionSnapshot: commissionRate,
                    commissionAmount: commissionAmount,
                    therapistId: therapist?.id || "OUTSOURCE",
                    therapistCostSnapshot: therapistCostSnapshot,
                    createdAt: new Date().toISOString(),
                    isTestData: true
                })
                setAddedCount(prev => prev + 1)
            }

            // Seed expenses
            const expensesRef = collection(db, 'expenses')
            for (const expense of testExpenses2025) {
                await addDoc(expensesRef, { ...expense, isTestData: true })
            }

            setStatus('done')
        } catch (err: any) {
            setError(err.message)
            setStatus('error')
        }
    }

    const totalRevenue = previewBookings.reduce((sum, b) => sum + b.priceSnapshot, 0)
    const totalGuests = previewBookings.reduce((sum, b) => sum + b.guests, 0)

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Seed January 2025 Test Data</h1>

                <div className="bg-card border border-primary/20 rounded-2xl p-6 mb-6">
                    <h2 className="text-lg font-bold mb-4">Database Status</h2>
                    <p className="text-foreground/60">
                        Existing 2025 bookings: <span className="text-primary font-mono">{existing2025Count}</span>
                    </p>
                    <p className="text-foreground/60">
                        Available treatments: <span className="text-primary font-mono">{treatments.length}</span>
                    </p>
                    {treatments.length > 0 && (
                        <div className="mt-2 text-xs text-foreground/40">
                            {treatments.map(t => (
                                <span key={t.id} className="mr-3">{t.title}: ฿{t.price_thb.toLocaleString()}</span>
                            ))}
                        </div>
                    )}
                </div>

                {treatments.length > 0 && (
                    <div className="bg-card border border-primary/20 rounded-2xl p-6 mb-6">
                        <h2 className="text-lg font-bold mb-4">Preview ({previewBookings.length} bookings)</h2>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-primary/10 p-4 rounded-xl">
                                <div className="text-2xl font-mono font-bold text-primary">฿{totalRevenue.toLocaleString()}</div>
                                <div className="text-xs text-foreground/40">Total Revenue</div>
                            </div>
                            <div className="bg-primary/10 p-4 rounded-xl">
                                <div className="text-2xl font-mono font-bold text-primary">{totalGuests}</div>
                                <div className="text-xs text-foreground/40">Total Guests</div>
                            </div>
                        </div>
                        <div className="max-h-60 overflow-auto text-xs space-y-1">
                            {previewBookings.map((b, i) => (
                                <div key={i} className="flex justify-between text-foreground/60 border-b border-white/5 py-1">
                                    <span>{b.date} • {b.contact.name}</span>
                                    <span>{b.treatment} ({b.guests}p) → <span className="text-primary">฿{b.priceSnapshot.toLocaleString()}</span></span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {treatments.length === 0 && status === 'idle' && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6 text-orange-400">
                        ⚠️ No treatments found. Please add treatments via Menu CMS first.
                    </div>
                )}

                {status === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400">
                        Error: {error}
                    </div>
                )}

                {status === 'done' ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-400">
                        ✓ Added {addedCount} bookings + {testExpenses2025.length} expenses! <a href="/admin?tab=analytics" className="underline">View Analytics →</a>
                    </div>
                ) : (
                    <button
                        onClick={seedData}
                        disabled={status === 'loading' || treatments.length === 0}
                        className="w-full bg-primary text-black font-bold py-4 rounded-xl hover:bg-primary/80 transition-colors disabled:opacity-50"
                    >
                        {status === 'loading' ? `Adding... (${addedCount}/${previewBookings.length})` : 'Seed January 2025 Data'}
                    </button>
                )}

                <p className="text-[10px] text-foreground/30 mt-4 text-center">
                    Uses real treatment prices from your database. Data marked with isTestData=true.
                </p>
            </div>
        </div>
    )
}
