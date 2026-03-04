"use client"

import { createContext, useContext, ReactNode, useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useGuestAuth, GuestProfile, GuestPlatform, ThemeMode } from "@/hooks/useGuestAuth"
import { useFirestoreCollection } from "@/hooks/useFirestore"
import { Client, Voucher, Booking, Treatment } from "@/types"
import { where, orderBy, limit } from "firebase/firestore"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"

// ─── Context ─────────────────────────────────
interface GuestContextType {
    profile: GuestProfile | null
    member: Client | null
    loading: boolean
    vouchers: Voucher[]
    bookings: Booking[]
    treatments: Treatment[]
    isRegistered: boolean
    platform: GuestPlatform
    theme: ThemeMode
    setTheme: (t: ThemeMode) => void
    logout: () => void
}

const GuestContext = createContext<GuestContextType>({
    profile: null, member: null, loading: true,
    vouchers: [], bookings: [], treatments: [],
    isRegistered: false, platform: "web",
    theme: "dark", setTheme: () => { }, logout: () => { },
})

export const useGuest = () => useContext(GuestContext)

// ─── Theme CSS Variables ─────────────────────
const THEMES: Record<string, Record<string, string>> = {
    dark: {
        "--g-bg": "#051818",
        "--g-bg-secondary": "#0a2525",
        "--g-surface": "rgba(255,255,255,0.05)",
        "--g-surface-hover": "rgba(255,255,255,0.08)",
        "--g-surface-solid": "#0d2e2e",
        "--g-border": "rgba(255,255,255,0.08)",
        "--g-text": "#F2F2F2",
        "--g-text-primary": "#F2F2F2",
        "--g-text-secondary": "rgba(255,255,255,0.5)",
        "--g-text-muted": "rgba(255,255,255,0.25)",
        "--g-accent": "#D1C09B",
        "--g-accent-text": "#051818",
        "--g-success": "#10b981",
        "--g-danger": "#ef4444",
        "--g-card-shadow": "0 2px 20px rgba(0,0,0,0.3)",
        "--g-modal-bg": "#0a2525",
    },
    light: {
        "--g-bg": "#FAFAF8",
        "--g-bg-secondary": "#F0EEEB",
        "--g-surface": "rgba(0,0,0,0.03)",
        "--g-surface-hover": "rgba(0,0,0,0.06)",
        "--g-surface-solid": "#EDECEA",
        "--g-border": "rgba(0,0,0,0.08)",
        "--g-text": "#1A1A1A",
        "--g-text-primary": "#1A1A1A",
        "--g-text-secondary": "rgba(0,0,0,0.5)",
        "--g-text-muted": "rgba(0,0,0,0.25)",
        "--g-accent": "#8B7D5E",
        "--g-accent-text": "#FFFFFF",
        "--g-success": "#059669",
        "--g-danger": "#dc2626",
        "--g-card-shadow": "0 2px 15px rgba(0,0,0,0.06)",
        "--g-modal-bg": "#FFFFFF",
    },
}

function applyThemeVars(theme: ThemeMode) {
    if (typeof document === "undefined") return
    const root = document.documentElement
    const vars = THEMES[theme]
    if (!vars) return
    for (const [key, val] of Object.entries(vars)) {
        root.style.setProperty(key, val)
    }
    root.setAttribute("data-guest-theme", theme)
}

// ─── Email Input Screen ──────────────────────
function EmailGate({ onSubmit, loading, error, platform, profile }: {
    onSubmit: (email: string) => void
    loading: boolean
    error: string | null
    platform: GuestPlatform
    profile: GuestProfile | null
}) {
    const [email, setEmail] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = email.trim()
        if (!trimmed || !trimmed.includes("@")) return
        onSubmit(trimmed)
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm text-center space-y-6"
            >
                <div className="text-[9px] uppercase tracking-[0.6em]" style={{ color: "var(--g-accent)" }}>
                    Welcome to
                </div>
                <h1 className="text-4xl font-serif" style={{ color: "var(--g-text)" }}>
                    Sanctuary.
                </h1>

                {profile && (
                    <div className="flex items-center justify-center gap-3 py-2">
                        {profile.pictureUrl && (
                            <img src={profile.pictureUrl} alt="" className="w-10 h-10 rounded-full object-cover" style={{ border: "2px solid var(--g-border)" }} />
                        )}
                        <span className="text-sm font-bold" style={{ color: "var(--g-text)" }}>
                            {profile.displayName}
                        </span>
                    </div>
                )}

                <p className="text-sm leading-relaxed" style={{ color: "var(--g-text-secondary)" }}>
                    {platform === "line"
                        ? "กรอกอีเมลเพื่อเชื่อมต่อบัญชี\nEnter your email to link your account"
                        : "Enter your email to access your membership"
                    }
                </p>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        autoFocus
                        autoComplete="email"
                        className="w-full px-4 py-3.5 rounded-xl text-sm text-center outline-none transition-all"
                        style={{
                            background: "var(--g-surface)",
                            border: "1px solid var(--g-border)",
                            color: "var(--g-text)",
                        }}
                        onFocus={e => e.target.style.borderColor = "var(--g-accent)"}
                        onBlur={e => e.target.style.borderColor = "var(--g-border)"}
                    />

                    {error && (
                        <p className="text-xs" style={{ color: "var(--g-danger)" }}>{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !email.includes("@")}
                        className="w-full py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-40"
                        style={{ background: "var(--g-accent)", color: "var(--g-accent-text)" }}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--g-accent-text)", borderTopColor: "transparent" }} />
                                Loading...
                            </span>
                        ) : "Continue"}
                    </button>
                </form>

                <p className="text-[10px]" style={{ color: "var(--g-text-muted)" }}>
                    {platform === "line"
                        ? "ใช้อีเมลเดียวกับที่ให้ไว้ตอนจอง"
                        : "Use the same email from your booking"
                    }
                </p>
            </motion.div>
        </div>
    )
}

// ─── Bottom Navigation ───────────────────────
function BottomNav() {
    const pathname = usePathname()
    const { vouchers } = useGuest()

    const tabs = [
        { href: "/guest", icon: "🏠", label: "Home", exact: true },
        { href: "/guest/vouchers", icon: "🎫", label: "Vouchers", count: vouchers.length },
        { href: "/guest/whoop", icon: "💚", label: "WHOOP" },
        { href: "/guest/history", icon: "📜", label: "History" },
        { href: "/guest/profile", icon: "👤", label: "Profile" },
    ]

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 border-t"
            style={{
                background: "var(--g-bg)",
                borderColor: "var(--g-border)",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
                willChange: "transform",
                WebkitBackfaceVisibility: "hidden" as any,
            }}
        >
            <div className="max-w-md mx-auto flex">
                {tabs.map(tab => {
                    const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            prefetch={true}
                            className="flex-1 py-2.5 flex flex-col items-center gap-0.5 relative transition-colors duration-200"
                            style={{ color: isActive ? "var(--g-accent)" : "var(--g-text-muted)" }}
                        >
                            <span className="text-lg leading-none">{tab.icon}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider">{tab.label}</span>
                            {tab.count && tab.count > 0 && (
                                <span
                                    className="absolute top-1 right-[calc(50%-2px)] translate-x-3 min-w-[16px] h-4 rounded-full text-[8px] font-bold flex items-center justify-center px-1"
                                    style={{ background: "var(--g-accent)", color: "var(--g-accent-text)" }}
                                >
                                    {tab.count}
                                </span>
                            )}
                            {isActive && (
                                <span
                                    className="absolute -top-px left-1/4 right-1/4 h-[2px] rounded-full"
                                    style={{ background: "var(--g-accent)" }}
                                />
                            )}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}

// ─── Layout ──────────────────────────────────
export default function GuestLayout({ children }: { children: ReactNode }) {
    const { ready, profile, platform, theme, setTheme, logout } = useGuestAuth()

    const [member, setMember] = useState<Client | null>(null)
    const [memberLoading, setMemberLoading] = useState(true)
    const [needsEmail, setNeedsEmail] = useState(false)
    const [emailSubmitting, setEmailSubmitting] = useState(false)
    const [emailError, setEmailError] = useState<string | null>(null)
    const memberLookupDone = useRef(false)

    // Data collections — scoped queries where possible
    const memberId = member?.id || "__none__"
    const ninetyDaysAgo = useMemo(() => {
        const d = new Date(); d.setDate(d.getDate() - 90)
        return d.toISOString().split("T")[0]
    }, [])
    const { data: vouchers } = useFirestoreCollection<Voucher>("vouchers", [where("clientId", "==", memberId)], [memberId])
    const { data: bookings } = useFirestoreCollection<Booking>("bookings", [where("date", ">=", ninetyDaysAgo), orderBy("date", "desc"), limit(50)], [ninetyDaysAgo])
    const { data: treatments } = useFirestoreCollection<Treatment>("treatments", [where("active", "==", true)], [])

    const loading = !ready || memberLoading

    // Apply theme immediately
    useEffect(() => {
        applyThemeVars(theme)
    }, [theme])

    // ─── Auth: LINE lookup or web detection ───
    useEffect(() => {
        if (!ready) return
        if (memberLookupDone.current) return
        memberLookupDone.current = true

        if (!profile) {
            // Web mode — no LINE profile → show email gate
            setNeedsEmail(true)
            setMemberLoading(false)
            return
        }

        // LINE mode — try to find by lineUserId
        const lookupByLine = async () => {
            try {
                const res = await fetch("/api/auth/line", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        lineUserId: profile.userId,
                        displayName: profile.displayName,
                        pictureUrl: profile.pictureUrl,
                    }),
                })
                const data = await res.json()
                if (data.success && data.member) {
                    setMember(data.member as Client)
                } else if (data.needsEmail) {
                    // New LINE user — needs email to link/create
                    setNeedsEmail(true)
                }
            } catch (err) {
                console.error("[Guest] Auth failed:", err)
                setNeedsEmail(true)
            }
            setMemberLoading(false)
        }
        lookupByLine()
    }, [ready, profile])

    // ─── Email submission (LINE user linking or web login) ───
    const handleEmailSubmit = useCallback(async (email: string) => {
        setEmailSubmitting(true)
        setEmailError(null)

        try {
            const body: Record<string, any> = { email }

            if (profile) {
                // LINE user — include LINE profile for linking
                body.lineUserId = profile.userId
                body.displayName = profile.displayName
                body.pictureUrl = profile.pictureUrl
            } else {
                // Web user
                body.mode = "web"
            }

            const res = await fetch("/api/auth/line", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })
            const data = await res.json()

            if (!res.ok) {
                setEmailError(data.error || "Something went wrong")
                setEmailSubmitting(false)
                return
            }

            if (data.success && data.member) {
                setMember(data.member as Client)
                setNeedsEmail(false)
            } else {
                setEmailError("Unexpected response")
            }
        } catch (err: any) {
            setEmailError(err.message || "Network error")
        }
        setEmailSubmitting(false)
    }, [profile])

    // Filter data for this member — memoized
    const memberVouchers = useMemo(() => vouchers.filter(v => v.status === "ISSUED"), [vouchers])
    const memberBookings = useMemo(() => bookings
        .filter(b => {
            if (!member) return false
            if (member.email && b.contact?.email?.toLowerCase() === member.email.toLowerCase()) return true
            if (b.contact?.name && member.name && b.contact.name.toLowerCase() === member.name.toLowerCase()) return true
            return false
        })
        .sort((a, b) => b.date.localeCompare(a.date)), [bookings, member])
    const activeTreatments = useMemo(() => treatments, [treatments])

    const handleLogout = () => {
        logout()
        setMember(null)
        setNeedsEmail(true)
        memberLookupDone.current = false
    }

    return (
        <GuestContext.Provider value={{
            profile, member, loading: loading && !needsEmail,
            vouchers: memberVouchers, bookings: memberBookings,
            treatments: activeTreatments,
            isRegistered: !!member, platform, theme, setTheme, logout: handleLogout,
        }}>
            <div
                className="min-h-screen font-sans relative overflow-x-hidden transition-colors duration-200"
                style={{
                    background: "var(--g-bg)", color: "var(--g-text)",
                    WebkitFontSmoothing: "antialiased",
                    textRendering: "optimizeLegibility",
                    WebkitTapHighlightColor: "transparent",
                } as any}
            >
                {theme === "dark" && (
                    <div className="fixed inset-0 z-0 pointer-events-none">
                        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[#D1C09B] rounded-full blur-[150px] opacity-[0.04]" />
                    </div>
                )}

                <div className="relative z-10 pb-20">
                    {/* Loading spinner */}
                    {loading && !needsEmail ? (
                        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                            <div className="text-xs uppercase tracking-[0.5em]" style={{ color: "var(--g-accent)" }}>
                                Sanctuary
                            </div>
                            <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
                                style={{ borderColor: "var(--g-accent)", borderTopColor: "transparent" }} />
                            <p className="text-[11px]" style={{ color: "var(--g-text-muted)" }}>Loading...</p>
                        </div>
                    ) : needsEmail && !member ? (
                        /* Email gate — for new LINE users & web users */
                        <EmailGate
                            onSubmit={handleEmailSubmit}
                            loading={emailSubmitting}
                            error={emailError}
                            platform={platform}
                            profile={profile}
                        />
                    ) : children}
                </div>

                {!loading && member && !needsEmail && <BottomNav />}
            </div>
        </GuestContext.Provider>
    )
}
