import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useFirestoreCollection, useFirestoreDoc } from "@/hooks/useFirestore"
import { Activity, Users } from "lucide-react"

type VibeStatus = "Quiet" | "Moderate" | "Lively"

export function VibeMeter() {
    const { data: bookings } = useFirestoreCollection<any>("bookings")
    const { data: vibeStatus } = useFirestoreDoc<any>("settings", "vibe")

    const [guestCount, setGuestCount] = useState(0)
    const [activeVibe, setActiveVibe] = useState<VibeStatus>("Quiet")

    useEffect(() => {
        const calculateVibe = () => {
            if (!bookings) return

            const now = new Date()
            const todayStr = now.toLocaleDateString("en-CA")
            const hour = now.getHours()

            // Determine current phase
            let phase = "Morning"
            if (hour >= 12 && hour < 17) phase = "Sun Peak"
            if (hour >= 17) phase = "Evening"

            const filtered = bookings.filter((b: any) => {
                const isToday = b.date === todayStr
                const isActive = b.status !== "Cancelled"

                // 1. Status Check (Active only)
                const isActiveStatus = ["Arrived", "In Ritual", "Checked In", "Started"].includes(b.status)

                // 2. Robust Time Parsing (Regex)
                // Matches 10:00, 10:00 AM, 10:00AM, 14:00
                const timeMatch = b.time?.match(/(\d+):(\d+)\s*(AM|PM)?/i)
                if (!timeMatch) return false

                let bHour = parseInt(timeMatch[1])
                const period = timeMatch[3]

                if (period) {
                    if (period.toUpperCase() === "PM" && bHour !== 12) bHour += 12
                    else if (period.toUpperCase() === "AM" && bHour === 12) bHour = 0
                }

                let bPhase = "Morning"
                if (bHour >= 12 && bHour < 17) bPhase = "Sun Peak"
                else if (bHour >= 17) bPhase = "Evening"

                return isToday && isActiveStatus && (bPhase === phase)
            })

            const count = filtered.reduce((acc: number, b: any) => acc + (Number(b.guests) || 1), 0)
            setGuestCount(count)

            if (vibeStatus?.manualVibe) {
                setActiveVibe(vibeStatus.manualVibe)
            } else {
                if (count > 8) setActiveVibe("Lively")
                else if (count > 3) setActiveVibe("Moderate")
                else setActiveVibe("Quiet")
            }
        }

        calculateVibe() // Initial Run
        const timer = setInterval(calculateVibe, 60000) // Update every minute
        return () => clearInterval(timer)
    }, [bookings, vibeStatus])

    const getVibeColor = (vibe: VibeStatus) => {
        switch (vibe) {
            case "Lively": return "text-orange-500"
            case "Moderate": return "text-primary"
            default: return "text-stone-400"
        }
    }

    const vibeColor = getVibeColor(activeVibe)

    return (
        <div className="glass-card px-4 py-2 rounded-full flex items-center gap-4 shadow-sm">
            <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${vibeColor.replace('text-', 'bg-')}`}></div>
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">Live</span>
            </div>

            <div className="w-px h-4 bg-border"></div>

            <motion.div
                key={activeVibe}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`text-[11px] font-serif italic ${vibeColor}`}
            >
                {activeVibe}
            </motion.div>

            <div className="w-px h-4 bg-border"></div>

            <div className="flex items-center gap-2">
                <Users className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-bold tracking-wide text-foreground">{guestCount}</span>
            </div>
        </div>
    )
}
