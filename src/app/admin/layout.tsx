"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [isAuthorized, setIsAuthorized] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Allow access to login page without check
        if (pathname === "/admin/login") {
            setIsAuthorized(true)
            setLoading(false)
            return
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setIsAuthorized(true)
            } else {
                setIsAuthorized(false)
                router.replace("/admin/login")
            }
            setLoading(false)
        })

        return () => unsubscribe()
    }, [pathname, router])

    if (loading) {
        return <div className="min-h-screen bg-[#051818] flex items-center justify-center text-[#D1C09B] font-serif animate-pulse">Verifying Identity...</div>
    }

    // Prevent flashing protected content
    if (!isAuthorized && pathname !== "/admin/login") {
        return null
    }

    return (
        <>
            {children}
        </>
    )
}
