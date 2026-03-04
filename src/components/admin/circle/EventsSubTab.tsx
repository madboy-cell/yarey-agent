"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createPortal } from "react-dom"
import {
    PartyPopper, Plus, Search, Phone, Mail, X, Trash2, Calendar, Clock,
    DollarSign, TrendingUp, Ban, Repeat, Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirestoreCollection, useFirestoreCRUD } from "@/hooks/useFirestore"
import { orderBy } from "firebase/firestore"
import { CircleEvent, Booking, Salesman } from "@/types"

type Event = CircleEvent

const STATUS_CONFIG: Record<Event["status"], { label: string, emoji: string, color: string, bg: string }> = {
    draft: { label: "Draft", emoji: "📝", color: "text-foreground/40", bg: "bg-card/50 border-border/20" },
    confirmed: { label: "Confirmed", emoji: "✅", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    completed: { label: "Completed", emoji: "🎉", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
    cancelled: { label: "Cancelled", emoji: "❌", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
}

const BLOCK_LABELS: Record<Event["blockType"], string> = {
    whole_day: "Whole Day", morning: "Morning", sun_peak: "Sun Peak", evening: "Evening", none: "No Blocking",
}

interface Props {
    bookings: Booking[]
    expenses: any[]
    salesmen: Salesman[]
}

export const EventsSubTab = ({ bookings, expenses, salesmen }: Props) => {
    const { data: events } = useFirestoreCollection<Event>("circle_events", [orderBy("createdAt", "desc")])
    const eventOps = useFirestoreCRUD("circle_events")
    const blockOps = useFirestoreCRUD("blocks")
    const expenseOps = useFirestoreCRUD("expenses")

    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<Event["status"] | "all">("all")
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<Event | null>(null)
    const [selected, setSelected] = useState<Event | null>(null)

    const thisMonth = new Date().toISOString().slice(0, 7)
    const today = new Date().toISOString().slice(0, 10)

    // Filter
    const filtered = useMemo(() => events
        .filter(e => statusFilter === "all" || e.status === statusFilter)
        .filter(e => !searchTerm || e.title.toLowerCase().includes(searchTerm.toLowerCase()) || e.hostName.toLowerCase().includes(searchTerm.toLowerCase()))
        , [events, searchTerm, statusFilter])

    // Stats
    const upcomingCount = useMemo(() => events.filter(e => e.status === "confirmed" && e.dates.some(d => d >= today)).length, [events, today])
    const monthRevenue = useMemo(() => events.filter(e => e.status === "completed" && e.financialType === "we_earn" && e.dates.some(d => d.startsWith(thisMonth)))
        .reduce((s, e) => s + (e.perHeadPricing ? e.amount * (e.actualAttendance || e.expectedGuests) : e.amount), 0), [events, thisMonth])
    const monthCost = useMemo(() => events.filter(e => e.status === "completed" && e.financialType === "we_pay" && e.dates.some(d => d.startsWith(thisMonth)))
        .reduce((s, e) => s + e.amount, 0), [events, thisMonth])

    // --- Handlers ---
    const handleSave = async (data: Partial<Event>) => {
        if (editing?.id) {
            await eventOps.update(editing.id, data)
        } else {
            await eventOps.add({ ...data, createdAt: new Date().toISOString() })
        }
        setShowForm(false); setEditing(null)
    }

    const handleConfirm = async (event: Event) => {
        await eventOps.update(event.id, { status: "confirmed" })
        // Create schedule blocks
        if (event.blockType !== "none") {
            for (const date of event.dates) {
                const timeLabel = event.blockType === "whole_day" ? "All Day" :
                    event.blockType === "morning" ? "10:00" :
                        event.blockType === "sun_peak" ? "14:00" : "18:00"
                await blockOps.add({
                    date, time: timeLabel,
                    reason: `🎪 Event: ${event.title} (${event.hostName})`,
                })
            }
        }
        // Commit cost as expense immediately on confirmation
        if (event.financialType === "we_pay") {
            const monthStr = (event.dates[0] || new Date().toISOString()).slice(0, 7)
            await expenseOps.add({
                month: monthStr, title: `Event: ${event.title}`, amount: event.amount, category: "Events",
            })
        }
        setSelected({ ...event, status: "confirmed" })
    }

    const handleComplete = async (event: Event, actualAttendance: number) => {
        await eventOps.update(event.id, { status: "completed", actualAttendance })
        // Expense already created at confirmation — no duplication
        setSelected({ ...event, status: "completed", actualAttendance })
    }

    const handleCancel = async (event: Event) => {
        if (!confirm("Cancel this event?")) return
        await eventOps.update(event.id, { status: "cancelled" })
        setSelected({ ...event, status: "cancelled" })
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this event?")) return
        await eventOps.remove(id)
        setSelected(null)
    }

    // Recurring date generator
    const generateDates = (rule: Event["recurringRule"], startDate: string, weeks: number = 4): string[] => {
        if (!rule) return [startDate]
        const dates: string[] = []
        const start = new Date(startDate)
        for (let i = 0; i < weeks; i++) {
            const d = new Date(start)
            if (rule.frequency === "weekly") d.setDate(d.getDate() + i * 7)
            else if (rule.frequency === "biweekly") d.setDate(d.getDate() + i * 14)
            else if (rule.frequency === "monthly") d.setMonth(d.getMonth() + i)
            dates.push(d.toISOString().slice(0, 10))
        }
        return dates
    }

    // Auto-complete past confirmed events
    const autoCompletedRef = useRef<Set<string>>(new Set())
    useEffect(() => {
        if (events.length === 0) return
        const now = new Date().toISOString().slice(0, 10)

        events.forEach(async (ev) => {
            // Skip if already processed, not confirmed, or has future dates
            if (ev.status !== "confirmed") return
            if (autoCompletedRef.current.has(ev.id)) return
            const allDatesPast = ev.dates.every(d => d < now)
            if (!allDatesPast) return

            autoCompletedRef.current.add(ev.id)
            console.log(`[Events] Auto-completing past event: ${ev.title}`)

            // Mark as completed with expected guests as actual attendance
            // Expense already created at confirmation — no duplication
            await eventOps.update(ev.id, {
                status: "completed",
                actualAttendance: ev.expectedGuests,
            })
        })
    }, [events])

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="font-serif text-xl text-foreground mb-1">Events</h3>
                    <p className="text-sm text-foreground/50">{upcomingCount} upcoming · ฿{monthRevenue.toLocaleString()} earned this month</p>
                </div>
                <Button onClick={() => { setEditing(null); setShowForm(true) }} size="sm"
                    className="h-9 rounded-xl bg-primary text-background hover:bg-primary/90 text-[10px] font-bold uppercase tracking-wider gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Create Event
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Upcoming", value: upcomingCount, icon: Calendar, color: "text-blue-400", bg: "bg-blue-500/10" },
                    { label: "Earned", value: `฿${monthRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
                    { label: "Event Cost", value: `฿${monthCost.toLocaleString()}`, icon: DollarSign, color: "text-red-400", bg: "bg-red-500/10" },
                    { label: "Total Events", value: events.filter(e => e.status !== "cancelled").length, icon: PartyPopper, color: "text-orange-400", bg: "bg-orange-500/10" },
                ].map(s => (
                    <div key={s.label} className="bg-card/50 backdrop-blur-sm p-4 rounded-2xl border border-border/30">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center ${s.color}`}><s.icon className="w-5 h-5" /></div>
                            <div><div className="text-xl font-serif text-foreground">{s.value}</div><div className="text-[9px] uppercase tracking-widest text-foreground/40 font-bold">{s.label}</div></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Status Filter */}
            <div className="flex flex-wrap gap-1">
                {[{ id: "all" as const, label: "All", count: events.length }, ...Object.entries(STATUS_CONFIG).map(([id, c]) => ({
                    id: id as Event["status"], label: `${c.emoji} ${c.label}`, count: events.filter(e => e.status === id).length
                }))].map(tab => (
                    <button key={tab.id} onClick={() => setStatusFilter(tab.id)}
                        className={`px-4 py-2 rounded-full text-[10px] uppercase font-bold tracking-widest transition-all ${statusFilter === tab.id ? "bg-primary text-[#051818] shadow-sm" : "text-foreground/40 hover:text-foreground"}`}>
                        {tab.label} ({tab.count})
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                <input type="text" placeholder="Search by title or host..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-card/30 border border-border/30 rounded-xl py-3 pl-12 pr-4 text-foreground placeholder-foreground/20 focus:outline-none focus:border-primary/50 text-sm" />
            </div>

            {/* Event Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(e => {
                    const sc = STATUS_CONFIG[e.status]
                    const nextDate = e.dates.find(d => d >= today) || e.dates[e.dates.length - 1]
                    const amount = e.perHeadPricing ? e.amount * (e.actualAttendance || e.expectedGuests) : e.amount
                    return (
                        <div key={e.id} onClick={() => setSelected(e)} className="bg-card/30 border border-border/20 rounded-2xl p-5 cursor-pointer hover:border-primary/30 transition-all group">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="font-serif text-base text-foreground group-hover:text-primary transition-colors">{e.title}</div>
                                    <div className="text-[10px] text-foreground/30 mt-0.5">by {e.hostName}</div>
                                </div>
                                <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-lg border ${sc.bg}`}>{sc.emoji} {sc.label}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                                <span className="text-[10px] bg-card/50 text-foreground/40 px-2 py-1 rounded-md flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {nextDate ? new Date(nextDate).toLocaleDateString() : "—"}
                                </span>
                                <span className="text-[10px] bg-card/50 text-foreground/40 px-2 py-1 rounded-md flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {e.startTime || "—"} → {e.endTime || "—"} · {BLOCK_LABELS[e.blockType]}
                                </span>
                                {e.eventType === "recurring" && (
                                    <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-1 rounded-md flex items-center gap-1">
                                        <Repeat className="w-3 h-3" /> {e.recurringRule?.frequency}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-4 pt-3 border-t border-border/10 text-xs">
                                <div><div className="text-[9px] text-foreground/30 uppercase">Capacity</div><div className="text-foreground/60">{e.expectedGuests}/{e.maxCapacity}</div></div>
                                <div><div className="text-[9px] text-foreground/30 uppercase">{e.financialType === "we_earn" ? "Revenue" : "Cost"}</div><div className={`font-mono ${e.financialType === "we_earn" ? "text-primary" : "text-red-400"}`}>฿{amount.toLocaleString()}{e.perHeadPricing ? "/head" : ""}</div></div>
                                {e.dates.length > 1 && <div><div className="text-[9px] text-foreground/30 uppercase">Dates</div><div className="text-foreground/60">{e.dates.length} occurrences</div></div>}
                            </div>
                        </div>
                    )
                })}
                {filtered.length === 0 && <div className="col-span-full text-center py-12 text-foreground/30 italic text-sm">No events yet.</div>}
            </div>

            {/* Detail — rendered via portal */}
            {selected && typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    <EventDetail event={selected} salesmen={salesmen} onClose={() => setSelected(null)}
                        onEdit={() => { setEditing(selected); setShowForm(true); setSelected(null) }}
                        onConfirm={() => handleConfirm(selected)} onComplete={att => handleComplete(selected, att)}
                        onCancel={() => handleCancel(selected)} onDelete={() => handleDelete(selected.id)} />
                </AnimatePresence>,
                document.body
            )}

            {/* Form */}
            <AnimatePresence>
                {showForm && <EventForm event={editing} salesmen={salesmen} generateDates={generateDates} onSave={handleSave} onClose={() => { setShowForm(false); setEditing(null) }} />}
            </AnimatePresence>
        </div>
    )
}

// ── Detail Panel ──
const EventDetail = ({ event, salesmen, onClose, onEdit, onConfirm, onComplete, onCancel, onDelete }: {
    event: Event, salesmen: Salesman[], onClose: () => void, onEdit: () => void
    onConfirm: () => void, onComplete: (att: number) => void, onCancel: () => void, onDelete: () => void
}) => {
    const sc = STATUS_CONFIG[event.status]
    const [attendance, setAttendance] = useState(event.actualAttendance || event.expectedGuests)
    const today = new Date().toISOString().slice(0, 10)
    const amount = event.perHeadPricing ? event.amount * (event.actualAttendance || event.expectedGuests) : event.amount

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-stretch justify-end" onClick={onClose}>
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 250 }}
                className="w-full max-w-md h-screen bg-background border-l border-border/30 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex-1 min-h-0 overflow-y-auto p-6">
                    <div className="space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-serif text-foreground mb-1">{event.title}</h2>
                                <div className="text-sm text-foreground/40 mb-2">by {event.hostName}</div>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${sc.bg}`}>{sc.emoji} {sc.label}</span>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-xl hover:bg-card/50 text-foreground/40"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Action CTAs */}
                        {event.status === "draft" && (
                            <Button onClick={onConfirm} className="w-full rounded-xl bg-emerald-500 text-background hover:bg-emerald-600 font-bold text-xs uppercase tracking-wider gap-2 py-3">
                                <Check className="w-4 h-4" /> Confirm Event{event.blockType !== "none" ? ` (blocks ${BLOCK_LABELS[event.blockType]})` : ""}
                            </Button>
                        )}
                        {event.status === "confirmed" && (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Actual Attendance</label>
                                    <input type="number" value={attendance} onChange={e => setAttendance(parseInt(e.target.value) || 0)}
                                        className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                                </div>
                                <Button onClick={() => onComplete(attendance)} className="w-full rounded-xl bg-primary text-background hover:bg-primary/90 font-bold text-xs uppercase tracking-wider gap-2 py-3">
                                    🎉 Mark as Completed
                                </Button>
                            </div>
                        )}

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 bg-card/30 rounded-xl border border-border/20">
                                <div className="text-[10px] text-foreground/30 uppercase tracking-widest mb-1">{event.financialType === "we_earn" ? "Revenue" : "Cost"}</div>
                                <div className={`text-xl font-mono ${event.financialType === "we_earn" ? "text-primary" : "text-red-400"}`}>฿{amount.toLocaleString()}</div>
                                {event.perHeadPricing && <div className="text-[10px] text-foreground/30 mt-0.5">฿{event.amount.toLocaleString()}/head</div>}
                            </div>
                            <div className="p-4 bg-card/30 rounded-xl border border-border/20">
                                <div className="text-[10px] text-foreground/30 uppercase tracking-widest mb-1">Capacity</div>
                                <div className="text-xl font-mono text-foreground">
                                    {event.actualAttendance != null ? `${event.actualAttendance}/` : ""}{event.expectedGuests}
                                </div>
                                <div className="text-[10px] text-foreground/30 mt-0.5">max {event.maxCapacity}</div>
                            </div>
                        </div>

                        {/* Schedule */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-2">Schedule</h3>
                            <div className="flex flex-wrap gap-2">
                                <span className="text-[10px] bg-card/50 text-foreground/40 px-2 py-1 rounded-md flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {event.startTime || "—"} → {event.endTime || "—"} · {BLOCK_LABELS[event.blockType]}
                                </span>
                                {event.eventType === "recurring" && (
                                    <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-1 rounded-md flex items-center gap-1">
                                        <Repeat className="w-3 h-3" /> {event.recurringRule?.frequency}
                                    </span>
                                )}
                            </div>
                            <div className="space-y-1">
                                {event.dates.map(d => (
                                    <div key={d} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${d < today ? "text-foreground/20" : d === today ? "bg-primary/10 text-primary border border-primary/20" : "text-foreground/60"}`}>
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                                        {d === today && <span className="text-[8px] uppercase font-bold ml-auto bg-primary text-background px-2 py-0.5 rounded">Today</span>}
                                        {d < today && <span className="text-[8px] ml-auto text-foreground/20">Past</span>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Staff */}
                        {event.staffAssigned && event.staffAssigned.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-2">Assigned Staff</h3>
                                <div className="flex flex-wrap gap-2">
                                    {event.staffAssigned.map(id => {
                                        const staff = salesmen.find(s => s.id === id)
                                        return <span key={id} className="text-[10px] bg-card/50 text-foreground/50 px-3 py-1.5 rounded-lg">{staff?.nickname || id}</span>
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Contact */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-2">Host Contact</h3>
                            <div className="flex items-center gap-3 text-foreground/50 text-sm"><Phone className="w-4 h-4" /> {event.hostPhone}</div>
                            {event.hostEmail && <div className="flex items-center gap-3 text-foreground/50 text-sm"><Mail className="w-4 h-4" /> {event.hostEmail}</div>}
                        </div>

                        {(event.equipmentNotes || event.notes) && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-2">Notes</h3>
                                {event.equipmentNotes && <div className="text-sm text-foreground/40"><span className="text-[10px] uppercase font-bold text-foreground/30">Equipment: </span>{event.equipmentNotes}</div>}
                                {event.notes && <p className="text-sm text-foreground/40 italic bg-card/20 p-4 rounded-xl border border-border/10">{event.notes}</p>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sticky Actions Footer */}
                <div className="p-4 border-t border-border/20 bg-background flex gap-3">
                    {event.status !== "cancelled" && event.status !== "completed" && (
                        <Button onClick={onCancel} variant="outline" className="flex-1 rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/10 text-[10px] uppercase tracking-widest font-bold gap-1">
                            <Ban className="w-3 h-3" /> Cancel
                        </Button>
                    )}
                    <Button onClick={onEdit} variant="outline" className="flex-1 rounded-xl border-border/30 text-foreground/50 hover:text-primary text-[10px] uppercase tracking-widest font-bold">Edit</Button>
                    <Button onClick={onDelete} variant="ghost" className="text-red-400/50 hover:text-red-400 hover:bg-red-500/10 text-[10px] uppercase tracking-widest font-bold rounded-xl px-4"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
            </motion.div>
        </motion.div>
    )
}

// ── Form Modal ──
const EventForm = ({ event, salesmen, generateDates, onSave, onClose }: {
    event: Event | null, salesmen: Salesman[]
    generateDates: (rule: Event["recurringRule"], startDate: string, weeks?: number) => string[]
    onSave: (d: Partial<Event>) => void, onClose: () => void
}) => {
    const [f, setF] = useState<Partial<Event>>(event || {
        title: "", hostName: "", hostPhone: "", eventType: "one_time", blockType: "none",
        durationHours: 3, expectedGuests: 10, maxCapacity: 30, financialType: "we_earn",
        amount: 0, status: "draft", dates: [],
    })
    const [startDate, setStartDate] = useState(event?.dates?.[0] || "")
    const [recFrequency, setRecFrequency] = useState<"weekly" | "biweekly" | "monthly">(event?.recurringRule?.frequency || "weekly")
    const [recWeeks, setRecWeeks] = useState(4)

    const handleEventTypeChange = (type: "one_time" | "recurring") => {
        setF({ ...f, eventType: type })
        if (type === "one_time" && startDate) setF({ ...f, eventType: type, dates: [startDate] })
        else if (type === "recurring" && startDate) {
            const dates = generateDates({ frequency: recFrequency }, startDate, recWeeks)
            setF({ ...f, eventType: type, dates, recurringRule: { frequency: recFrequency } })
        }
    }

    const handleDateChange = (date: string) => {
        setStartDate(date)
        if (f.eventType === "one_time") setF({ ...f, dates: [date] })
        else {
            const dates = generateDates({ frequency: recFrequency }, date, recWeeks)
            setF({ ...f, dates, recurringRule: { frequency: recFrequency } })
        }
    }

    const handleRecChange = (freq: "weekly" | "biweekly" | "monthly") => {
        setRecFrequency(freq)
        if (startDate) {
            const dates = generateDates({ frequency: freq }, startDate, recWeeks)
            setF({ ...f, dates, recurringRule: { frequency: freq } })
        }
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                onClick={e => e.stopPropagation()} className="bg-background border border-border/30 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-border/20 flex justify-between items-center">
                    <h2 className="text-xl font-serif text-primary">{event ? "Edit Event" : "New Event"}</h2>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-card/50 text-foreground/40"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={e => { e.preventDefault(); if (f.title && f.hostName && f.hostPhone && f.dates && f.dates.length > 0) onSave(f) }}
                    className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Title + Host */}
                    <div>
                        <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Event Title *</label>
                        <input value={f.title || ""} onChange={e => setF({ ...f, title: e.target.value })} required
                            className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" placeholder="After Marathon Ice Bath" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Host Name *</label>
                            <input value={f.hostName || ""} onChange={e => setF({ ...f, hostName: e.target.value })} required
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Host Phone *</label>
                            <input value={f.hostPhone || ""} onChange={e => setF({ ...f, hostPhone: e.target.value })} required
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Host Email</label>
                            <input type="email" value={f.hostEmail || ""} onChange={e => setF({ ...f, hostEmail: e.target.value })}
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Host LINE</label>
                            <input value={f.hostLineId || ""} onChange={e => setF({ ...f, hostLineId: e.target.value })}
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                        </div>
                    </div>

                    {/* Scheduling */}
                    <div className="pt-2 border-t border-border/10">
                        <span className="text-xs font-bold uppercase tracking-widest text-foreground/40 flex items-center gap-2 mb-4"><Calendar className="w-4 h-4 text-blue-400/60" /> Schedule</span>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Type</label>
                                <select value={f.eventType || "one_time"} onChange={e => handleEventTypeChange(e.target.value as any)}
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm appearance-none">
                                    <option value="one_time">One-Time</option>
                                    <option value="recurring">Recurring</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">{f.eventType === "recurring" ? "Start Date *" : "Date *"}</label>
                                <input type="date" value={startDate} onChange={e => handleDateChange(e.target.value)} required
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                            </div>
                        </div>
                        {f.eventType === "recurring" && (
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Frequency</label>
                                    <select value={recFrequency} onChange={e => handleRecChange(e.target.value as any)}
                                        className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm appearance-none">
                                        <option value="weekly">Weekly</option>
                                        <option value="biweekly">Bi-weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Generate (weeks)</label>
                                    <input type="number" min={1} max={52} value={recWeeks} onChange={e => { setRecWeeks(parseInt(e.target.value) || 4); if (startDate) { const dates = generateDates({ frequency: recFrequency }, startDate, parseInt(e.target.value) || 4); setF({ ...f, dates, recurringRule: { frequency: recFrequency } }) } }}
                                        className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                                </div>
                            </div>
                        )}
                        {f.dates && f.dates.length > 0 && (
                            <div className="text-[10px] text-foreground/30 bg-card/20 p-2 rounded-lg mb-4">
                                📅 {f.dates.length} date{f.dates.length > 1 ? "s" : ""}: {f.dates.slice(0, 4).map(d => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })).join(", ")}{f.dates.length > 4 ? "..." : ""}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Block Schedule</label>
                                <select value={f.blockType || "none"} onChange={e => setF({ ...f, blockType: e.target.value as any })}
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm appearance-none">
                                    <option value="none">No Blocking</option>
                                    <option value="whole_day">Whole Day</option>
                                    <option value="morning">Morning Only</option>
                                    <option value="sun_peak">Sun Peak Only</option>
                                    <option value="evening">Evening Only</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Duration (hours)</label>
                                <input type="number" min={1} max={12} value={f.durationHours || 3} onChange={e => {
                                    const dur = parseInt(e.target.value) || 3
                                    setF({ ...f, durationHours: dur })
                                    // Auto-calculate end time
                                    if (f.startTime) {
                                        const [h, m] = f.startTime.split(":").map(Number)
                                        const endH = Math.min(h + dur, 23)
                                        setF(prev => ({ ...prev, durationHours: dur, endTime: `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}` }))
                                    }
                                }}
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Start Time *</label>
                                <input type="time" value={f.startTime || ""} onChange={e => {
                                    const st = e.target.value
                                    setF({ ...f, startTime: st })
                                    // Auto-calculate end time from duration
                                    if (st && f.durationHours) {
                                        const [h, m] = st.split(":").map(Number)
                                        const endH = Math.min(h + (f.durationHours || 3), 23)
                                        setF(prev => ({ ...prev, startTime: st, endTime: `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}` }))
                                    }
                                }} required
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">End Time</label>
                                <input type="time" value={f.endTime || ""} onChange={e => setF({ ...f, endTime: e.target.value })}
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                            </div>
                        </div>
                    </div>

                    {/* Capacity */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Expected Guests</label>
                            <input type="number" value={f.expectedGuests || 10} onChange={e => setF({ ...f, expectedGuests: parseInt(e.target.value) || 0 })}
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Max Capacity</label>
                            <input type="number" value={f.maxCapacity || 30} onChange={e => setF({ ...f, maxCapacity: parseInt(e.target.value) || 0 })}
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                        </div>
                    </div>

                    {/* Financials */}
                    <div className="pt-2 border-t border-border/10">
                        <span className="text-xs font-bold uppercase tracking-widest text-foreground/40 flex items-center gap-2 mb-4"><DollarSign className="w-4 h-4 text-primary/60" /> Financials</span>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Financial Type</label>
                                <select value={f.financialType || "we_earn"} onChange={e => setF({ ...f, financialType: e.target.value as any })}
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm appearance-none">
                                    <option value="we_earn">We Earn 💰</option>
                                    <option value="we_pay">We Pay 💸</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Amount (฿)</label>
                                <input type="number" value={f.amount || 0} onChange={e => setF({ ...f, amount: parseFloat(e.target.value) || 0 })}
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                            </div>
                            <div className="flex items-end">
                                <label className="flex items-center gap-2 text-sm text-foreground/50 cursor-pointer pb-3">
                                    <input type="checkbox" checked={f.perHeadPricing || false} onChange={e => setF({ ...f, perHeadPricing: e.target.checked })}
                                        className="rounded border-border/30" />
                                    Per head
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Staff + Notes */}
                    <div>
                        <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Assign Staff</label>
                        <div className="flex flex-wrap gap-2">
                            {salesmen.filter(s => s.active).map(s => (
                                <button key={s.id} type="button" onClick={() => {
                                    const current = f.staffAssigned || []
                                    setF({ ...f, staffAssigned: current.includes(s.id) ? current.filter(id => id !== s.id) : [...current, s.id] })
                                }} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${(f.staffAssigned || []).includes(s.id) ? "bg-primary/10 text-primary border border-primary/30" : "bg-card/30 text-foreground/40 border border-border/20 hover:border-border/40"}`}>
                                    {s.nickname}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Equipment / Setup Notes</label>
                        <input value={f.equipmentNotes || ""} onChange={e => setF({ ...f, equipmentNotes: e.target.value })}
                            className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" placeholder="Extra mats, towels, sound system..." />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Notes</label>
                        <textarea value={f.notes || ""} onChange={e => setF({ ...f, notes: e.target.value })}
                            className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm min-h-[60px]" />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="button" onClick={onClose} variant="ghost" className="flex-1 rounded-xl text-foreground/40">Cancel</Button>
                        <Button type="submit" className="flex-1 rounded-xl bg-primary text-background hover:bg-primary/90 font-bold">{event ? "Update" : "Create Event"}</Button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    )
}
