"use client"

import { useState, useEffect, useCallback, useRef } from "react"

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

// ─── Cache key for session storage ───────────
const PROFILE_CACHE_KEY = "yarey_liff_profile"
const PROFILE_CACHE_TTL = 15 * 60 * 1000 // 15 minutes

function getCachedProfile(): GuestProfile | null {
    try {
        const raw = sessionStorage.getItem(PROFILE_CACHE_KEY)
        if (!raw) return null
        const { profile, ts } = JSON.parse(raw)
        if (Date.now() - ts > PROFILE_CACHE_TTL) {
            sessionStorage.removeItem(PROFILE_CACHE_KEY)
            return null
        }
        return profile
    } catch { return null }
}

function setCachedProfile(profile: GuestProfile) {
    try {
        sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ profile, ts: Date.now() }))
    } catch { }
}

// Preload LIFF SDK as soon as this module loads (before React renders)
let liffPreloadPromise: Promise<any> | null = null
if (typeof window !== "undefined") {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID_GUEST || ""
    if (liffId) {
        // Kick off the dynamic import immediately — it starts downloading in parallel
        liffPreloadPromise = import("@line/liff")
    }
}

// ─── Main Hook ───────────────────────────────
export function useGuestAuth(): UseGuestAuthReturn {
    const [ready, setReady] = useState(false)
    const [profile, setProfile] = useState<GuestProfile | null>(null)
    const [platform, setPlatform] = useState<GuestPlatform>("web")
    const [isInApp, setIsInApp] = useState(false)
    const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme)
    const bootedRef = useRef(false)

    // Single useEffect — runs only on client
    useEffect(() => {
        if (bootedRef.current) return
        bootedRef.current = true

        let cancelled = false

        const boot = async () => {
            const liffId = process.env.NEXT_PUBLIC_LIFF_ID_GUEST || ""

            if (!liffId) {
                if (cancelled) return
                setPlatform("web")
                setReady(true)
                return
            }

            // ─── Fast path: use cached profile from sessionStorage ───
            const cached = getCachedProfile()
            if (cached) {
                if (cancelled) return
                setProfile(cached)
                setPlatform("line")
                setIsInApp(true)
                setReady(true)
                // Still init LIFF in background for API calls, but don't block render
                initLiffBackground(liffId)
                return
            }

            // ─── First load: full LIFF init ───
            try {
                // Use the preloaded promise to avoid a second import()
                const liffModule = liffPreloadPromise
                    ? await liffPreloadPromise
                    : await import("@line/liff")
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

                const guestProfile: GuestProfile = {
                    userId: p.userId,
                    displayName: p.displayName,
                    pictureUrl: p.pictureUrl,
                    platform: "line",
                }
                setProfile(guestProfile)
                setCachedProfile(guestProfile) // cache for subsequent navigations
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
        // Clear cached profile
        try { sessionStorage.removeItem(PROFILE_CACHE_KEY) } catch { }
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

// Background LIFF init — doesn't block UI
async function initLiffBackground(liffId: string) {
    try {
        const liffModule = liffPreloadPromise
            ? await liffPreloadPromise
            : await import("@line/liff")
        const liff = liffModule.default
        if (!liff.isInClient?.()) {
            await liff.init({ liffId })
        } else {
            // In LINE client, init may already be done — safe to call
            try { await liff.init({ liffId }) } catch { /* already init'd */ }
        }
    } catch (err) {
        console.warn("[Auth] Background LIFF init:", err)
    }
}
