import React from 'react'
import { Clock } from "lucide-react"

interface TimeSlotPickerProps {
    selectedTime: string
    onSelect: (time: string) => void
}

export function TimeSlotPicker({ selectedTime, onSelect }: TimeSlotPickerProps) {
    // Generate slots for the next 12 hours
    const slots = []
    const startHour = 10 // 10 AM
    const endHour = 22 // 10 PM

    for (let h = startHour; h < endHour; h++) {
        slots.push(`${h}:00`)
        slots.push(`${h}:30`)
    }

    return (
        <div className="border-t border-border/20 bg-white/50 backdrop-blur-md p-4 flex items-center gap-4 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 text-foreground/40 pr-4 border-r border-border/20">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] uppercase font-bold tracking-widest whitespace-nowrap">Start Time</span>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => onSelect("Now")}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${selectedTime === "Now" ? "bg-primary text-white shadow-lg" : "bg-white border border-border text-foreground/60 hover:border-primary/50"}`}
                >
                    Now
                </button>
                {slots.map(time => (
                    <button
                        key={time}
                        onClick={() => onSelect(time)}
                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${selectedTime === time ? "bg-primary text-white shadow-lg" : "bg-white border border-border text-foreground/60 hover:border-primary/50"}`}
                    >
                        {time}
                    </button>
                ))}
            </div>
        </div>
    )
}
