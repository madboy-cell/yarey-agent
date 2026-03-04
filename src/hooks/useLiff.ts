"use client"

import { useState, useEffect } from "react"

interface LiffProfile {
    userId: string
    displayName: string
    pictureUrl?: string
    statusMessage?: string
}

interface UseLiffReturn {
    ready: boolean
    profile: LiffProfile | null
    isInClient: boolean
    error: string | null
    liff: any | null
}

/**
 * Custom hook for LINE LIFF integration.
 * Initializes LIFF SDK, handles login, and returns user profile.
 * 
 * In development (no LIFF ID), falls back to a mock profile
 * from localStorage for testing.
 */
export function useLiff(liffId?: string): UseLiffReturn {
    const [ready, setReady] = useState(false)
    const [profile, setProfile] = useState<LiffProfile | null>(null)
    const [isInClient, setIsInClient] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [liffModule, setLiffModule] = useState<any>(null)

    useEffect(() => {
        // Dev fallback: if no LIFF ID, use mock profile from localStorage
        if (!liffId) {
            console.log("[useLiff] No LIFF ID — using dev fallback")
            const stored = localStorage.getItem("yarey_liff_dev_profile")
            if (stored) {
                try {
                    setProfile(JSON.parse(stored))
                } catch { }
            }
            setReady(true)
            return
        }

        // Production: Initialize LIFF SDK
        const initLiff = async () => {
            try {
                const liff = (await import("@line/liff")).default
                await liff.init({ liffId })

                setLiffModule(liff)
                setIsInClient(liff.isInClient())

                if (!liff.isLoggedIn()) {
                    liff.login()
                    return
                }

                const p = await liff.getProfile()
                setProfile({
                    userId: p.userId,
                    displayName: p.displayName,
                    pictureUrl: p.pictureUrl,
                    statusMessage: p.statusMessage,
                })
                setReady(true)
            } catch (err: any) {
                console.error("[useLiff] Init failed:", err)
                setError(err.message || "LIFF init failed")
                setReady(true) // Still set ready so UI can show error
            }
        }

        initLiff()
    }, [liffId])

    return { ready, profile, isInClient, error, liff: liffModule }
}
