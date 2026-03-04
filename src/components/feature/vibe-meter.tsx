import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useFirestoreCollection, useFirestoreDoc } from "@/hooks/useFirestore"
import { Activity, Users } from "lucide-react"

type VibeStatus = "Quiet" | "Moderate" | "Lively"

export function VibeMeter() {
    const { data: vibeStatus } = useFirestoreDoc<any>("settings", "vibe")
    const { data: vibeStats } = useFirestoreDoc<any>("settings", "vibe_stats")

    // Use stats from the secure public document
    const guestCount = vibeStats?.guestCount || 0
    const calculatedVibe = vibeStats?.calculatedVibe || "Quiet"

    // Manual override takes precedence, otherwise use calculated vibe
    const activeVibe = vibeStatus?.manualVibe || calculatedVibe


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
