"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus, Search, Phone, Mail, X, Trash2, Ticket, Copy, Check,
    Instagram, ExternalLink, TrendingUp, DollarSign, Users, Eye,
    ArrowRight, Link2, Camera
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirestoreCollection, useFirestoreCRUD } from "@/hooks/useFirestore"
import { orderBy } from "firebase/firestore"
import { CircleMedia, Booking, Voucher, MediaStatus, Treatment } from "@/types"

type Media = CircleMedia

const STATUS_CONFIG: Record<MediaStatus, { label: string, emoji: string, color: string, bg: string }> = {
    scheduled: { label: "Scheduled", emoji: "📅", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    visited: { label: "Visited", emoji: "✅", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    content_posted: { label: "Content Posted", emoji: "📱", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
    completed: { label: "Completed", emoji: "🎉", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    cancelled: { label: "Cancelled", emoji: "❌", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
}

const STATUS_FLOW: MediaStatus[] = ["scheduled", "visited", "content_posted", "completed"]

interface Props {
    bookings: Booking[]
    expenses: any[]
    treatments: Treatment[]
}

export const MediaSubTab = ({ bookings, expenses, treatments }: Props) => {
    const { data: mediaList } = useFirestoreCollection<Media>("circle_media", [orderBy("createdAt", "desc")])
    const { data: vouchers } = useFirestoreCollection<Voucher>("vouchers")
    const mediaOps = useFirestoreCRUD("circle_media")
    const voucherOps = useFirestoreCRUD("vouchers")
    const expenseOps = useFirestoreCRUD("expenses")

    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<MediaStatus | "all">("all")
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<Media | null>(null)
    const [selected, setSelected] = useState<Media | null>(null)
    const [copiedCode, setCopiedCode] = useState<string | null>(null)

    // --- Compute media stats from bookings via bound voucher ---
    const mediaStats = useMemo(() => {
        const map = new Map<string, { guests: number, revenue: number }>()
        mediaList.forEach(m => map.set(m.id, { guests: 0, revenue: 0 }))

        bookings.forEach(b => {
            if (!b.mediaId) return
            const stats = map.get(b.mediaId)
            if (!stats) return
            stats.guests += b.guests
            stats.revenue += b.priceSnapshot || 0
        })
        return map
    }, [mediaList, bookings])

    // --- Bound vouchers map ---
    const boundVouchers = useMemo(() => {
        const map = new Map<string, Voucher>()
        vouchers.filter(v => v.boundType === "media").forEach(v => {
            if (v.boundEntityId) map.set(v.boundEntityId, v)
        })
        return map
    }, [vouchers])

    // Filter
    const filtered = useMemo(() => mediaList
        .filter(m => statusFilter === "all" || m.status === statusFilter)
        .filter(m => !searchTerm || m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.phone.includes(searchTerm) || (m.instagramHandle || "").toLowerCase().includes(searchTerm.toLowerCase()))
        , [mediaList, searchTerm, statusFilter])

    // Totals
    const totalCost = useMemo(() => mediaList.reduce((sum, m) => sum + (m.cost || 0), 0), [mediaList])
    const totalRevenue = useMemo(() => { let t = 0; mediaStats.forEach(s => t += s.revenue); return t }, [mediaStats])
    const overallROI = totalCost > 0 ? (totalRevenue / totalCost) : 0

    // Content pending alert (visited but no content for >7 days)
    const contentPending = useMemo(() => mediaList.filter(m => {
        if (m.status !== "visited" || !m.visitDate) return false
        const daysSince = Math.floor((Date.now() - new Date(m.visitDate).getTime()) / 86400000)
        return daysSince > 7
    }), [mediaList])

    // --- Handlers ---
    const handleSave = async (data: Partial<Media>) => {
        if (editing?.id) {
            await mediaOps.update(editing.id, data)
            // Update bound voucher if code/discount changed
            const existingV = boundVouchers.get(editing.id)
            if (existingV && (data.boundVoucherCode !== editing.boundVoucherCode || data.discountPercent !== editing.discountPercent)) {
                await voucherOps.update(existingV.id, {
                    code: data.boundVoucherCode,
                    discountPercent: data.discountPercent,
                })
            }
        } else {
            const mediaId = await mediaOps.add({ ...data, paymentStatus: (data.cost && data.cost > 0) ? "paid" : "unpaid", createdAt: new Date().toISOString() })
            // Auto-create bound voucher
            if (data.boundVoucherCode) {
                await voucherOps.add({
                    code: data.boundVoucherCode,
                    treatmentId: "__media_discount__",
                    treatmentTitle: `Media Discount: ${data.name}`,
                    pricePaid: 0, originalPrice: 0,
                    status: "ISSUED", type: "single",
                    boundType: "media", boundEntityId: mediaId,
                    discountPercent: data.discountPercent || 0,
                    usageCount: 0,
                    issuedAt: new Date().toISOString(),
                    recipientName: data.name,
                })
            }
            // Cost committed at creation — auto-create expense
            if (data.cost && data.cost > 0) {
                const monthStr = (data.visitDate || new Date().toISOString()).slice(0, 7)
                await expenseOps.add({
                    month: monthStr,
                    title: `Media: ${data.name}`,
                    amount: data.cost,
                    category: "Marketing/Media",
                })
            }
        }
        setShowForm(false); setEditing(null)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this media entry and void their voucher?")) return
        const bv = boundVouchers.get(id)
        if (bv) await voucherOps.update(bv.id, { status: "VOID" })
        await mediaOps.remove(id)
        setSelected(null)
    }

    const handleStatusAdvance = async (media: Media) => {
        const currentIdx = STATUS_FLOW.indexOf(media.status)
        if (currentIdx < 0 || currentIdx >= STATUS_FLOW.length - 1) return
        const nextStatus = STATUS_FLOW[currentIdx + 1]
        await mediaOps.update(media.id, { status: nextStatus })
        // Refresh selected
        setSelected({ ...media, status: nextStatus })
    }

    // Auto-visit: advance scheduled → visited when visit date/time has passed
    const autoVisitRan = useRef(false)
    useEffect(() => {
        if (autoVisitRan.current || mediaList.length === 0) return
        autoVisitRan.current = true

        const now = new Date()
        const todayStr = now.toLocaleDateString("en-CA") // YYYY-MM-DD
        const nowMinutes = now.getHours() * 60 + now.getMinutes()

        mediaList.forEach(async (m) => {
            if (m.status !== "scheduled" || !m.visitDate) return

            // Check if visit date is strictly past
            if (m.visitDate < todayStr) {
                console.log(`[Auto-visit] ${m.name} — visit date ${m.visitDate} is past, advancing to visited`)
                await mediaOps.update(m.id, { status: "visited" })
                return
            }

            // If visit date is today, check if visit time has passed
            if (m.visitDate === todayStr && m.visitTime) {
                const [h, min] = m.visitTime.split(":").map(Number)
                const visitMinutes = h * 60 + (min || 0)
                if (nowMinutes >= visitMinutes) {
                    console.log(`[Auto-visit] ${m.name} — visit time ${m.visitTime} has passed, advancing to visited`)
                    await mediaOps.update(m.id, { status: "visited" })
                }
            }
        })
    }, [mediaList])

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code)
        setCopiedCode(code)
        setTimeout(() => setCopiedCode(null), 2000)
    }

    const formatFollowers = (n?: number) => {
        if (!n) return "—"
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
        if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
        return String(n)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="font-serif text-xl text-foreground mb-1">Media & Influencers</h3>
                    <p className="text-sm text-foreground/50">
                        {mediaList.length} total · ROI {overallROI.toFixed(1)}x
                    </p>
                </div>
                <Button onClick={() => { setEditing(null); setShowForm(true) }} size="sm"
                    className="h-9 rounded-xl bg-primary text-background hover:bg-primary/90 text-[10px] font-bold uppercase tracking-wider gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Add Media
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Total Cost", value: `฿${totalCost.toLocaleString()}`, icon: DollarSign, color: "text-red-400", bg: "bg-red-500/10" },
                    { label: "Revenue Generated", value: `฿${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
                    { label: "Guests via Media", value: (() => { let t = 0; mediaStats.forEach(s => t += s.guests); return t })(), icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
                    { label: "Overall ROI", value: `${overallROI.toFixed(1)}x`, icon: Eye, color: overallROI >= 1 ? "text-emerald-400" : "text-amber-400", bg: overallROI >= 1 ? "bg-emerald-500/10" : "bg-amber-500/10" },
                ].map(s => (
                    <div key={s.label} className="bg-card/50 backdrop-blur-sm p-4 rounded-2xl border border-border/30">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center ${s.color}`}><s.icon className="w-5 h-5" /></div>
                            <div>
                                <div className="text-xl font-serif text-foreground">{s.value}</div>
                                <div className="text-[9px] uppercase tracking-widest text-foreground/40 font-bold">{s.label}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Content Pending Alert */}
            {contentPending.length > 0 && (
                <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20 flex items-center gap-3">
                    <Camera className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-xs text-amber-300/80">
                            <strong>{contentPending.length}</strong> influencer{contentPending.length > 1 ? "s" : ""} visited but no content posted yet:
                            {" "}{contentPending.map(m => m.name).join(", ")}
                        </p>
                    </div>
                </div>
            )}

            {/* Status Filter */}
            <div className="flex flex-wrap gap-1">
                {[{ id: "all" as const, label: "All", count: mediaList.length }, ...Object.entries(STATUS_CONFIG).map(([id, c]) => ({
                    id: id as MediaStatus, label: `${c.emoji} ${c.label}`, count: mediaList.filter(m => m.status === id).length
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
                <input type="text" placeholder="Search by name, phone, or @handle..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-card/30 border border-border/30 rounded-xl py-3 pl-12 pr-4 text-foreground placeholder-foreground/20 focus:outline-none focus:border-primary/50 text-sm" />
            </div>

            {/* Cards (shared for mobile + desktop — media works better as cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(m => {
                    const stats = mediaStats.get(m.id)
                    const sc = STATUS_CONFIG[m.status]
                    const roi = m.cost > 0 ? ((stats?.revenue || 0) / m.cost) : 0
                    return (
                        <div key={m.id} onClick={() => setSelected(m)} className="bg-card/30 border border-border/20 rounded-2xl p-5 cursor-pointer hover:border-primary/30 transition-all group">
                            {/* Top row */}
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="font-serif text-base text-foreground group-hover:text-primary transition-colors">{m.name}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        {m.instagramHandle && <span className="text-[10px] text-pink-400 flex items-center gap-1"><Instagram className="w-3 h-3" /> {m.instagramHandle}</span>}
                                        {m.instagramFollowers && <span className="text-[9px] text-foreground/30">{formatFollowers(m.instagramFollowers)}</span>}
                                    </div>
                                </div>
                                <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-lg border ${sc.bg}`}>{sc.emoji} {sc.label}</span>
                            </div>

                            {/* Social row */}
                            <div className="flex gap-3 mb-3 text-[10px] text-foreground/30">
                                {m.tiktokHandle && <span>TikTok: {m.tiktokHandle} ({formatFollowers(m.tiktokFollowers)})</span>}
                                {m.facebookPage && <span>FB ✓</span>}
                            </div>

                            {/* Visit + Code */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-[10px] text-foreground/40">
                                    {m.visitDate ? `📅 ${new Date(m.visitDate).toLocaleDateString()} ${m.visitTime || ""}` : "No visit date"}
                                </div>
                                <span className="font-mono text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-md">{m.boundVoucherCode}</span>
                            </div>

                            {/* Bottom stats */}
                            <div className="flex gap-4 pt-3 border-t border-border/10 text-xs">
                                <div><div className="text-[9px] text-foreground/30 uppercase">Cost</div><div className="font-mono text-red-400">฿{m.cost.toLocaleString()}</div></div>
                                <div><div className="text-[9px] text-foreground/30 uppercase">Revenue</div><div className="font-mono text-primary">฿{(stats?.revenue || 0).toLocaleString()}</div></div>
                                <div><div className="text-[9px] text-foreground/30 uppercase">Guests</div><div className="text-foreground/60">{stats?.guests || 0}</div></div>
                                <div className="ml-auto"><div className="text-[9px] text-foreground/30 uppercase">ROI</div><div className={`font-mono font-bold ${roi >= 1 ? "text-emerald-400" : "text-amber-400"}`}>{roi.toFixed(1)}x</div></div>
                            </div>
                        </div>
                    )
                })}
                {filtered.length === 0 && (
                    <div className="col-span-full text-center py-12 text-foreground/30 italic text-sm">No media entries yet.</div>
                )}
            </div>

            {/* Detail Slide-over — rendered via portal to avoid parent transform issues */}
            {selected && typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    <MediaDetail media={selected} stats={mediaStats.get(selected.id)} voucher={boundVouchers.get(selected.id)}
                        bookings={bookings} onClose={() => setSelected(null)} onEdit={() => { setEditing(selected); setShowForm(true); setSelected(null) }}
                        onDelete={() => handleDelete(selected.id)} onAdvance={() => handleStatusAdvance(selected)}
                        onCopy={copyCode} copiedCode={copiedCode} />
                </AnimatePresence>,
                document.body
            )}

            {/* Form */}
            <AnimatePresence>
                {showForm && <MediaForm media={editing} treatments={treatments} onSave={handleSave} onClose={() => { setShowForm(false); setEditing(null) }} />}
            </AnimatePresence>
        </div>
    )
}

// ── Detail Panel ──
const MediaDetail = ({ media, stats, voucher, bookings, onClose, onEdit, onDelete, onAdvance, onCopy, copiedCode }: {
    media: Media, stats: any, voucher?: Voucher, bookings: Booking[]
    onClose: () => void, onEdit: () => void, onDelete: () => void
    onAdvance: () => void
    onCopy: (c: string) => void, copiedCode: string | null
}) => {
    const sc = STATUS_CONFIG[media.status]
    const roi = media.cost > 0 ? ((stats?.revenue || 0) / media.cost) : 0
    const mediaBookings = bookings.filter(b => b.mediaId === media.id).sort((a, b) => b.date.localeCompare(a.date))
    const canAdvance = STATUS_FLOW.indexOf(media.status) >= 0 && STATUS_FLOW.indexOf(media.status) < STATUS_FLOW.length - 1
    const nextStatus = canAdvance ? STATUS_CONFIG[STATUS_FLOW[STATUS_FLOW.indexOf(media.status) + 1]] : null

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-stretch justify-end" onClick={onClose}>
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 250 }}
                className="w-full max-w-md h-screen bg-background border-l border-border/30 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex-1 min-h-0 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-serif text-foreground mb-2">{media.name}</h2>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${sc.bg}`}>
                                    {sc.emoji} {sc.label}
                                </span>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-xl hover:bg-card/50 text-foreground/40"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Status Flow Progress */}
                        <div className="flex items-center gap-1">
                            {STATUS_FLOW.map((s, i) => {
                                const reached = STATUS_FLOW.indexOf(media.status) >= i
                                const isCurrent = media.status === s
                                return (
                                    <div key={s} className="flex items-center gap-1 flex-1">
                                        <div className={`flex-1 h-1.5 rounded-full ${reached ? "bg-primary" : "bg-white/10"}`} />
                                        {i < STATUS_FLOW.length - 1 && <ArrowRight className={`w-3 h-3 flex-shrink-0 ${reached ? "text-primary" : "text-white/10"}`} />}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Advance CTA */}
                        {canAdvance && nextStatus && (
                            <Button onClick={onAdvance} className="w-full rounded-xl bg-primary text-background hover:bg-primary/90 font-bold text-xs uppercase tracking-wider gap-2 py-3">
                                <ArrowRight className="w-4 h-4" /> Move to {nextStatus.emoji} {nextStatus.label}
                            </Button>
                        )}

                        {/* Bound Voucher Card */}
                        <div className="p-5 bg-gradient-to-br from-purple-500/10 to-transparent rounded-xl border border-purple-500/20">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Ticket className="w-4 h-4 text-purple-400" />
                                    <span className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Promo Code</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-2xl text-purple-400 font-bold tracking-wider">{media.boundVoucherCode}</span>
                                <button onClick={() => onCopy(media.boundVoucherCode)} className="p-2 rounded-lg bg-card/30 hover:bg-card/60 text-foreground/40 hover:text-purple-400">
                                    {copiedCode === media.boundVoucherCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <div className="flex gap-4 mt-3 text-[10px] text-foreground/40">
                                <span>{media.discountPercent}% discount</span>
                                <span>·</span>
                                <span>Used {voucher?.usageCount || 0} times</span>
                            </div>
                        </div>

                        {/* Performance Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 bg-card/30 rounded-xl border border-border/20">
                                <div className="text-[10px] text-foreground/30 uppercase tracking-widest mb-1">Cost</div>
                                <div className="text-xl font-mono text-red-400">฿{media.cost.toLocaleString()}</div>
                                <div className={`text-[10px] mt-0.5 ${media.paymentStatus === "paid" ? "text-emerald-400" : "text-amber-400"}`}>
                                    {media.paymentStatus === "paid" ? "✅ Paid" : "⏳ Unpaid"}
                                </div>
                            </div>
                            <div className="p-4 bg-card/30 rounded-xl border border-border/20">
                                <div className="text-[10px] text-foreground/30 uppercase tracking-widest mb-1">Revenue</div>
                                <div className="text-xl font-mono text-primary">฿{(stats?.revenue || 0).toLocaleString()}</div>
                                <div className="text-[10px] text-foreground/30 mt-0.5">{stats?.guests || 0} guests</div>
                            </div>
                        </div>

                        {/* ROI */}
                        <div className={`p-4 rounded-xl border ${roi >= 1 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"}`}>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Return on Investment</span>
                                <span className={`text-2xl font-mono font-bold ${roi >= 1 ? "text-emerald-400" : "text-amber-400"}`}>{roi.toFixed(1)}x</span>
                            </div>
                            <p className="text-[10px] text-foreground/30 mt-1">
                                {roi >= 2 ? "🔥 Excellent — consider re-booking" : roi >= 1 ? "👍 Profitable" : roi > 0 ? "⚠️ Below break-even" : "No revenue yet"}
                            </p>
                        </div>


                        {/* Cost auto-committed at creation */}
                        {media.paymentStatus === "paid" && media.cost > 0 && (
                            <div className="text-[10px] text-emerald-400 text-center py-2">✅ Cost ฿{media.cost.toLocaleString()} committed</div>
                        )}

                        {/* Social */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-2">Social Presence</h3>
                            {media.instagramHandle && (
                                <a href={`https://instagram.com/${media.instagramHandle.replace("@", "")}`} target="_blank" rel="noopener"
                                    className="flex items-center gap-3 text-pink-400 text-sm hover:text-pink-300">
                                    <Instagram className="w-4 h-4" /> {media.instagramHandle}
                                    {media.instagramFollowers && <span className="text-foreground/30 text-xs">({media.instagramFollowers.toLocaleString()} followers)</span>}
                                    <ExternalLink className="w-3 h-3 opacity-30 ml-auto" />
                                </a>
                            )}
                            {media.tiktokHandle && (
                                <a href={`https://tiktok.com/@${media.tiktokHandle.replace("@", "")}`} target="_blank" rel="noopener"
                                    className="flex items-center gap-3 text-foreground/50 text-sm hover:text-foreground">
                                    🎵 TikTok: {media.tiktokHandle}
                                    {media.tiktokFollowers && <span className="text-foreground/30 text-xs">({media.tiktokFollowers.toLocaleString()})</span>}
                                </a>
                            )}
                            {media.facebookPage && (
                                <a href={media.facebookPage.startsWith("http") ? media.facebookPage : `https://facebook.com/${media.facebookPage}`} target="_blank" rel="noopener"
                                    className="flex items-center gap-3 text-blue-400 text-sm hover:text-blue-300">
                                    📘 Facebook <ExternalLink className="w-3 h-3 opacity-30 ml-auto" />
                                </a>
                            )}
                        </div>

                        {/* Visit Details */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-2">Visit Details</h3>
                            <div className="space-y-2 text-sm text-foreground/50">
                                {media.visitDate && <div>Date: <span className="text-foreground/70">{new Date(media.visitDate).toLocaleDateString()}</span></div>}
                                {media.visitTime && <div>Time: <span className="text-foreground/70">{media.visitTime}</span></div>}
                                {media.treatmentBooked && <div>Treatment: <span className="text-foreground/70">{media.treatmentBooked}</span></div>}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-2">Content</h3>
                            <div className="space-y-2 text-sm text-foreground/50">
                                {media.contentDeliverables && <div>Deliverables: <span className="text-foreground/70">{media.contentDeliverables}</span></div>}
                                {media.contentUrl && (
                                    <a href={media.contentUrl} target="_blank" rel="noopener" className="flex items-center gap-2 text-primary hover:text-primary/80">
                                        <Link2 className="w-3.5 h-3.5" /> View Content <ExternalLink className="w-3 h-3 opacity-30" />
                                    </a>
                                )}
                                {media.canRepost !== undefined && <div>Can repost: <span className="text-foreground/70">{media.canRepost ? "✅ Yes" : "❌ No"}</span></div>}
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-2">Contact</h3>
                            <div className="flex items-center gap-3 text-foreground/50 text-sm"><Phone className="w-4 h-4" /> {media.phone}</div>
                            {media.email && <a href={`mailto:${media.email}`} className="flex items-center gap-3 text-foreground/50 text-sm hover:text-primary"><Mail className="w-4 h-4" /> {media.email}</a>}
                            {media.contactPerson && <div className="flex items-center gap-3 text-foreground/50 text-sm">👤 {media.contactPerson} (manager/agent)</div>}
                        </div>

                        {/* Bookings from this code */}
                        {mediaBookings.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-2">Bookings via Code</h3>
                                {mediaBookings.slice(0, 10).map(b => (
                                    <div key={b.id} className="flex justify-between items-center p-3 bg-card/20 rounded-xl border border-border/10">
                                        <div>
                                            <div className="text-sm text-foreground">{b.contact?.name || "Guest"}</div>
                                            <div className="text-[10px] text-foreground/30">{new Date(b.date).toLocaleDateString()} · {b.treatment}</div>
                                        </div>
                                        <div className="font-mono text-primary text-sm">฿{(b.priceSnapshot || 0).toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {media.notes && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 border-b border-border/20 pb-2">Notes</h3>
                                <p className="text-sm text-foreground/40 italic bg-card/20 p-4 rounded-xl border border-border/10">{media.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sticky Actions Footer */}
                <div className="p-4 border-t border-border/20 bg-background flex gap-3">
                    <Button onClick={onEdit} variant="outline" className="flex-1 rounded-xl border-border/30 text-foreground/50 hover:text-primary text-[10px] uppercase tracking-widest font-bold">Edit</Button>
                    <Button onClick={onDelete} variant="ghost" className="text-red-400/50 hover:text-red-400 hover:bg-red-500/10 text-[10px] uppercase tracking-widest font-bold rounded-xl px-4"><Trash2 className="w-3.5 h-3.5" /> Delete</Button>
                </div>
            </motion.div>
        </motion.div>
    )
}

// ── Form Modal ──
const MediaForm = ({ media, treatments, onSave, onClose }: { media: Media | null, treatments: Treatment[], onSave: (d: Partial<Media>) => void, onClose: () => void }) => {
    const [f, setF] = useState<Partial<Media>>(media || {
        name: "", phone: "", status: "scheduled", cost: 0,
        paymentStatus: "unpaid", boundVoucherCode: "", discountPercent: 10,
    })

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                onClick={e => e.stopPropagation()} className="bg-background border border-border/30 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-border/20 flex justify-between items-center">
                    <h2 className="text-xl font-serif text-primary">{media ? "Edit Media" : "New Media / Influencer"}</h2>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-card/50 text-foreground/40"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={e => { e.preventDefault(); if (f.name && f.phone && f.boundVoucherCode) onSave(f) }} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Name + Phone */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Name *</label>
                            <input value={f.name || ""} onChange={e => setF({ ...f, name: e.target.value })} required
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" placeholder="@somchai_fit" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Phone *</label>
                            <input value={f.phone || ""} onChange={e => setF({ ...f, phone: e.target.value })} required
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Contact Person / Agent</label>
                            <input value={f.contactPerson || ""} onChange={e => setF({ ...f, contactPerson: e.target.value })}
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Email</label>
                            <input type="email" value={f.email || ""} onChange={e => setF({ ...f, email: e.target.value })}
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                        </div>
                    </div>

                    {/* Social */}
                    <div className="pt-2 border-t border-border/10">
                        <span className="text-xs font-bold uppercase tracking-widest text-foreground/40 flex items-center gap-2 mb-4"><Instagram className="w-4 h-4 text-pink-400/60" /> Social Presence</span>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Instagram Handle</label>
                                <input value={f.instagramHandle || ""} onChange={e => setF({ ...f, instagramHandle: e.target.value })}
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" placeholder="@username" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">IG Followers</label>
                                <input type="number" value={f.instagramFollowers || ""} onChange={e => setF({ ...f, instagramFollowers: parseInt(e.target.value) || undefined })}
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" placeholder="50000" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">TikTok Handle</label>
                                <input value={f.tiktokHandle || ""} onChange={e => setF({ ...f, tiktokHandle: e.target.value })}
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" placeholder="@username" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">TikTok Followers</label>
                                <input type="number" value={f.tiktokFollowers || ""} onChange={e => setF({ ...f, tiktokFollowers: parseInt(e.target.value) || undefined })}
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Facebook Page URL</label>
                            <input value={f.facebookPage || ""} onChange={e => setF({ ...f, facebookPage: e.target.value })}
                                className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" placeholder="https://facebook.com/..." />
                        </div>
                    </div>

                    {/* Visit */}
                    <div className="pt-2 border-t border-border/10">
                        <span className="text-xs font-bold uppercase tracking-widest text-foreground/40 flex items-center gap-2 mb-4">📅 Visit</span>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Date</label>
                                <input type="date" value={f.visitDate || ""} onChange={e => setF({ ...f, visitDate: e.target.value })}
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Time</label>
                                <input type="time" value={f.visitTime || ""} onChange={e => setF({ ...f, visitTime: e.target.value })}
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Treatment</label>
                                <select value={f.treatmentBooked || ""} onChange={e => setF({ ...f, treatmentBooked: e.target.value })}
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm appearance-none">
                                    <option value="">Select...</option>
                                    {treatments.filter(t => t.active).map(t => <option key={t.id} value={t.title}>{t.title}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Voucher + Cost */}
                    <div className="pt-2 border-t border-border/10">
                        <span className="text-xs font-bold uppercase tracking-widest text-foreground/40 flex items-center gap-2 mb-4"><Ticket className="w-4 h-4 text-purple-400/60" /> Promo Code & Cost</span>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Code *</label>
                                <input value={f.boundVoucherCode || ""} onChange={e => setF({ ...f, boundVoucherCode: e.target.value.toUpperCase().replace(/\s/g, "-") })} required
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm font-mono" placeholder="INF-NAME20" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Discount %</label>
                                <input type="number" min={0} max={100} value={f.discountPercent || 0} onChange={e => setF({ ...f, discountPercent: parseInt(e.target.value) || 0 })}
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Cost (฿)</label>
                                <input type="number" value={f.cost || 0} onChange={e => setF({ ...f, cost: parseFloat(e.target.value) || 0 })}
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" />
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="pt-2 border-t border-border/10">
                        <span className="text-xs font-bold uppercase tracking-widest text-foreground/40 flex items-center gap-2 mb-4">📱 Content</span>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Deliverables</label>
                                <input value={f.contentDeliverables || ""} onChange={e => setF({ ...f, contentDeliverables: e.target.value })}
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" placeholder="1 reel + 3 stories" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Content URL</label>
                                <input value={f.contentUrl || ""} onChange={e => setF({ ...f, contentUrl: e.target.value })}
                                    className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm" placeholder="https://..." />
                            </div>
                        </div>
                        <label className="flex items-center gap-2 mt-3 text-sm text-foreground/50 cursor-pointer">
                            <input type="checkbox" checked={f.canRepost || false} onChange={e => setF({ ...f, canRepost: e.target.checked })}
                                className="rounded border-border/30" />
                            We can repost their content
                        </label>
                    </div>

                    <div>
                        <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-2 block">Notes</label>
                        <textarea value={f.notes || ""} onChange={e => setF({ ...f, notes: e.target.value })}
                            className="w-full p-3 bg-card/30 rounded-xl border border-border/30 text-foreground focus:outline-none focus:border-primary/50 text-sm min-h-[60px]" placeholder="Agreement details..." />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="button" onClick={onClose} variant="ghost" className="flex-1 rounded-xl text-foreground/40">Cancel</Button>
                        <Button type="submit" className="flex-1 rounded-xl bg-primary text-background hover:bg-primary/90 font-bold">{media ? "Update" : "Create"}</Button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    )
}
