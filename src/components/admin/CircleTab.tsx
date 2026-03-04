"use client"

import { useState } from "react"
import { Handshake, Package, PartyPopper, Megaphone } from "lucide-react"
import { Booking, Treatment, Salesman } from "@/types"
import { SuppliersSubTab } from "./circle/SuppliersSubTab"
import { PartnersSubTab } from "./circle/PartnersSubTab"
import { MediaSubTab } from "./circle/MediaSubTab"
import { EventsSubTab } from "./circle/EventsSubTab"

interface CircleTabProps {
    bookings: Booking[]
    expenses?: any[]
    treatments?: Treatment[]
    salesmen?: Salesman[]
}

const TABS = [
    { id: "partners" as const, label: "Partners", icon: Handshake, color: "text-emerald-400" },
    { id: "events" as const, label: "Events", icon: PartyPopper, color: "text-orange-400" },
    { id: "media" as const, label: "Media", icon: Megaphone, color: "text-purple-400" },
    { id: "suppliers" as const, label: "Suppliers", icon: Package, color: "text-blue-400" },
]

type SubTab = typeof TABS[number]["id"]

export const CircleTab = ({ bookings, expenses = [], treatments = [], salesmen = [] }: CircleTabProps) => {
    const [activeSubTab, setActiveSubTab] = useState<SubTab>("partners")

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="font-serif text-2xl text-foreground mb-1">Partnership Circle</h2>
                <p className="text-sm text-foreground/50">Manage events, partners, media, and suppliers.</p>
            </div>

            {/* Sub-Tab Navigation */}
            <div className="flex gap-1 bg-card/30 p-1 rounded-full border border-border/20 w-fit">
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveSubTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2 rounded-full text-[10px] uppercase font-bold tracking-widest transition-all ${activeSubTab === tab.id
                            ? "bg-primary text-[#051818] shadow-sm"
                            : "text-foreground/40 hover:text-foreground"
                            }`}>
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeSubTab === "suppliers" && <SuppliersSubTab expenses={expenses} />}

            {activeSubTab === "partners" && <PartnersSubTab bookings={bookings} expenses={expenses} />}

            {activeSubTab === "events" && <EventsSubTab bookings={bookings} expenses={expenses} salesmen={salesmen} />}

            {activeSubTab === "media" && <MediaSubTab bookings={bookings} expenses={expenses} treatments={treatments} />}
        </div>
    )
}
