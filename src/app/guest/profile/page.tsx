"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Star, Mail, Phone, Calendar, User, Sun, Moon, Sparkles, Shield, ChevronRight, LogOut, Award, Crown, Unlink, Link2, Loader2 } from "lucide-react"
import { useGuest } from "../layout"
import { determineTier, TIERS } from "@/lib/loyalty"

// ─── Tier Visual System ─────────────────────────
const tierVisual: Record<string, {
    gradient: string; glow: string; accent: string; text: string;
    icon: string; ring: string; desc: string;
}> = {
    Seeker: {
        gradient: "linear-gradient(135deg, #1a2f2f 0%, #0d1e1e 100%)",
        glow: "rgba(139,157,160,0.08)", accent: "#8B9DA0", text: "#c5d0d2",
        icon: "🌱", ring: "rgba(139,157,160,0.3)",
        desc: "Begin your wellness journey",
    },
    Initiate: {
        gradient: "linear-gradient(135deg, #5D4037 0%, #3E2723 100%)",
        glow: "rgba(212,167,106,0.15)", accent: "#D4A76A", text: "#f2e2d5",
        icon: "🔥", ring: "rgba(212,167,106,0.4)",
        desc: "Your path deepens",
    },
    Devotee: {
        gradient: "linear-gradient(135deg, #bdc3c7 0%, #8997a1 100%)",
        glow: "rgba(255,255,255,0.12)", accent: "#ffffff", text: "#1a1a1a",
        icon: "✦", ring: "rgba(255,255,255,0.5)",
        desc: "Silver sanctuary member",
    },
    Alchemist: {
        gradient: "linear-gradient(135deg, #FFD700 0%, #B8860B 100%)",
        glow: "rgba(255,215,0,0.20)", accent: "#FFF8DC", text: "#3E2723",
        icon: "⚗️", ring: "rgba(255,215,0,0.5)",
        desc: "Master of transformation",
    },
    Guardian: {
        gradient: "linear-gradient(135deg, #7c3aed 0%, #1e1b4b 100%)",
        glow: "rgba(168,85,247,0.20)", accent: "#c084fc", text: "#e9d5ff",
        icon: "👑", ring: "rgba(192,132,252,0.5)",
        desc: "Sanctuary's highest honor",
    },
}

export default function GuestProfile() {
    const { profile, member, bookings, vouchers, theme, setTheme, platform, logout } = useGuest()
    // Note: registerGuest removed — LINE auto-registers
    const [showTierDetail, setShowTierDetail] = useState(false)

    // ─── ALL hooks MUST be before any early return ───
    const [whoopStatus, setWhoopStatus] = useState<"checking" | "connected" | "not_connected">("checking")
    const [disconnecting, setDisconnecting] = useState(false)
    const whoopConnectUrl = `/api/whoop/auth?memberId=${encodeURIComponent(member?.id || "")}&platform=${encodeURIComponent(platform)}`

    useEffect(() => {
        if (!member?.id) { setWhoopStatus("not_connected"); return }
        ; (async () => {
            try {
                const res = await fetch(`/api/whoop/status?sessionId=${encodeURIComponent(member.id)}`)
                const data = await res.json()
                setWhoopStatus(data.connected ? "connected" : "not_connected")
            } catch {
                setWhoopStatus("not_connected")
            }
        })()
    }, [member?.id])

    const handleWhoopDisconnect = useCallback(async () => {
        if (!confirm("ยกเลิกการเชื่อมต่อ WHOOP?\nDisconnect WHOOP?")) return
        setDisconnecting(true)
        try {
            const res = await fetch("/api/whoop/disconnect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberId: member?.id }),
            })
            const data = await res.json()
            if (data.success) {
                setWhoopStatus("not_connected")
                localStorage.removeItem("yarey_whoop_history")
                localStorage.removeItem("yarey_whoop_baseline")
            }
        } catch { }
        setDisconnecting(false)
    }, [member?.id])

    const handleWhoopConnect = useCallback(async () => {
        const url = `${window.location.origin}${whoopConnectUrl}`
        if (platform === "line") {
            try {
                const liff = (await import("@line/liff")).default
                if (liff.isInClient()) {
                    liff.openWindow({ url, external: true })
                    return
                }
            } catch { /* fallback below */ }
        }
        window.location.href = whoopConnectUrl
    }, [whoopConnectUrl, platform])

    if (!member) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-sm" style={{ color: "var(--g-text-muted)" }}>Not logged in</p>
            </div>
        )
    }

    const totalSpend = member.totalSpend || 0
    const tierName = determineTier(totalSpend)
    const tierIdx = TIERS.findIndex(t => t.name === tierName)
    const nextTier = TIERS[tierIdx + 1]
    const tv = tierVisual[tierName] || tierVisual.Seeker
    const completed = bookings.filter(b => b.status === "Complete")

    // Progress to next tier
    let progressPercent = 100
    let spendToNext = 0
    if (nextTier) {
        const base = TIERS[tierIdx].spend
        const range = nextTier.spend - base
        progressPercent = range > 0 ? Math.min(100, ((totalSpend - base) / range) * 100) : 0
        spendToNext = nextTier.spend - totalSpend
    }

    // Member since
    const memberSince = member.joinedDate
        ? new Date(member.joinedDate).toLocaleDateString("th-TH", { month: "long", year: "numeric" })
        : null

    // Birthday countdown
    let birthdayText = ""
    if (member.birthday) {
        const bday = new Date(member.birthday)
        const now = new Date()
        const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate())
        if (thisYear < now) thisYear.setFullYear(now.getFullYear() + 1)
        const daysLeft = Math.ceil((thisYear.getTime() - now.getTime()) / 86400000)
        birthdayText = daysLeft === 0 ? "🎂 Today!" : daysLeft <= 30 ? `🎂 ${daysLeft} days` : ""
    }

    return (
        <div className="pb-24">
            {/* ═══ Hero Header — No sticky bar, full immersive ═══ */}
            <div
                className="relative overflow-hidden pt-12 pb-8 px-5"
                style={{ background: tv.gradient }}
            >
                {/* Decorative orbs */}
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-[0.06]" style={{ background: tv.accent, filter: "blur(60px)" }} />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full opacity-[0.04]" style={{ background: tv.accent, filter: "blur(40px)" }} />

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-md mx-auto text-center relative z-10"
                >
                    {/* Avatar with tier ring */}
                    <div className="relative w-24 h-24 mx-auto mb-4">
                        <div
                            className="absolute inset-0 rounded-full animate-pulse"
                            style={{ background: `conic-gradient(${tv.accent}, transparent, ${tv.accent})`, opacity: 0.3 }}
                        />
                        <div className="absolute inset-[3px] rounded-full" style={{ background: tv.gradient }} />
                        {profile?.pictureUrl ? (
                            <img
                                src={profile.pictureUrl} alt=""
                                className="absolute inset-[4px] rounded-full object-cover"
                                style={{ border: `2px solid ${tv.ring}` }}
                            />
                        ) : (
                            <div className="absolute inset-[4px] rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)" }}>
                                <User className="w-10 h-10" style={{ color: tv.accent, opacity: 0.6 }} />
                            </div>
                        )}
                        {/* Tier badge */}
                        <div
                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap"
                            style={{
                                background: tv.accent,
                                color: tv.gradient.includes("#bdc3c7") || tv.gradient.includes("#FFD700") ? "#1a1a1a" : "#fff",
                                boxShadow: `0 2px 12px ${tv.glow}`,
                            }}
                        >
                            {tv.icon} {tierName}
                        </div>
                    </div>

                    {/* Name */}
                    <h1 className="text-2xl font-serif mb-1" style={{ color: tv.text }}>{member.name}</h1>
                    <p className="text-[11px] mb-4" style={{ color: tv.text, opacity: 0.5 }}>{tv.desc}</p>

                    {/* Platform badge */}
                    {platform !== "web" && (
                        <div className="text-[8px] uppercase tracking-widest px-2.5 py-1 rounded-full inline-flex items-center gap-1"
                            style={{ background: "rgba(255,255,255,0.08)", color: tv.text, opacity: 0.6 }}>
                            <Shield className="w-2.5 h-2.5" />
                            {platform === "line" ? "LINE connected" : "Telegram connected"}
                        </div>
                    )}

                    {/* Tier progress bar */}
                    {nextTier && (
                        <div className="mt-5 px-4">
                            <div className="flex justify-between mb-1.5">
                                <span className="text-[8px] uppercase tracking-wider font-bold" style={{ color: tv.text, opacity: 0.4 }}>
                                    Next: {nextTier.name}
                                </span>
                                <span className="text-[8px] font-mono" style={{ color: tv.accent }}>
                                    ฿{spendToNext.toLocaleString()} to go
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.3)" }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                    transition={{ duration: 1.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                    className="h-full rounded-full"
                                    style={{ background: tv.accent }}
                                />
                            </div>
                            <div className="text-right mt-1">
                                <span className="text-[8px] font-mono" style={{ color: tv.text, opacity: 0.3 }}>
                                    {Math.round(progressPercent)}%
                                </span>
                            </div>
                        </div>
                    )}
                    {!nextTier && (
                        <div className="mt-4 text-[10px] tracking-wider" style={{ color: tv.accent }}>
                            ✦ Highest Tier Achieved
                        </div>
                    )}
                </motion.div>
            </div>

            {/* ═══ Main Content ═══ */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="max-w-md mx-auto px-5 -mt-3 space-y-4 relative z-20"
            >
                {/* ═══ Stats Row — 4 compact cards ═══ */}
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { v: completed.length, l: "Visits", icon: "📅" },
                        { v: `฿${(totalSpend / 1000).toFixed(0)}k`, l: "Spend", icon: "💰" },
                        { v: vouchers.length, l: "Vouchers", icon: "🎫" },
                        { v: `${tierIdx + 1}/${TIERS.length}`, l: "Tier", icon: "⭐" },
                    ].map(s => (
                        <div key={s.l} className="rounded-xl py-3 text-center"
                            style={{ background: "var(--g-surface)", border: "1px solid var(--g-border)", boxShadow: "var(--g-card-shadow)" }}>
                            <div className="text-xs mb-0.5">{s.icon}</div>
                            <div className="text-sm font-mono font-bold" style={{ color: "var(--g-text)" }}>{s.v}</div>
                            <div className="text-[7px] uppercase tracking-wider" style={{ color: "var(--g-text-muted)" }}>{s.l}</div>
                        </div>
                    ))}
                </div>

                {/* ═══ Personal Details ═══ */}
                <div>
                    <div className="text-[9px] uppercase tracking-widest font-bold mb-2 px-1" style={{ color: "var(--g-text-muted)" }}>
                        ข้อมูลส่วนตัว · Details
                    </div>
                    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--g-surface)", border: "1px solid var(--g-border)" }}>
                        {[
                            member.email && { icon: Mail, label: "อีเมล · Email", value: member.email },
                            member.phone && { icon: Phone, label: "โทรศัพท์ · Phone", value: member.phone },
                            member.birthday && { icon: Calendar, label: "วันเกิด · Birthday", value: member.birthday, badge: birthdayText },
                            memberSince && { icon: Award, label: "สมาชิกตั้งแต่ · Since", value: memberSince },
                        ].filter(Boolean).map((d: any, i, arr) => (
                            <div key={d.label} className="flex items-center gap-3 px-4 py-3.5"
                                style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--g-border)" : "none" }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: "var(--g-bg)" }}>
                                    <d.icon className="w-3.5 h-3.5" style={{ color: "var(--g-accent)" }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--g-text-muted)" }}>{d.label}</div>
                                    <div className="text-[13px] truncate" style={{ color: "var(--g-text)" }}>{d.value}</div>
                                </div>
                                {d.badge && (
                                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                                        style={{ background: "rgba(244,114,182,0.1)", color: "#f472b6" }}>
                                        {d.badge}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ═══ Tier Journey ═══ */}
                <div>
                    <button
                        onClick={() => setShowTierDetail(!showTierDetail)}
                        className="w-full flex items-center justify-between mb-2 px-1 active:opacity-70 transition-opacity"
                    >
                        <div className="text-[9px] uppercase tracking-widest font-bold" style={{ color: "var(--g-text-muted)" }}>
                            ระดับสมาชิก · Tiers
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 transition-transform" style={{
                            color: "var(--g-text-muted)",
                            transform: showTierDetail ? "rotate(90deg)" : "rotate(0deg)",
                        }} />
                    </button>

                    <AnimatePresence>
                        {showTierDetail && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                            >
                                <div className="space-y-1.5">
                                    {TIERS.map((t, i) => {
                                        const isActive = t.name === tierName
                                        const isUnlocked = tierIdx >= i
                                        const tv2 = tierVisual[t.name] || tierVisual.Seeker
                                        return (
                                            <div
                                                key={t.name}
                                                className="rounded-xl px-4 py-3 relative overflow-hidden transition-all"
                                                style={{
                                                    background: isActive ? tv2.gradient : "var(--g-surface)",
                                                    border: isActive ? "1px solid transparent" : "1px solid var(--g-border)",
                                                    opacity: isUnlocked ? 1 : 0.3,
                                                    boxShadow: isActive ? `0 4px 20px ${tv2.glow}` : "none",
                                                }}
                                            >
                                                {isActive && (
                                                    <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-[0.05]"
                                                        style={{ background: tv2.accent }} />
                                                )}
                                                <div className="flex justify-between items-center relative z-10">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-base">{tv2.icon}</span>
                                                        <div>
                                                            <span className="text-sm font-bold"
                                                                style={{ color: isActive ? tv2.text : "var(--g-text-secondary)" }}>
                                                                {t.name}
                                                            </span>
                                                            {isActive && (
                                                                <div className="text-[8px] tracking-wider"
                                                                    style={{ color: tv2.accent, opacity: 0.7 }}>
                                                                    Current tier
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] font-mono"
                                                            style={{ color: isActive ? tv2.text : "var(--g-text-muted)", opacity: isActive ? 0.8 : 1 }}>
                                                            {t.spend === 0 ? "Free" : `฿${t.spend.toLocaleString()}`}
                                                        </span>
                                                        {isUnlocked && !isActive && (
                                                            <div className="text-[7px]" style={{ color: "var(--g-success)" }}>✓ Unlocked</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ═══ Settings ═══ */}
                <div>
                    <div className="text-[9px] uppercase tracking-widest font-bold mb-2 px-1" style={{ color: "var(--g-text-muted)" }}>
                        ตั้งค่า · Settings
                    </div>
                    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--g-surface)", border: "1px solid var(--g-border)" }}>
                        {/* Theme toggle */}
                        <button
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="w-full flex items-center justify-between px-4 py-3.5 active:scale-[0.99] transition-transform"
                            style={{ borderBottom: platform === "web" ? "1px solid var(--g-border)" : "none" }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--g-bg)" }}>
                                    {theme === "dark"
                                        ? <Moon className="w-3.5 h-3.5" style={{ color: "#818cf8" }} />
                                        : <Sun className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
                                    }
                                </div>
                                <div className="text-left">
                                    <div className="text-[13px]">ธีม · Theme</div>
                                    <div className="text-[9px]" style={{ color: "var(--g-text-muted)" }}>
                                        {theme === "dark" ? "Dark mode" : "Light mode"}
                                    </div>
                                </div>
                            </div>
                            <div className="w-10 h-5 rounded-full relative transition-colors" style={{
                                background: theme === "dark" ? "rgba(129,140,248,0.3)" : "rgba(251,191,36,0.3)",
                            }}>
                                <motion.div
                                    animate={{ x: theme === "dark" ? 20 : 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full"
                                    style={{
                                        background: theme === "dark" ? "#818cf8" : "#fbbf24",
                                        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                                    }}
                                />
                            </div>
                        </button>

                        {/* WHOOP Connection */}
                        {whoopStatus === "checking" ? (
                            <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: platform === "web" ? "1px solid var(--g-border)" : "none" }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--g-bg)" }}>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--g-text-muted)" }} />
                                </div>
                                <div className="text-[13px]" style={{ color: "var(--g-text-muted)" }}>Checking WHOOP...</div>
                            </div>
                        ) : whoopStatus === "connected" ? (
                            <button
                                onClick={handleWhoopDisconnect}
                                disabled={disconnecting}
                                className="w-full flex items-center justify-between px-4 py-3.5 active:scale-[0.99] transition-transform disabled:opacity-50"
                                style={{ borderBottom: platform === "web" ? "1px solid var(--g-border)" : "none" }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(52,211,153,0.08)" }}>
                                        <Unlink className="w-3.5 h-3.5" style={{ color: "#34d399" }} />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-[13px]">WHOOP</div>
                                        <div className="text-[9px]" style={{ color: "#34d399" }}>
                                            {disconnecting ? "Disconnecting..." : "✓ Connected"}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--g-text-muted)" }}>Disconnect</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleWhoopConnect}
                                className="w-full flex items-center justify-between px-4 py-3.5 active:scale-[0.99] transition-transform"
                                style={{ borderBottom: platform === "web" ? "1px solid var(--g-border)" : "none" }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(251,146,60,0.08)" }}>
                                        <Link2 className="w-3.5 h-3.5" style={{ color: "#fb923c" }} />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-[13px]">WHOOP</div>
                                        <div className="text-[9px]" style={{ color: "#fb923c" }}>Not connected</div>
                                    </div>
                                </div>
                                <span className="text-[9px] uppercase tracking-wider" style={{ color: "#fb923c" }}>Connect →</span>
                            </button>
                        )}

                        {/* Logout */}
                        {platform === "web" && (
                            <button
                                onClick={logout}
                                className="w-full flex items-center gap-3 px-4 py-3.5 active:scale-[0.99] transition-transform"
                            >
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.06)" }}>
                                    <LogOut className="w-3.5 h-3.5" style={{ color: "var(--g-danger)" }} />
                                </div>
                                <span className="text-[13px]" style={{ color: "var(--g-danger)" }}>ออกจากระบบ · Sign Out</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* ═══ Footer ═══ */}
                <div className="text-center pt-4 pb-2">
                    <div className="text-[8px] uppercase tracking-[0.3em]" style={{ color: "var(--g-text-muted)", opacity: 0.5 }}>
                        Yarey Sanctuary
                    </div>
                    <div className="text-[7px] mt-0.5" style={{ color: "var(--g-text-muted)", opacity: 0.3 }}>
                        v9.0 · Biometric Intelligence
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
