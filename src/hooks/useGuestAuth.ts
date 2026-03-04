"use client"

import { useState, useEffect, useCallback } from "react"

// ─── Types ───────────────────────────────────
export type GuestPlatform = "line" | "web"
export type ThemeMode = "dark" | "light"

export interface GuestProfile {
    userId: string
    displayName: string
    pictureUrl?: string
    platform: GuestPlatform
}

export interface UseGuestAuthReturn {
    ready: boolean
    profile: GuestProfile | null
    platform: GuestPlatform
    theme: ThemeMode
    setTheme: (t: ThemeMode) => void
    isInApp: boolean
    logout: () => void
}

// ─── Resolve initial theme synchronously ─────
function getInitialTheme(): ThemeMode {
    if (typeof window === "undefined") return "dark"
    try {
        const saved = localStorage.getItem("yarey_guest_theme")
        if (saved === "light" || saved === "dark") return saved
    } catch { }
    return "dark" // default to dark for LINE WebView
}

// ─── Main Hook ───────────────────────────────
export function useGuestAuth(): UseGuestAuthReturn {
    const [ready, setReady] = useState(false)
    const [profile, setProfile] = useState<GuestProfile | null>(null)
    const [platform, setPlatform] = useState<GuestPlatform>("web")
    const [isInApp, setIsInApp] = useState(false)
    const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme)

    // Single useEffect — runs only on client
    useEffect(() => {
        let cancelled = false

        const boot = async () => {
            const liffId = process.env.NEXT_PUBLIC_LIFF_ID_GUEST || ""

            if (!liffId) {
                if (cancelled) return
                setPlatform("web")
                setReady(true)
                return
            }

            try {
                const liffModule = await import("@line/liff")
                const liff = liffModule.default
                await liff.init({ liffId })

                if (cancelled) return

                const inClient = liff.isInClient()
                setIsInApp(inClient)
                setPlatform("line")

                if (!liff.isLoggedIn()) {
                    liff.login()
                    return
                }

                const p = await liff.getProfile()
                if (cancelled) return

                setProfile({
                    userId: p.userId,
                    displayName: p.displayName,
                    pictureUrl: p.pictureUrl,
                    platform: "line",
                })
            } catch (err) {
                console.error("[Auth] LIFF init failed:", err)
                setPlatform("web")
            }

            if (!cancelled) setReady(true)
        }

        boot()
        return () => { cancelled = true }
    }, [])

    const setTheme = useCallback((t: ThemeMode) => {
        setThemeState(t)
        if (typeof window !== "undefined") {
            localStorage.setItem("yarey_guest_theme", t)
        }
    }, [])

    const logout = useCallback(async () => {
        try {
            const liffModule = await import("@line/liff")
            const liff = liffModule.default
            if (liff.isLoggedIn()) {
                liff.logout()
            }
        } catch { }
        setProfile(null)
        if (typeof window !== "undefined") {
            window.location.reload()
        }
    }, [])

    return {
        ready,
        profile,
        platform,
        theme,
        setTheme,
        isInApp,
        logout,
    }
}
