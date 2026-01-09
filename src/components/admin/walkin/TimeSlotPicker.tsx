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
        <div className="border-t border-white/5 bg-[#051818]/80 backdrop-blur-md p-4 flex items-center gap-4 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 text-gray-500 pr-4 border-r border-white/10">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] uppercase font-bold tracking-widest whitespace-nowrap">Start Time</span>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => onSelect("Now")}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${selectedTime === "Now" ? "bg-[#D1C09B] text-[#051818] shadow-[0_0_15px_rgba(209,192,155,0.3)] scale-105" : "bg-[#0c2627] border border-white/10 text-gray-400 hover:border-[#D1C09B]/50 hover:text-white"}`}
                >
                    Now
                </button>
                {slots.map(time => (
                    <button
                        key={time}
                        onClick={() => onSelect(time)}
                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${selectedTime === time ? "bg-[#D1C09B] text-[#051818] shadow-[0_0_15px_rgba(209,192,155,0.3)] scale-105" : "bg-[#0c2627] border border-white/10 text-gray-400 hover:border-[#D1C09B]/50 hover:text-white"}`}
                    >
                        {time}
                    </button>
                ))}
            </div>
        </div>
    )
}
