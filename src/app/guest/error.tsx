"use client"

import { useEffect } from "react"

export default function GuestError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("[Guest Error]", error)
    }, [error])

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6"
            style={{ background: "#0c0a09", color: "#e7e5e4" }}>
            <div className="w-full max-w-sm text-center space-y-6">
                <div className="text-[9px] uppercase tracking-[0.6em]" style={{ color: "#D1C09B" }}>
                    Sanctuary
                </div>
                <h1 className="text-2xl font-serif">Something went wrong</h1>
                <p className="text-sm" style={{ color: "#a8a29e" }}>
                    กรุณาลองใหม่อีกครั้ง
                </p>
                <button
                    onClick={reset}
                    className="px-6 py-3 rounded-xl text-sm font-bold"
                    style={{ background: "#D1C09B", color: "#1c1917" }}
                >
                    Try Again
                </button>
                <p className="text-[10px]" style={{ color: "#78716c" }}>
                    {error?.message || "Unknown error"}
                </p>
            </div>
        </div>
    )
}
