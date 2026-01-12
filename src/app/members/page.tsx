"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Gift, Calendar, User, Star, ChevronRight, LogOut, Ticket, Share2, Instagram, X, Activity, Hand, Thermometer, Droplet, GlassWater, Sun, Info } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useFirestoreCollection, useFirestoreDoc } from "@/hooks/useFirestore"
import { where, orderBy, limit } from "firebase/firestore"
import { Voucher } from "@/types"
import html2canvas from "html2canvas"
import QRCode from "react-qr-code"

// --- Types ---
interface Client {
    id: string
    name: string
    email: string
    phone?: string
    visitCount: number
    totalSpend: number
    joinedDate: string
}

interface Booking {
    id: string
    date: string
    time: string
    contact?: { email?: string }
    status: string
    items?: any[]
    priceSnapshot?: number
}

interface BiomarkerLog {
    id: string
    score: number
    timestamp: any
    email: string
    pillar?: string
    protocol?: any[]
    metrics?: any
}

// --- Components ---

export default function MemberPortal() {
    // State
    const [email, setEmail] = useState("")
    const [loginStatus, setLoginStatus] = useState<"idle" | "loading" | "error" | "success">("idle")
    const [member, setMember] = useState<Client | null>(null)

    const [isGeneratingStory, setIsGeneratingStory] = useState(false)
    const [storyPreview, setStoryPreview] = useState<string | null>(null)
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [selectedHistory, setSelectedHistory] = useState<BiomarkerLog | null>(null);

    const getIconForCategory = (category: string) => {
        switch (category) {
            case 'Manual Therapy': return Hand;
            case 'Contrast Therapy': return Thermometer;
            case 'IV Prescription': return Droplet;
            case 'Botanical Elixir': return GlassWater;
            case 'Lifestyle': return Sun;
            default: return Activity;
        }
    };

    // Data Fetching
    // We fetch collection to avoid "Invalid document reference" error with empty ID
    const { data: clients } = useFirestoreCollection<Client>("clients")
    const { data: bookings } = useFirestoreCollection<Booking>("bookings")
    const { data: vouchers } = useFirestoreCollection<Voucher>("vouchers")

    // Fetch Biomarker History
    const { data: biomarkerHistory } = useFirestoreCollection<BiomarkerLog>("biomarker_logs", [
        where("email", "==", member?.email || "null"),
        orderBy("timestamp", "desc"),
        limit(5)
    ], [member?.email]);

    // Handle Login
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        setLoginStatus("loading")

        // Find matching client
        const foundClient = clients.find(c => c.email.toLowerCase() === email.toLowerCase().trim())

        setTimeout(() => {
            if (foundClient) {
                setMember(foundClient)
                setLoginStatus("success")
                localStorage.setItem("yarey_member_email", foundClient.email)
            } else {
                setLoginStatus("error")
            }
        }, 1500)
    }

    const handleLogout = () => {
        setMember(null)
        setLoginStatus("idle")
        localStorage.removeItem("yarey_member_email")
    }

    // Auto-update member object if client data changes real-time
    useEffect(() => {
        if (member) {
            const upToDate = clients.find(c => c.id === member.id)
            if (upToDate) setMember(upToDate)
        } else {
            // Try restore session
            const stored = localStorage.getItem("yarey_member_email")
            if (stored && clients.length > 0) {
                const found = clients.find(c => c.email.toLowerCase() === stored.toLowerCase())
                if (found) {
                    setMember(found)
                    setLoginStatus("success")
                }
            }
        }
    }, [clients, member?.id])

    // Derived Data
    const memberBookings = bookings
        .filter(b => b.contact?.email?.toLowerCase() === member?.email.toLowerCase())
        .sort((a, b) => b.date.localeCompare(a.date))

    const memberVouchers = vouchers
        .filter(v => v.clientId === member?.id || v.recipientName === member?.name) // Fallback to name
        .filter(v => v.status === "ISSUED")

    const nextVisit = memberBookings.find(b => b.status === "Confirmed" && b.date >= new Date().toISOString().split('T')[0])

    // Stats Calculation
    // Stats Calculation
    // We broaden the filter to include Confirmed/Checked In so clients feel their history is recognized
    const validStatuses = ["Complete", "Redeemed", "Confirmed", "Checked In", "Paid", "Arrived"]
    const relevantBookings = memberBookings.filter(b => validStatuses.includes(b.status))

    // Calculate total minutes (Default to 60 if duration missing)
    // Calculate total minutes (Bookings + Active Vouchers)
    const bookingMinutes = relevantBookings
        .reduce((acc, b) => {
            const sessionDuration = b.items?.reduce((sum: number, item: any) => sum + (Number(item.duration) || 60), 0) || 60
            return acc + sessionDuration
        }, 0)

    const voucherMinutes = memberVouchers.reduce((acc, v) => {
        // Estimate duration from title or default to 60
        // FIX: Use Regex to be precise, avoiding price numbers (e.g. 1200 THB)
        // Looks for "120m", "120 min", "120min"
        const title = v.treatmentTitle || ""
        const match = title.match(/(\d+)\s*(?:min|m\b|m\s|m\|)/i)

        let duration = 60
        if (match && match[1]) {
            duration = parseInt(match[1])
        } else {
            // Fallback for simple titles without 'min' label
            if (title.includes("90")) duration = 90
            else if (title.includes("120")) duration = 120
            else if (title.includes("30")) duration = 30
            else if (title.includes("45")) duration = 45
            else if (title.includes("180")) duration = 180
        }
        return acc + duration
    }, 0)

    const totalMinutes = bookingMinutes + voucherMinutes
    const totalHours = Math.round(totalMinutes / 60)

    // Calculate Dynamic Tier (Moved to scope for Story Card access)
    // FIX: Use the authoritative 'totalSpend' from the client record instead of re-summing bookings
    const totalSpend = member?.totalSpend || 0
    // 5-Tier System to smooth progression
    const tiers = [
        { name: "Seeker", hours: 0, spend: 0, next: "Initiate" },
        { name: "Initiate", hours: 5, spend: 8000, next: "Devotee" },
        { name: "Devotee", hours: 15, spend: 25000, next: "Alchemist" },
        { name: "Alchemist", hours: 30, spend: 55000, next: "Guardian" },
        { name: "Guardian", hours: 50, spend: 88000, next: "Ascended" }
    ]

    // Premium Aesthetics Map
    // Premium Aesthetics Map - MAX DRAMA
    const tierStyles: Record<string, string> = {
        "Seeker": "bg-[#0c2627] border border-white/10 text-white/60",
        "Initiate": "bg-gradient-to-br from-[#8B5A2B] to-[#5D4037] text-[#f2e2d5] border border-[#a88b7d]/30 shadow-[0_0_20px_rgba(139,90,43,0.3)]", // Deep Bronze
        "Devotee": "bg-gradient-to-br from-[#E2E2E2] via-[#bdc3c7] to-[#8997a1] text-[#051818] border border-white/50 shadow-[0_0_30px_rgba(255,255,255,0.3)] animate-pulse-slow", // Glowing Silver
        "Alchemist": "bg-gradient-to-br from-[#FFD700] via-[#FDB931] to-[#D4AF37] text-[#3E2723] border border-[#ffed4a]/50 shadow-[0_0_40px_rgba(255,215,0,0.4)] ring-1 ring-[#FFD700]", // Radiant Gold
        "Guardian": "bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-purple-900 to-black text-white border border-purple-500/50 shadow-[0_0_60px_rgba(168,85,247,0.5)] bg-[size:400%_400%] animate-gradient-xy relative overflow-hidden backdrop-blur-3xl" // The Void
    }

    let currentTier = tiers[0]
    let nextTier = tiers[1] || null

    // Determine Tier (Reverse loop to find highest match)
    for (let i = tiers.length - 1; i >= 0; i--) {
        if (totalSpend >= tiers[i].spend) {
            currentTier = tiers[i]
            nextTier = tiers[i + 1] || null
            break
        }
    }

    // Calculate Progress for Display
    let progressPercent = 100
    let progressText = "Transcendence Achieved"

    if (nextTier) {
        const spendLeft = Math.max(0, nextTier.spend - totalSpend)

        // Calculate % based on previous tier baseline
        // Since we are Spend-Only now, we ignore hours.
        const rangeSpend = nextTier.spend - currentTier.spend

        // Progress within the current bracket
        const progressS = rangeSpend > 0 ? ((totalSpend - currentTier.spend) / rangeSpend) * 100 : 0

        progressPercent = Math.min(100, Math.max(0, progressS))
        progressText = `Spend ฿${spendLeft.toLocaleString()} more to reach ${nextTier.name}`
    }



    // IG Story Generator
    const shareStory = async () => {
        setIsGeneratingStory(true)
        const element = document.getElementById("ig-story-card")
        if (element) {
            try {
                const canvas = await html2canvas(element, {
                    scale: 3, // High Quality for Retina
                    backgroundColor: "#051818",
                    useCORS: true
                })

                canvas.toBlob(async (blob) => {
                    // Simply show the image in a modal - 100% reliable
                    const dataUrl = canvas.toDataURL('image/png')
                    setStoryPreview(dataUrl)
                }, 'image/png')

            } catch (err) {
                console.error("Story Gen Error", err)
                alert("Could not generate image. Please screenshot manually.")
            }
        }
        setIsGeneratingStory(false)
    }

    // --- View: Login Screen ---
    if (!member) {
        return (
            <div className="min-h-screen bg-[#051818] text-[#F2F2F2] flex flex-col items-center justify-center p-6 relative overflow-hidden">
                {/* Background Ambience */}
                <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('/noise.png')] z-0" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#D1C09B] rounded-full blur-[120px] opacity-10 pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md relative z-10"
                >
                    <div className="text-center mb-12">
                        <div className="text-xs uppercase tracking-[0.5em] text-[#D1C09B] mb-4">Client Portal</div>
                        <h1 className="text-5xl font-serif text-white mb-2">Sanctuary.</h1>
                        <p className="text-white/40">Access your membership, history, and gifts.</p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold text-white/50 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => {
                                        setEmail(e.target.value)
                                        setLoginStatus("idle")
                                    }}
                                    placeholder="e.g. sarah@example.com"
                                    className="w-full bg-[#051818]/50 border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#D1C09B] transition-colors"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loginStatus === "loading" || !email}
                                className="w-full bg-[#D1C09B] text-[#051818] hover:bg-[#b0a07f] font-bold py-6 rounded-xl text-md"
                            >
                                {loginStatus === "loading" ? "Verifying..." : "Access Member Area"}
                            </Button>

                            {loginStatus === "error" && (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm text-center"
                                >
                                    Email not found. Please use the email provided during your visit.
                                </motion.div>
                            )}
                        </form>
                    </div>

                    <div className="mt-8 text-center">
                        <Link href="/" className="text-xs text-white/30 hover:text-white transition-colors border-b border-transparent hover:border-white/30 pb-0.5">
                            ← Return to Website
                        </Link>
                    </div>
                </motion.div>
            </div>
        )
    }

    // --- View: Dashboard ---
    // Tier Background Ambiance
    const tierBackgrounds: Record<string, string> = {
        "Seeker": "bg-[#051818]",
        "Initiate": "bg-gradient-to-b from-[#1a120b] to-[#051818]",
        "Devotee": "bg-gradient-to-b from-[#1e293b] to-[#051818]",
        "Alchemist": "bg-gradient-to-b from-[#251f10] to-[#051818]",
        "Guardian": "bg-gradient-to-b from-[#1e102e] to-[#051818]"
    }

    return (
        <div className={`min-h-screen text-[#F2F2F2] font-sans relative pb-20 overflow-hidden transition-colors duration-1000 ${tierBackgrounds[currentTier.name] || tierBackgrounds["Seeker"]}`}>

            {/* --- COSMIC VOID SIMULATION (Top Tiers Only) --- */}
            {(currentTier.name === "Alchemist" || currentTier.name === "Guardian") && (
                <div className="fixed inset-0 z-0 pointer-events-none">
                    {/* 1. Deep Space Noise */}
                    <div className="absolute inset-0 opacity-[0.05] bg-[url('/noise.png')] mix-blend-overlay" />

                    {/* 2. The Singularity (Rotating Iridescent Core) */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                        className="absolute top-[-50%] left-[-50%] w-[200vw] h-[200vw] opacity-40 blur-[80px]"
                        style={{
                            background: currentTier.name === "Guardian"
                                ? "conic-gradient(from 0deg at 50% 50%, #000000 0%, #4c1d95 20%, #be185d 40%, #0f766e 60%, #1e3a8a 80%, #000000 100%)" // Multi-color (Violet, Pink, Teal, Blue)
                                : "conic-gradient(from 0deg at 50% 50%, #000000 0%, #1a1a1a 100%)"
                        }}
                    />



                </div>
            )}

            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#051818]/10 backdrop-blur-md border-b border-white/5 px-6 py-4">
                <div className="max-w-xl mx-auto flex justify-between items-center">
                    <div className="text-xl font-serif text-[#D1C09B]">Sanctuary.</div>
                    <button
                        onClick={handleLogout}
                        className="text-xs uppercase tracking-widest text-white/50 hover:text-white flex items-center gap-2"
                    >
                        Sign Out <LogOut className="w-3 h-3" />
                    </button>
                </div>
            </header>

            <motion.div
                className="max-w-xl mx-auto p-6 relative z-10 space-y-6"
            >

                {/* Greeting Card */}
                <motion.div className="space-y-1">
                    <div className="text-sm text-white/60">Welcome back,</div>
                    <h1 className="text-3xl font-serif text-white">{member.name}</h1>
                </motion.div>

                {/* Tier / Stats Logic */}
                <motion.div className="grid grid-cols-2 gap-4">
                    <div className={`p-5 rounded-2xl relative overflow-hidden group transition-all duration-500 ${tierStyles[currentTier.name] || tierStyles["Seeker"]}`}>

                        {/* ICON BLENDING FIX: Remove 'Atmospheric Background' for icons, use mix-blend on the icon itself */}

                        {/* Alchemist Shine (Alchemist Only) */}


                        <div className="relative z-10">
                            <div className="text-[10px] uppercase font-bold opacity-60 mb-1 tracking-widest">Membership Tier</div>
                            <div className="text-xl font-bold flex items-center gap-2 md:gap-3 mb-2 font-serif relative">
                                {currentTier.name === "Guardian" ? (
                                    <div className="relative w-12 h-12 md:w-16 md:h-16 -ml-2 md:-ml-3 flex-shrink-0">
                                        <img
                                            src="/tier-guardian.png?v=2"
                                            alt="Guardian Singularity"
                                            className="w-full h-full object-contain mix-blend-screen filter saturate-150 contrast-125"
                                        />
                                    </div>
                                ) : currentTier.name === "Alchemist" ? (
                                    <div className="relative w-12 h-12 md:w-16 md:h-16 -ml-2 md:-ml-3 flex-shrink-0">
                                        <img
                                            src="/tier-alchemist.png?v=2"
                                            alt="Alchemist Flux"
                                            className="w-full h-full object-contain mix-blend-screen filter saturate-150 brightness-110"
                                        />
                                    </div>
                                ) : (
                                    <Star className="w-6 h-6 fill-current" />
                                )}
                                <span className={`text-2xl md:text-3xl tracking-wide ${currentTier.name === "Guardian" ? "text-purple-200" : currentTier.name === "Alchemist" ? "text-[#FFD700]" : ""}`}>
                                    {currentTier.name}
                                </span>
                            </div>

                            {/* Progress Bar */}
                            {nextTier && (
                                <div>
                                    <div className="h-1 w-full bg-black/20 rounded-full overflow-hidden mb-1 relative">
                                        <div
                                            className="h-full bg-current transition-all duration-1000 relative z-10"
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                    <div className="text-[9px] font-bold uppercase opacity-60 tracking-wider">
                                        {progressText}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-4 -right-4 text-[#051818]/10 group-hover:scale-110 transition-transform duration-700">
                            <Star className="w-24 h-24" />
                        </div>
                    </div>

                    {/* Living Wellness Investment Card */}
                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm">
                        <div className="text-[10px] uppercase font-bold text-white/40 mb-1">Wellness Investment</div>
                        <div className="text-2xl font-mono text-white relative z-10">
                            {totalHours} <span className="text-sm font-sans text-white/40">Hours</span>
                        </div>
                        {/* Living Graph */}
                        <div className="absolute bottom-0 left-0 w-full h-12 flex items-end gap-1 px-4 opacity-30">
                            {[40, 60, 30, 80, 50, 90, 20, 45, 70].map((h, i) => (
                                <div
                                    key={i}
                                    className="flex-1 bg-white rounded-t-sm"
                                    style={{ height: `${h}%` }}
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Share Card - Premium Glass */}
                <motion.div
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                    className="p-6 rounded-3xl relative overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md group"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-100%] group-hover:animate-shine pointer-events-none" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/10 rounded-full text-white ring-1 ring-white/20">
                                <Instagram className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-lg font-serif text-white">Share your Journey</div>
                                <div className="text-xs text-gray-400">Inspire others to find peace.</div>
                            </div>
                        </div>
                        <Button
                            onClick={shareStory}
                            disabled={isGeneratingStory}
                            className={`rounded-full px-6 font-bold tracking-wide transition-all ${currentTier.name === "Guardian" ? "bg-purple-500 hover:bg-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]" :
                                currentTier.name === "Alchemist" ? "bg-[#D1C09B] hover:bg-[#c2b08a] text-black shadow-[0_0_20px_rgba(209,192,155,0.4)]" :
                                    "bg-white text-black hover:bg-gray-200"
                                }`}
                        >
                            {isGeneratingStory ? "Creating..." : "Story"}
                        </Button>
                    </div>
                </motion.div>

                {/* Preview Modal for IG Story */}
                <AnimatePresence>
                    {storyPreview && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-[#051818]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6"
                            onClick={() => setStoryPreview(null)}
                        >
                            <div className="text-white/60 text-sm mb-4 font-bold uppercase tracking-widest animate-pulse">
                                Long Press to Share
                            </div>
                            <img
                                src={storyPreview}
                                alt="Story Preview"
                                className="w-full max-w-sm rounded-[32px] shadow-2xl border border-white/10"
                                onClick={(e) => e.stopPropagation()} // Allow clicking image without closing
                            />
                            <Button
                                variant="ghost"
                                className="mt-8 text-white hover:bg-white/10"
                                onClick={() => setStoryPreview(null)}
                            >
                                <X className="w-6 h-6 mr-2" /> Close Preview
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* HIDDEN: The Story Card Component (Rendered off-screen but captured) */}
                <div className="fixed top-0 left-[-9999px] pointer-events-none">
                    {(() => {
                        // Dynamic Theme Colors for Story
                        const themeMap: Record<string, { text: string, blob1: string, blob2: string, border: string }> = {
                            "Seeker": { text: "#ffffff", blob1: "#D1C09B", blob2: "#0F2E2E", border: "rgba(255,255,255,0.2)" },
                            "Initiate": { text: "#edd5c5", blob1: "#785a46", blob2: "#4a3627", border: "rgba(168, 139, 125, 0.4)" }, // Bronze
                            "Devotee": { text: "#ffffff", blob1: "#bdc3c7", blob2: "#2c3e50", border: "rgba(255,255,255,0.4)" }, // Silver
                            "Alchemist": { text: "#D1C09B", blob1: "#F2E6D0", blob2: "#AA8E5D", border: "rgba(209, 192, 155, 0.5)" }, // Gold
                            "Guardian": { text: "#a855f7", blob1: "#a855f7", blob2: "#4c1d95", border: "rgba(168, 85, 247, 0.6)" } // Void Purple
                        }
                        const theme = themeMap[currentTier.name] || themeMap["Seeker"]

                        return (
                            <div
                                id="ig-story-card"
                                style={{ width: '1080px', height: '1920px', backgroundColor: '#051818', fontFamily: 'serif', color: theme.text }}
                                className="relative flex flex-col items-center justify-between p-24 text-center overflow-hidden"
                            >
                                {/* Background Ambience */}
                                <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")", zIndex: 0, mixBlendMode: 'overlay' }} />
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '800px', height: '800px', backgroundColor: theme.blob1, borderRadius: '9999px', filter: 'blur(200px)', opacity: 0.15 }} />
                                <div style={{ position: 'absolute', bottom: 0, right: 0, width: '600px', height: '600px', backgroundColor: theme.blob2, borderRadius: '9999px', filter: 'blur(200px)', opacity: 0.25 }} />

                                {/* Header */}
                                <div className="relative z-10 pt-20">
                                    <div style={{ fontSize: '2.25rem', textTransform: 'uppercase', letterSpacing: '0.5em', color: theme.text, marginBottom: '2rem', opacity: 0.8 }}>My Sanctuary</div>
                                    <div style={{ height: '1px', width: '8rem', backgroundColor: theme.text, margin: '0 auto', opacity: 0.5 }} />
                                </div>

                                {/* Core Stat */}
                                <div className="relative z-10 flex flex-col items-center gap-12">
                                    <div style={{ fontSize: '3rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', fontWeight: 300 }}>"I have invested"</div>
                                    <div style={{ fontSize: '200px', lineHeight: 1, fontFamily: 'sans-serif', fontWeight: 'bold', color: theme.text, textShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                                        {totalHours}
                                    </div>
                                    <div style={{ fontSize: '3rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', fontWeight: 300, marginBottom: '2rem' }}>"hours in my peace<br />this year."</div>

                                    {/* TIER BADGE ADDED TO STORY */}
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        border: `3px solid ${theme.border}`,
                                        padding: '1rem 3rem',
                                        borderRadius: '99px',
                                        background: 'rgba(0,0,0,0.2)',
                                        boxShadow: `0 0 40px ${theme.border}`
                                    }}>
                                        <span style={{ fontSize: '2.5rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: theme.text, fontWeight: 'bold' }}>
                                            {currentTier.name} Status
                                        </span>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="relative z-10 pb-20 space-y-8">
                                    <div style={{ fontSize: '1.875rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>@YareySanctuary</div>
                                    <div style={{ fontSize: '1.5rem', color: theme.text, fontFamily: 'monospace', border: `1px solid ${theme.border}`, padding: '0.5rem 1.5rem', borderRadius: '9999px', display: 'inline-block' }}>
                                        #WellnessJourney
                                    </div>
                                </div>
                            </div>
                        )
                    })()}
                </div>

                {/* Biometric Score Section */}
                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="mb-8">
                    <div className="bg-gradient-to-br from-[#0c2627] to-[#051818] border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Activity className="w-32 h-32 text-primary" />
                        </div>

                        <div className="flex justify-between items-start relative z-10">
                            <div
                                onClick={() => biomarkerHistory?.[0] && setSelectedHistory(biomarkerHistory[0])}
                                className={`cursor-pointer group transition-all ${biomarkerHistory?.length > 0 ? '' : 'pointer-events-none'}`}
                            >
                                <h3 className="text-sm font-serif text-white/60 uppercase tracking-widest mb-1 group-hover:text-white transition-colors flex items-center gap-2">
                                    Current Wellness Score
                                    {biomarkerHistory?.length > 0 && <Info className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                </h3>
                                <div className="text-5xl font-light text-white mb-2 group-hover:scale-105 transition-transform origin-left">
                                    {biomarkerHistory?.[0]?.score || "--"} <span className="text-lg text-white/30">/ 100</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-white/40">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    {biomarkerHistory?.length > 0 ? `Last synced: ${new Date(biomarkerHistory[0]?.timestamp?.toDate()).toLocaleDateString()}` : "No scan data available"}
                                </div>
                            </div>
                            <Link href="/biomarker">
                                <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-full px-6">
                                    {biomarkerHistory?.length > 0 ? "New Scan" : "Start First Scan"}
                                </Button>
                            </Link>
                        </div>

                        {/* History Mini-Graph */}
                        {biomarkerHistory && biomarkerHistory.length > 1 && (
                            <div className="mt-6 pt-4 border-t border-white/5 flex gap-4 overflow-x-auto pb-2">
                                {biomarkerHistory.slice(1).map((log: any, i: number) => (
                                    <div
                                        key={i}
                                        onClick={() => setSelectedHistory(log)}
                                        className="flex flex-col items-center min-w-[60px] group cursor-pointer"
                                    >
                                        <span className="text-[10px] text-white/80 mb-1 font-mono font-bold tracking-tighter">{log.score}</span>
                                        <div className="h-16 w-1.5 bg-white/5 rounded-full relative group-hover:w-2 transition-all duration-300">
                                            <div className="absolute bottom-0 w-full bg-primary/40 group-hover:bg-primary rounded-full transition-colors" style={{ height: `${log.score}%` }}></div>
                                        </div>
                                        <span className="text-[9px] text-white/30 mt-2 group-hover:text-white transition-colors">{new Date(log.timestamp?.toDate()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Next Appointment - Breathing */}
                {nextVisit ? (
                    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-gradient-to-r from-[#0c2627] to-[#051818] border border-[#D1C09B]/30 p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30 transition-opacity">
                            <Calendar className="w-16 h-16 text-[#D1C09B]" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 text-[#D1C09B] text-xs font-bold uppercase tracking-widest mb-2">
                                <span className="w-2 h-2 rounded-full bg-[#D1C09B] animate-pulse" /> Upcoming Ritual
                            </div>
                            <div className="text-xl font-serif text-white mb-1">
                                {nextVisit.items?.[0]?.title || "Wellness Session"}
                            </div>
                            <div className="text-white/60 text-sm">
                                {new Date(nextVisit.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at {nextVisit.time}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-white/5 mx-auto flex items-center justify-center text-white/30">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-white font-serif">No upcoming visits</div>
                            <div className="text-xs text-white/40">Ready to return to the sanctuary?</div>
                        </div>
                        <Link href="/book" className="inline-block">
                            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white/60 hover:text-white text-xs mt-2">Book Now</Button>
                        </Link>
                    </motion.div>
                )}

                {/* HISTORY DETAIL MODAL */}
                <AnimatePresence>
                    {selectedHistory && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-[#051818]/95 backdrop-blur-xl flex items-start justify-center p-6 overflow-y-auto"
                            onClick={() => setSelectedHistory(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                                className="w-full max-w-2xl bg-[#0c2627] border border-[#D1C09B]/20 rounded-3xl relative shadow-2xl overflow-hidden mt-10 md:mt-20 mb-20"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="p-8 pb-4 border-b border-white/5 flex justify-between items-start">
                                    <div>
                                        <div className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">
                                            {new Date(selectedHistory.timestamp?.toDate()).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </div>
                                        <h3 className="text-2xl font-serif text-white">{selectedHistory.pillar || "Biomarker Analysis"}</h3>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-4xl font-light text-[#D1C09B]">{selectedHistory.score}</div>
                                        <div className="text-[10px] text-white/40 uppercase tracking-widest">Wellness Score</div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedHistory(null)}
                                        className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Protocols Content */}
                                <div className="p-8 space-y-6">
                                    {selectedHistory.protocol ? (
                                        <div className="grid grid-cols-1 gap-4">
                                            {Array.isArray(selectedHistory.protocol) ? selectedHistory.protocol.map((item: any, idx: number) => {
                                                const Icon = getIconForCategory(item.category);
                                                return (
                                                    <div key={idx} className="bg-white/5 border border-white/5 p-4 rounded-xl flex gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center text-primary">
                                                            <Icon className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <div className="text-[10px] uppercase tracking-widest text-primary/60 font-bold">{item.category}</div>
                                                                {item.tag && <span className="text-[9px] px-2 py-0.5 rounded-full border border-white/10 text-white/40">{item.tag}</span>}
                                                            </div>
                                                            <div className="text-lg font-serif text-white mb-2">{item.title}</div>
                                                            <div className="text-sm text-white/60 leading-relaxed border-t border-white/5 pt-2">{item.detail}</div>

                                                            {item.benefits && (
                                                                <div className="flex flex-wrap gap-2 mt-3">
                                                                    {item.benefits.map((b: string, i: number) => (
                                                                        <span key={i} className="px-2 py-1 rounded bg-white/5 text-[10px] text-white/40">{b}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            }) : (
                                                <div className="text-white/40 text-center italic">Detailed protocol data format is invalid.</div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-white/40 text-center py-8">
                                            Detailed protocol data was not saved for this session.
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Vouchers List - Holographic */}
                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="space-y-4 pt-4 border-t border-white/5">
                    <h3 className="text-lg font-serif text-white/50 px-2 uppercase tracking-widest text-xs">My Gift Vouchers</h3>
                    <div className="grid grid-cols-1 gap-4">
                        {memberVouchers.map(v => (
                            <div key={v.id} className="relative group perspective-1000">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 z-20 pointer-events-none" />
                                <div
                                    onClick={() => setQrCode(v.code)}
                                    className="bg-gradient-to-br from-[#0c2627] to-[#041212] border border-[#D1C09B]/20 p-6 rounded-xl flex justify-between items-center relative overflow-hidden shadow-lg group-hover:scale-[1.02] transition-transform duration-300 cursor-pointer"
                                >
                                    <div className="relative z-10">
                                        <div className="text-[#D1C09B] text-[10px] uppercase font-bold tracking-widest mb-1">
                                            {v.type === "package" ? "Membership Package" : "Single Session"}
                                        </div>
                                        <div className="text-white font-serif text-xl">
                                            {(() => {
                                                const raw = v.treatmentTitle || "Experience"
                                                const match = raw.match(/^(\d+)m\s*\|\s*(.*)/)
                                                return match ? `${match[2]} ${match[1]}min` : raw
                                            })()}
                                        </div>
                                        {v.type === "package" && (
                                            <div className="text-emerald-400 text-xs font-bold mt-1 bg-emerald-400/10 inline-block px-2 py-0.5 rounded-sm border border-emerald-400/20">
                                                {v.creditsRemaining} / {v.creditsTotal} Sessions Remaining
                                            </div>
                                        )}
                                        <div className="text-white/40 text-xs mt-1 font-mono">{v.code}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="w-12 h-12 rounded-full bg-[#D1C09B]/10 flex items-center justify-center text-[#D1C09B]">
                                            <Gift className="w-6 h-6" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {memberVouchers.length === 0 && (
                            <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center text-white/30 text-sm">
                                <Ticket className="w-8 h-8 mx-auto mb-3 opacity-50" />
                                No active vouchers found.
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* History List */}
                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="space-y-4 pt-8 pb-20">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 ml-1">Journey History</h2>
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
                        {memberBookings.slice(0, 5).map(booking => (
                            <div key={booking.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div>
                                    <div className="text-white font-medium text-sm">
                                        {booking.items?.[0]?.title || "Wellness Session"}
                                    </div>
                                    <div className="text-xs text-white/40">
                                        {new Date(booking.date).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${booking.status === "Complete" ? "bg-white/10 text-white/40" :
                                    booking.status === "Confirmed" ? "bg-[#D1C09B]/10 text-[#D1C09B]" :
                                        "bg-white/5 text-white/30"
                                    }`}>
                                    {booking.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

            </motion.div>
            {/* QR Code Modal for Guest */}
            <AnimatePresence>
                {qrCode && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setQrCode(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center">
                                <h3 className="text-xl font-serif text-black mb-1">Redeem Voucher</h3>
                                <p className="text-sm text-gray-500">Show this to reception</p>
                            </div>

                            <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl">
                                <QRCode value={qrCode} size={200} />
                            </div>

                            <div className="text-center">
                                <p className="font-mono text-2xl font-bold text-black tracking-wider">{qrCode}</p>
                            </div>

                            <Button onClick={() => setQrCode(null)} variant="outline" className="w-full rounded-full border-gray-300 text-gray-600 hover:bg-gray-50">
                                Close
                            </Button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    )
}
