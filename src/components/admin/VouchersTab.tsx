"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Gift, QrCode, Receipt, User, CheckCircle2, Mail, Download, Trash2, Handshake, Megaphone, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import html2canvas from "html2canvas"
import { useFirestoreCRUD } from "@/hooks/useFirestore"
import { useSearchParams, useRouter } from "next/navigation"

// Types
import { Treatment, TreatmentVariant, Voucher, Client, Salesman } from "@/types"
import { getVariants } from "@/lib/treatments"
import { GachaManager } from "./GachaManager"

interface VouchersTabProps {
    vouchers: Voucher[]
    treatments: Treatment[]
    clients: Client[]
    salesmen: Salesman[]
    onScan: () => void
}

export function VouchersTab({ vouchers, treatments, clients, salesmen, onScan }: VouchersTabProps) {
    const voucherOps = useFirestoreCRUD("vouchers")
    const searchParams = useSearchParams()
    const router = useRouter()

    // Form State
    const [voucherForm, setVoucherForm] = useState({
        treatmentId: "",
        pricePaid: 0,
        recipientName: "",
        validityPeriod: "3M",
        customExpiration: "",
        clientId: undefined as string | undefined,
        isPackage: false,
        credits: 10,
        issuedByStaffId: "" as string,
    })
    const [generatedVoucher, setGeneratedVoucher] = useState<Voucher | null>(null)
    const [isMemberSearchOpen, setIsMemberSearchOpen] = useState(false)

    // Ticket Generation State
    const [tempVoucher, setTempVoucher] = useState<Voucher | null>(null)
    const [downloadingId, setDownloadingId] = useState<string | null>(null)
    const ticketRef = useRef<HTMLDivElement>(null)

    const [isBirthdayGift, setIsBirthdayGift] = useState(false)

    // Pre-fill from URL params (Birthday Voucher / Issue Voucher deep-link)
    useEffect(() => {
        const recipient = searchParams.get("recipient")
        const clientId = searchParams.get("clientId")
        const birthday = searchParams.get("birthday")

        if (recipient || clientId) {
            const firstTreatment = treatments.find(t => t.active)
            setVoucherForm(prev => ({
                ...prev,
                recipientName: recipient || prev.recipientName,
                clientId: clientId || prev.clientId,
                ...(birthday === "true" && firstTreatment ? {
                    treatmentId: firstTreatment.id,
                    pricePaid: 0,
                } : {}),
            }))
            if (birthday === "true") {
                setIsBirthdayGift(true)
            }
        }
    }, [searchParams, treatments])

    // Auto-fill price when treatment selected (skip if birthday gift)
    useEffect(() => {
        if (voucherForm.treatmentId && !isBirthdayGift) {
            const t = treatments.find(x => x.id === voucherForm.treatmentId)
            if (t) setVoucherForm(prev => ({ ...prev, pricePaid: t.price_thb }))
        }
    }, [voucherForm.treatmentId, treatments, isBirthdayGift])

    // Voucher Logic
    const generateVoucher = async () => {
        if (!voucherForm.treatmentId) return alert("Please select a treatment")
        if (!voucherForm.clientId) {
            return alert("Restricted: You must select a valid member from the search list. Walk-in guests must be registered first.")
        }

        // Resolve treatment and variant from the form value
        let treatment: Treatment | undefined
        let selectedVariant: TreatmentVariant | undefined

        if (voucherForm.treatmentId.includes('__v')) {
            const [tId, vIdx] = voucherForm.treatmentId.split('__v')
            treatment = treatments.find(t => t.id === tId)
            if (treatment) {
                const variants = getVariants(treatment)
                selectedVariant = variants[Number(vIdx)]
            }
        } else {
            treatment = treatments.find(t => t.id === voucherForm.treatmentId)
            if (treatment) {
                selectedVariant = getVariants(treatment)[0]
            }
        }

        if (!treatment || !selectedVariant) return alert("Treatment not found")

        const code = isBirthdayGift
            ? `BDAY-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
            : `PROMO-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

        // Staff commission calculation
        const issuingStaff = salesmen.find(s => s.id === voucherForm.issuedByStaffId)
        const commRate = issuingStaff?.commissionRate || 0
        const commAmount = Math.round(voucherForm.pricePaid * commRate)

        const newVoucher: Record<string, any> = {
            code,
            treatmentId: treatment.id,
            treatmentTitle: `${treatment.title} (${selectedVariant.duration_min} min)`,
            pricePaid: voucherForm.pricePaid,
            originalPrice: selectedVariant.price_thb,
            status: "ISSUED",
            recipientName: voucherForm.recipientName,
            clientId: voucherForm.clientId,
            issuedAt: new Date().toISOString(),
            type: voucherForm.isPackage ? "package" : "single",
            creditsTotal: voucherForm.isPackage ? voucherForm.credits : 1,
            creditsRemaining: voucherForm.isPackage ? voucherForm.credits : 1,
            // Staff attribution
            ...(issuingStaff ? {
                issuedByStaffId: issuingStaff.id,
                issuedByStaffName: issuingStaff.nickname,
                commissionRate: commRate,
                commissionAmount: commAmount,
            } : {}),
            expiresAt: (() => {
                const d = new Date()
                if (voucherForm.validityPeriod === "1M") d.setMonth(d.getMonth() + 1)
                else if (voucherForm.validityPeriod === "3M") d.setMonth(d.getMonth() + 3)
                else if (voucherForm.validityPeriod === "6M") d.setMonth(d.getMonth() + 6)
                else if (voucherForm.validityPeriod === "1Y") d.setFullYear(d.getFullYear() + 1)
                else if (voucherForm.validityPeriod === "CUSTOM" && voucherForm.customExpiration) return new Date(voucherForm.customExpiration).toISOString()
                else d.setMonth(d.getMonth() + 3)
                return d.toISOString()
            })(),
            ...(isBirthdayGift ? {
                isBirthdayGift: true,
                birthdayYear: new Date().getFullYear(),
            } : {})
        }

        const id = await voucherOps.add(newVoucher)
        setGeneratedVoucher({ ...newVoucher, id } as Voucher)
        // Reset form and clear URL params
        setVoucherForm({ treatmentId: "", pricePaid: 0, recipientName: "", validityPeriod: "3M", customExpiration: "", clientId: undefined, isPackage: false, credits: 10, issuedByStaffId: "" })
        if (isBirthdayGift) setIsBirthdayGift(false)
        // Clear deep-link params from URL
        router.replace("/admin?tab=vouchers", { scroll: false })
    }

    // Ticket Download Logic
    const downloadTicket = async (v: Voucher) => {
        setDownloadingId(v.id)
        setTempVoucher(v)

        setTimeout(async () => {
            if (ticketRef.current) {
                try {
                    const canvas = await html2canvas(ticketRef.current, {
                        backgroundColor: null,
                        scale: 2,
                        logging: false,
                        useCORS: true
                    })
                    const link = document.createElement('a')
                    link.download = `Yarey_Ticket_${v.code}.png`
                    link.href = canvas.toDataURL('image/png')
                    link.click()
                } catch (err: any) {
                    console.error("Ticket generation failed", err)
                    alert(`Failed to generate ticket image: ${err?.message || "Unknown error"}`)
                }
            } else {
                console.error("Ticket ref not found")
                alert("Ticket generation failed: DOM element not ready.")
            }
            setDownloadingId(null)
            setTempVoucher(null)
        }, 800)
    }

    // Split vouchers: regular vs bound (partner/media)
    const regularVouchers = vouchers.filter(v => !v.boundType)
    const boundVouchers = vouchers.filter(v => v.boundType)

    // Derived stats (from regular vouchers only — bound are discount codes, not revenue)
    const activeVouchers = regularVouchers.filter(v => v.status === "ISSUED" && (!v.expiresAt || new Date() <= new Date(v.expiresAt)))
    const redeemedVouchers = regularVouchers.filter(v => v.status === "REDEEMED")
    const expiredVouchers = regularVouchers.filter(v => (v.expiresAt && new Date() > new Date(v.expiresAt) && v.status === "ISSUED") || v.status === "EXPIRED")
    const totalRevenue = regularVouchers.filter(v => !(v as any).giftedFrom).reduce((s, v) => s + (v.pricePaid || 0), 0)
    const selectedTreatment = treatments.find(t => t.id === voucherForm.treatmentId)
    const discount = selectedTreatment ? Math.round(((selectedTreatment.price_thb - voucherForm.pricePaid) / selectedTreatment.price_thb) * 100) : 0

    const [voucherMode, setVoucherMode] = useState<"vouchers" | "gacha">("vouchers")

    return (
        <div className="space-y-8">
            {/* Sub-Navigation: Vouchers | Gacha */}
            <div className="flex gap-1 bg-card/30 p-1 rounded-xl border border-border/20 w-fit">
                {(["vouchers", "gacha"] as const).map(m => (
                    <button key={m} onClick={() => setVoucherMode(m)}
                        className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-[0.15em] font-bold transition-all ${voucherMode === m ? "bg-primary/15 text-primary" : "text-foreground/35 hover:text-foreground/60"
                            }`}>
                        {m === "vouchers" ? "🎫 Vouchers" : "🎰 Gacha"}
                    </button>
                ))}
            </div>

            {voucherMode === "gacha" ? (
                <GachaManager treatments={treatments} clients={clients} />
            ) : (
                <>
                    {/* Hidden ticket for html2canvas */}
                    {tempVoucher && (
                        <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
                            <div ref={ticketRef} className="w-[600px] h-[300px] bg-gradient-to-br from-[#F5F2F0] to-[#EAE5E0] rounded-2xl border border-stone-200/60 relative overflow-hidden flex flex-col items-center justify-center p-6">
                                <div className="absolute top-0 w-full h-1.5 bg-gradient-to-r from-primary/40 via-emerald-500/40 to-primary/40" />
                                <p className="text-[8px] tracking-[0.5em] uppercase text-stone-400 mb-1">Yarey Wellness</p>
                                <h3 className="text-2xl font-serif text-stone-800 text-center mb-4">{tempVoucher.treatmentTitle}</h3>
                                <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-xl border border-dashed border-stone-300 flex items-center gap-5 shadow-sm">
                                    <div className="text-center">
                                        <p className="text-[7px] uppercase tracking-widest text-stone-400">Code</p>
                                        <p className="font-mono text-lg font-bold text-stone-800 tracking-wider">{tempVoucher.code}</p>
                                    </div>
                                    <div className="h-7 w-px bg-stone-200" />
                                    <div className="text-center">
                                        <p className="text-[7px] uppercase tracking-widest text-stone-400">Value</p>
                                        <p className="font-serif text-lg text-primary font-bold">฿{(tempVoucher.pricePaid || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="absolute bottom-4 text-center">
                                    <p className="text-[8px] text-stone-400">For {tempVoucher.recipientName} · Exp: {tempVoucher.expiresAt ? new Date(tempVoucher.expiresAt).toLocaleDateString() : "N/A"}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── STATS ROW ─── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { label: "Active", value: activeVouchers.length, sub: "ready to redeem", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                            { label: "Redeemed", value: redeemedVouchers.length, sub: "completed", color: "text-foreground/50", bg: "bg-card/30 border-border/20" },
                            { label: "Expired", value: expiredVouchers.length, sub: "past validity", color: "text-red-400/70", bg: "bg-red-500/5 border-red-500/15" },
                            { label: "Revenue", value: `฿${totalRevenue.toLocaleString()}`, sub: "total collected", color: "text-primary", bg: "bg-primary/5 border-primary/15" },
                        ].map(s => (
                            <div key={s.label} className={`rounded-2xl border p-5 backdrop-blur-sm ${s.bg}`}>
                                <p className={`text-2xl font-serif font-bold ${s.color}`}>{s.value}</p>
                                <p className="text-[9px] uppercase tracking-[0.2em] text-foreground/40 font-bold mt-1">{s.label}</p>
                                <p className="text-[10px] text-foreground/25">{s.sub}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
                        {/* ═══ GENERATOR PANEL (Left) ═══ */}
                        <div className="lg:col-span-5 space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="font-serif text-2xl text-foreground">Issue Voucher</h2>
                                    <p className="text-[10px] text-foreground/25 mt-0.5">Prepaid codes for members</p>
                                </div>
                                <Button onClick={onScan} variant="outline" className="rounded-xl border-primary/20 text-primary hover:bg-primary/10 text-xs">
                                    <QrCode className="w-3.5 h-3.5 mr-1.5" /> Scan
                                </Button>
                            </div>

                            {/* Birthday Gift Banner */}
                            {isBirthdayGift && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-pink-500/15 rounded-xl border border-pink-500/25 flex items-center gap-3"
                                >
                                    <div className="text-3xl">🎂</div>
                                    <div className="flex-1">
                                        <h4 className="font-serif text-foreground text-sm">Birthday Gift for <span className="text-pink-400">{voucherForm.recipientName}</span></h4>
                                        <p className="text-[10px] text-pink-300/50">Complimentary voucher — price set to ฿0</p>
                                    </div>
                                    <button onClick={() => { setIsBirthdayGift(false); }} className="text-[9px] text-foreground/30 hover:text-foreground/60 uppercase tracking-wider font-bold">
                                        Cancel
                                    </button>
                                </motion.div>
                            )}

                            <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-border/25 p-6 space-y-6 shadow-xl shadow-black/10">
                                {/* Step 1: Treatment */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">1</span>
                                        <label className="text-[10px] uppercase tracking-[0.2em] text-foreground/50 font-bold">Select Ritual</label>
                                    </div>
                                    <select
                                        className="w-full bg-card/60 border border-border/30 rounded-xl px-4 py-3.5 text-sm text-foreground focus:outline-none focus:border-primary/50 appearance-none transition-colors"
                                        value={voucherForm.treatmentId}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            // Handle variant selection: "treatmentId__v0"
                                            if (val.includes('__v')) {
                                                const [tId, vIdx] = val.split('__v')
                                                const t = treatments.find(x => x.id === tId)
                                                if (t) {
                                                    const variants = getVariants(t)
                                                    const v = variants[Number(vIdx)]
                                                    if (v) {
                                                        // Store with variant info for price auto-fill
                                                        setVoucherForm(prev => ({ ...prev, treatmentId: val, pricePaid: isBirthdayGift ? 0 : v.price_thb }))
                                                        return
                                                    }
                                                }
                                            }
                                            setVoucherForm(prev => ({ ...prev, treatmentId: val }))
                                        }}
                                    >
                                        <option value="">Choose treatment...</option>
                                        {treatments.filter(t => t.active).map(t => {
                                            const variants = getVariants(t)
                                            if (variants.length <= 1) {
                                                return <option key={t.id} value={t.id}>{t.title} — {t.duration_min} min · ฿{t.price_thb.toLocaleString()}</option>
                                            }
                                            // Group header + variant options
                                            return (
                                                <optgroup key={t.id} label={t.title}>
                                                    {variants.map((v, vi) => (
                                                        <option key={`${t.id}-${vi}`} value={`${t.id}__v${vi}`}>
                                                            {v.duration_min} min — ฿{v.price_thb.toLocaleString()}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )
                                        })}
                                    </select>
                                    {selectedTreatment && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                            className="bg-primary/8 border border-primary/15 rounded-xl px-4 py-2.5 flex items-center justify-between">
                                            <span className="text-xs text-foreground/50">{selectedTreatment.duration_min} min · {selectedTreatment.title}</span>
                                            <span className="text-sm font-serif text-primary font-semibold">฿{selectedTreatment.price_thb.toLocaleString()}</span>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Step 2: Type */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">2</span>
                                        <label className="text-[10px] uppercase tracking-[0.2em] text-foreground/50 font-bold">Voucher Type</label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setVoucherForm(prev => ({ ...prev, isPackage: false }))}
                                            className={`p-4 rounded-xl border text-center transition-all ${!voucherForm.isPackage ? 'bg-primary/10 border-primary/30 shadow-md shadow-primary/5' : 'bg-card/30 border-border/20 hover:border-border/40'}`}>
                                            <Gift className={`w-5 h-5 mx-auto mb-1.5 ${!voucherForm.isPackage ? 'text-primary' : 'text-foreground/30'}`} />
                                            <p className={`text-xs font-bold ${!voucherForm.isPackage ? 'text-primary' : 'text-foreground/40'}`}>Single Use</p>
                                            <p className="text-[9px] text-foreground/25 mt-0.5">One-time redemption</p>
                                        </button>
                                        <button onClick={() => setVoucherForm(prev => ({ ...prev, isPackage: true }))}
                                            className={`p-4 rounded-xl border text-center transition-all ${voucherForm.isPackage ? 'bg-primary/10 border-primary/30 shadow-md shadow-primary/5' : 'bg-card/30 border-border/20 hover:border-border/40'}`}>
                                            <Receipt className={`w-5 h-5 mx-auto mb-1.5 ${voucherForm.isPackage ? 'text-primary' : 'text-foreground/30'}`} />
                                            <p className={`text-xs font-bold ${voucherForm.isPackage ? 'text-primary' : 'text-foreground/40'}`}>Package</p>
                                            <p className="text-[9px] text-foreground/25 mt-0.5">Multi-session credits</p>
                                        </button>
                                    </div>
                                    <AnimatePresence>
                                        {voucherForm.isPackage && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden">
                                                <div className="flex items-center gap-3 mt-2">
                                                    <label className="text-xs text-foreground/40 flex-shrink-0">Sessions:</label>
                                                    <input type="number" className="flex-1 bg-card/60 border border-border/30 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors" value={voucherForm.credits} onChange={(e) => setVoucherForm(prev => ({ ...prev, credits: Number(e.target.value) }))} min={2} />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Step 3: Recipient */}
                                <div className="space-y-3 relative">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">3</span>
                                        <label className="text-[10px] uppercase tracking-[0.2em] text-foreground/50 font-bold">Recipient</label>
                                        {voucherForm.clientId && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                    </div>
                                    <div className="relative">
                                        <User className="w-4 h-4 text-foreground/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                        <input type="text"
                                            className="w-full bg-card/60 border border-border/30 rounded-xl pl-10 pr-4 py-3.5 text-sm text-foreground focus:outline-none focus:border-primary/50 placeholder:text-foreground/25 transition-colors"
                                            placeholder="Search member..."
                                            value={voucherForm.recipientName}
                                            onFocus={() => setIsMemberSearchOpen(true)}
                                            onBlur={() => setTimeout(() => setIsMemberSearchOpen(false), 200)}
                                            onChange={(e) => { setVoucherForm(prev => ({ ...prev, recipientName: e.target.value, clientId: undefined })); setIsMemberSearchOpen(true) }}
                                        />
                                        {isMemberSearchOpen && (
                                            <div className="absolute top-full left-0 w-full bg-card/98 backdrop-blur-xl mt-1.5 rounded-xl shadow-2xl shadow-black/30 border border-border/25 z-50 max-h-52 overflow-y-auto">
                                                {clients.filter(c => c.name.toLowerCase().includes(voucherForm.recipientName.toLowerCase())).slice(0, 50).map(client => (
                                                    <div key={client.id}
                                                        className="px-4 py-3 hover:bg-primary/8 cursor-pointer flex justify-between items-center border-b border-border/10 last:border-0 transition-colors"
                                                        onClick={() => setVoucherForm(prev => ({ ...prev, recipientName: client.name, clientId: client.id }))}>
                                                        <div>
                                                            <p className="text-sm text-foreground font-medium">{client.name}</p>
                                                            <p className="text-[10px] text-foreground/40">{client.email}</p>
                                                        </div>
                                                        <span className="text-[10px] font-mono text-foreground/30">{client.phone || ""}</span>
                                                    </div>
                                                ))}
                                                {clients.length === 0 && <div className="p-4 text-center text-xs text-foreground/30 italic">No members found</div>}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Step 4: Pricing */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">4</span>
                                        <label className="text-[10px] uppercase tracking-[0.2em] text-foreground/50 font-bold">Pricing</label>
                                    </div>
                                    <div className="relative">
                                        <span className="text-foreground/40 absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-serif">฿</span>
                                        <input type="number"
                                            className="w-full bg-card/60 border border-border/30 rounded-xl pl-8 pr-4 py-3.5 text-sm text-foreground focus:outline-none focus:border-primary/50 font-serif transition-colors"
                                            value={voucherForm.pricePaid}
                                            onChange={(e) => setVoucherForm(prev => ({ ...prev, pricePaid: Number(e.target.value) }))}
                                        />
                                    </div>
                                    {selectedTreatment && discount > 0 && (
                                        <div className="flex items-center gap-2 px-1">
                                            <span className="text-xs text-foreground/30 line-through">฿{selectedTreatment.price_thb.toLocaleString()}</span>
                                            <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">-{discount}%</span>
                                        </div>
                                    )}
                                </div>

                                {/* Step 5: Validity */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">5</span>
                                        <label className="text-[10px] uppercase tracking-[0.2em] text-foreground/50 font-bold">Validity</label>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { val: "1M", label: "1 Mo" },
                                            { val: "3M", label: "3 Mo" },
                                            { val: "6M", label: "6 Mo" },
                                            { val: "1Y", label: "1 Year" },
                                            { val: "CUSTOM", label: "Custom" },
                                        ].map(v => (
                                            <button key={v.val} onClick={() => setVoucherForm(prev => ({ ...prev, validityPeriod: v.val }))}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${voucherForm.validityPeriod === v.val
                                                    ? 'bg-primary/15 text-primary border-primary/30 shadow-sm'
                                                    : 'bg-card/30 text-foreground/40 border-border/20 hover:border-border/40 hover:text-foreground/60'}`}>
                                                {v.label}
                                            </button>
                                        ))}
                                    </div>
                                    {voucherForm.validityPeriod === "CUSTOM" && (
                                        <input type="date" className="w-full bg-card/60 border border-border/30 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50 mt-1 transition-colors" value={voucherForm.customExpiration} onChange={(e) => setVoucherForm(prev => ({ ...prev, customExpiration: e.target.value }))} />
                                    )}
                                </div>

                                {/* Step 6: Issuing Staff */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">6</span>
                                        <label className="text-[10px] uppercase tracking-[0.2em] text-foreground/50 font-bold">Issued By (Staff)</label>
                                    </div>
                                    <select
                                        className="w-full bg-card/60 border border-border/30 rounded-xl px-4 py-3.5 text-sm text-foreground focus:outline-none focus:border-primary/50 appearance-none transition-colors"
                                        value={voucherForm.issuedByStaffId}
                                        onChange={(e) => setVoucherForm(prev => ({ ...prev, issuedByStaffId: e.target.value }))}
                                    >
                                        <option value="">No staff (walk-in / self)</option>
                                        {salesmen.filter(s => s.active).map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.nickname} — {Math.round(s.commissionRate * 100)}% comm.
                                            </option>
                                        ))}
                                    </select>
                                    {voucherForm.issuedByStaffId && voucherForm.pricePaid > 0 && (() => {
                                        const staff = salesmen.find(s => s.id === voucherForm.issuedByStaffId)
                                        if (!staff) return null
                                        const comm = Math.round(voucherForm.pricePaid * staff.commissionRate)
                                        return (
                                            <div className="bg-orange-500/8 border border-orange-500/15 rounded-xl px-4 py-2.5 flex items-center justify-between">
                                                <span className="text-xs text-foreground/50">Commission for {staff.nickname}</span>
                                                <span className="text-sm font-serif text-orange-400 font-semibold">฿{comm.toLocaleString()} ({Math.round(staff.commissionRate * 100)}%)</span>
                                            </div>
                                        )
                                    })()}
                                </div>

                                {/* Generate button */}
                                <Button onClick={generateVoucher}
                                    className="w-full py-6 rounded-xl bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-background text-sm font-bold tracking-wider transition-all shadow-lg shadow-primary/20">
                                    <Gift className="w-4.5 h-4.5 mr-2" /> Generate Voucher
                                </Button>
                            </div>
                        </div>

                        {/* ═══ VOUCHER LIST (Right) ═══ */}
                        <div className="lg:col-span-7 space-y-5">
                            {/* Generated ticket preview */}
                            <AnimatePresence>
                                {generatedVoucher && (
                                    <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
                                        <p className="text-[8px] uppercase tracking-[0.3em] text-foreground/15 font-bold mb-3">Latest Generated</p>
                                        <div className="aspect-[2/1] bg-gradient-to-br from-[#F5F2F0] to-[#EAE5E0] rounded-2xl border border-stone-200/60 relative overflow-hidden flex flex-col items-center justify-center p-6 shadow-2xl">
                                            <div className="absolute top-0 w-full h-1.5 bg-gradient-to-r from-primary/40 via-emerald-500/40 to-primary/40" />
                                            <p className="text-[8px] tracking-[0.5em] uppercase text-stone-400 mb-1">Yarey Wellness</p>
                                            <h3 className="text-2xl font-serif text-stone-800 text-center mb-4">{generatedVoucher.treatmentTitle}</h3>
                                            <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-xl border border-dashed border-stone-300 flex items-center gap-5 shadow-sm">
                                                <div className="text-center">
                                                    <p className="text-[7px] uppercase tracking-widest text-stone-400">Code</p>
                                                    <p className="font-mono text-lg font-bold text-stone-800 tracking-wider">{generatedVoucher.code}</p>
                                                </div>
                                                <div className="h-7 w-px bg-stone-200" />
                                                <div className="text-center">
                                                    <p className="text-[7px] uppercase tracking-widest text-stone-400">Value</p>
                                                    <p className="font-serif text-lg text-primary font-bold">฿{(generatedVoucher.pricePaid || 0).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="absolute bottom-4 text-center">
                                                <p className="text-[8px] text-stone-400">For {generatedVoucher.recipientName} · Exp: {generatedVoucher.expiresAt ? new Date(generatedVoucher.expiresAt).toLocaleDateString() : "N/A"}</p>
                                            </div>
                                        </div>
                                        <p className="text-center text-[9px] text-foreground/20 mt-2">Screenshot or download to send to client</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Header + count */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="font-serif text-xl text-foreground">Gift Certificates</h2>
                                    <p className="text-xs text-foreground/30">{regularVouchers.length} vouchers</p>
                                </div>
                            </div>

                            {/* Voucher cards */}
                            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                                {regularVouchers.length === 0 && (
                                    <div className="text-center py-12 text-foreground/15">
                                        <Gift className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                        <p className="text-sm">No vouchers yet</p>
                                        <p className="text-[10px] text-foreground/10 mt-1">Issue your first voucher using the form</p>
                                    </div>
                                )}
                                {regularVouchers.map((v) => {
                                    const isExpired = v.expiresAt && new Date() > new Date(v.expiresAt) && v.status === "ISSUED"
                                    const displayStatus = isExpired ? "EXPIRED" : v.status
                                    const statusColor = displayStatus === 'ISSUED'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : displayStatus === 'REDEEMED'
                                            ? 'bg-foreground/[0.03] text-foreground/25 border-foreground/5'
                                            : 'bg-red-500/8 text-red-400/60 border-red-500/15'

                                    return (
                                        <motion.div key={v.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className={`rounded-xl border px-4 py-3.5 flex items-center gap-4 transition-all hover:bg-primary/[0.03] ${displayStatus === 'ISSUED' ? 'border-border/20 bg-card/40' : 'border-border/10 bg-card/15 opacity-50'}`}>

                                            {/* Code */}
                                            <div className="flex-shrink-0 w-28">
                                                <p className="font-mono text-xs font-bold text-foreground/60 tracking-wide">{v.code}</p>
                                                <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-md text-[8px] uppercase font-bold tracking-wider border ${statusColor}`}>{displayStatus}</span>
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-foreground/70 truncate font-medium">{v.treatmentTitle}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] text-foreground/40">{v.recipientName}</span>
                                                    <span className="text-[10px] text-foreground/15">·</span>
                                                    <span className="text-[10px] font-serif text-primary/60">฿{(v.pricePaid || 0).toLocaleString()}</span>
                                                    {v.issuedByStaffName && (
                                                        <>
                                                            <span className="text-[10px] text-foreground/15">·</span>
                                                            <span className="text-[9px] text-orange-400/60">by {v.issuedByStaffName}</span>
                                                        </>
                                                    )}
                                                    {v.expiresAt && (
                                                        <>
                                                            <span className="text-[10px] text-foreground/15">·</span>
                                                            <span className="text-[9px] text-foreground/25">{new Date(v.expiresAt).toLocaleDateString()}</span>
                                                        </>
                                                    )}
                                                </div>
                                                {v.type === "package" && v.creditsTotal && (
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden max-w-[80px]">
                                                            <div className={`h-full rounded-full ${(v.creditsRemaining || 0) > 0 ? 'bg-emerald-400' : 'bg-foreground/10'}`} style={{ width: `${((v.creditsRemaining || 0) / v.creditsTotal) * 100}%` }} />
                                                        </div>
                                                        <span className="text-[9px] text-foreground/30 font-bold">{v.creditsRemaining || 0}/{v.creditsTotal}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {v.status === "ISSUED" && !isExpired && (
                                                    <>
                                                        <button onClick={() => { const subject = encodeURIComponent(`Digital Voucher: ${v.treatmentTitle}`); const body = encodeURIComponent(`Dear ${v.recipientName},\n\nHere is your prepaid digital voucher for Yarey Wellness.\n\nCode: ${v.code}\nValue: ฿${(v.pricePaid || 0).toLocaleString()}\n\nPlease present this code upon arrival to redeem your ritual.\n\nWarm regards,\nYarey Team`); window.open(`mailto:?subject=${subject}&body=${body}`, '_blank') }}
                                                            className="p-1.5 rounded-lg text-foreground/15 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Email">
                                                            <Mail className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button disabled={downloadingId === v.id} onClick={() => downloadTicket(v)}
                                                            className="p-1.5 rounded-lg text-foreground/15 hover:text-foreground/40 hover:bg-foreground/5 transition-all" title="Download">
                                                            <Download className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                                <button onClick={async () => { if (confirm("Delete this voucher?")) await voucherOps.remove(v.id) }}
                                                    className="p-1.5 rounded-lg text-foreground/10 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>

                            {/* ═══ PARTNER & MEDIA CODES ═══ */}
                            {boundVouchers.length > 0 && (
                                <div className="mt-8 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="font-serif text-xl text-foreground flex items-center gap-2"><Ticket className="w-5 h-5 text-primary/60" /> Partner & Media Codes</h2>
                                            <p className="text-xs text-foreground/30">{boundVouchers.length} tracking codes</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {boundVouchers.map(v => {
                                            const isPartner = v.boundType === "partner"
                                            const statusColor = v.status === "ISSUED"
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                : "bg-red-500/8 text-red-400/60 border-red-500/15"
                                            return (
                                                <motion.div key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                    className={`rounded-xl border px-4 py-3.5 flex items-center gap-4 transition-all hover:bg-primary/[0.03] ${v.status === "ISSUED" ? "border-border/20 bg-card/40" : "border-border/10 bg-card/15 opacity-50"}`}>
                                                    {/* Type + Code */}
                                                    <div className="flex-shrink-0 w-28">
                                                        <p className="font-mono text-xs font-bold text-foreground/60 tracking-wide">{v.code}</p>
                                                        <div className="flex items-center gap-1.5 mt-1.5">
                                                            <span className={`inline-block px-2 py-0.5 rounded-md text-[8px] uppercase font-bold tracking-wider border ${statusColor}`}>{v.status}</span>
                                                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] uppercase font-bold tracking-wider ${isPartner ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-purple-500/10 text-purple-400 border border-purple-500/20"}`}>
                                                                {isPartner ? <><Handshake className="w-2.5 h-2.5" /> PTR</> : <><Megaphone className="w-2.5 h-2.5" /> MDA</>}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {/* Details */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-foreground/70 truncate font-medium">{v.recipientName || v.treatmentTitle}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] text-primary font-bold">{v.discountPercent || 0}% discount</span>
                                                            <span className="text-[10px] text-foreground/15">·</span>
                                                            <span className="text-[10px] text-foreground/40">Used {v.usageCount || 0} times</span>
                                                            <span className="text-[10px] text-foreground/15">·</span>
                                                            <span className="text-[10px] text-foreground/25">Unlimited</span>
                                                        </div>
                                                    </div>
                                                    {/* Delete */}
                                                    <button onClick={async () => { if (confirm("Delete this bound code? This will NOT delete the partner/media entry.")) await voucherOps.remove(v.id) }}
                                                        className="p-1.5 rounded-lg text-foreground/10 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
