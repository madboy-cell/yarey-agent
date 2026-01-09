import React from 'react'
import { motion, AnimatePresence } from "framer-motion"
import { Users, Plus, Trash2, Copy, CreditCard, ChevronRight, Mail, Phone, BedDouble, Check, Globe, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { nationalities } from "@/lib/nationalities"

interface Treatment {
    id: string
    title: string
    price_thb: number
    duration_min: number
}

interface Voucher {
    id: string
    code: string
    treatmentId: string
    treatmentTitle: string
    pricePaid: number
    status: string
}

export interface CartItem {
    tempId: string
    name: string
    treatment: Treatment | null
    time: string
    email?: string
    phone?: string
    room?: string
    nationality?: string
    source?: string
    isHotelGuest: boolean
    sendConfirmation: boolean
    voucherCode?: string
    voucherId?: string
    manualDiscount?: number
}

interface GroupBookingCartProps {
    cart: CartItem[]
    activeGuestId: string | null
    onSelectGuest: (id: string) => void
    onAddGuest: () => void
    onRemoveGuest: (id: string) => void
    onUpdateGuest: (id: string, updates: Partial<CartItem>) => void
    onCopyPrevious: (id: string) => void
    onCheckout: () => void
    onValidateVoucher?: (code: string) => Voucher | null
    salesmen: { id: string; nickname: string; active: boolean }[]
    selectedSalesmanId: string | null
    onSelectSalesman: (id: string) => void
}

export function GroupBookingCart({
    cart,
    activeGuestId,
    onSelectGuest,
    onAddGuest,
    onRemoveGuest,
    onUpdateGuest,
    onCopyPrevious,
    onCheckout,
    onValidateVoucher,
    salesmen,
    selectedSalesmanId,
    onSelectSalesman
}: GroupBookingCartProps) {

    const total = cart.reduce((sum, item) => {
        if (!item.treatment) return sum
        if (item.voucherId) return sum
        const price = item.treatment.price_thb
        const discount = item.manualDiscount || 0
        return sum + Math.max(0, price - discount)
    }, 0)

    const isCheckoutDisabled = cart.some(g => {
        if (!g.treatment) return true
        if (g.sendConfirmation && !g.email) return true
        return false
    })

    const [voucherInput, setVoucherInput] = React.useState("")

    return (
        <div className="h-full flex flex-col bg-card border-l border-primary/10 shadow-2xl relative z-20">
            {/* Header */}
            <div className="p-6 border-b border-primary/10 flex items-center justify-between bg-card/50 backdrop-blur-md">
                <div>
                    <h2 className="font-serif text-2xl text-primary tracking-wide">Guest Console</h2>
                    <p className="text-[10px] uppercase tracking-widest text-foreground/40 mt-1">Reference: {new Date().toLocaleDateString()}</p>
                </div>
                <div className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    <span className="text-xs font-bold text-primary">{cart.length} GUESTS</span>
                </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <AnimatePresence>
                    {cart.map((guest, index) => (
                        <motion.div
                            key={guest.tempId}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onClick={() => onSelectGuest(guest.tempId)}
                            className={`relative rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${activeGuestId === guest.tempId ? "border-primary bg-[#0c2627] shadow-[0_0_30px_rgba(209,192,155,0.05)] z-10" : "border-transparent bg-[#042A40]/30 hover:bg-[#042A40]/50"}`}
                        >
                            <div className="p-5 space-y-4">
                                {/* Top Row: Name & Remove */}
                                <div className="flex items-center justify-between">
                                    <input
                                        type="text"
                                        value={guest.name}
                                        onChange={(e) => onUpdateGuest(guest.tempId, { name: e.target.value })}
                                        onFocus={() => onSelectGuest(guest.tempId)}
                                        className="bg-white border-2 border-gray-300 rounded-lg px-4 py-3 font-bold text-lg text-black focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-gray-400 w-full transition-all shadow-sm"
                                        placeholder={`Guest ${index + 1} Name`}
                                    />
                                    {cart.length > 1 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onRemoveGuest(guest.tempId) }}
                                            className="text-foreground/40 hover:text-red-500 transition-colors ml-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Controls Row */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectGuest(guest.tempId);
                                            onUpdateGuest(guest.tempId, { sendConfirmation: !guest.sendConfirmation });
                                        }}
                                        className={`w-full py-3 px-3 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-2 ${guest.sendConfirmation ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/10 text-foreground/40 hover:border-foreground/20"}`}
                                    >
                                        <Mail className="w-4 h-4" />
                                        {guest.sendConfirmation ? "Send Email" : "No Email"}
                                    </button>
                                </div>

                                {/* Summary Row */}
                                {activeGuestId !== guest.tempId && (guest.phone || guest.room) && (
                                    <div className="flex gap-3 text-[10px] uppercase font-bold text-foreground/50">
                                        {guest.room && <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" /> Room {guest.room}</span>}
                                        {guest.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {guest.phone}</span>}
                                    </div>
                                )}

                                {/* Expanded Details (Inputs) */}
                                <AnimatePresence>
                                    {activeGuestId === guest.tempId && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                                            <div className="grid grid-cols-2 gap-3 pt-2">

                                                {/* Email (Full width) */}
                                                <div className="col-span-2 relative">
                                                    <Mail className={`absolute left-3 top-3 w-4 h-4 z-10 ${guest.sendConfirmation && !guest.email ? "text-red-500" : "text-gray-400"}`} />
                                                    <input
                                                        type="email"
                                                        value={guest.email || ""}
                                                        onChange={(e) => onUpdateGuest(guest.tempId, { email: e.target.value })}
                                                        className={`w-full pl-9 pr-3 py-2.5 text-sm bg-white border-2 rounded-xl focus:outline-none transition-colors text-black placeholder:text-gray-400 relative z-0 ${guest.sendConfirmation && !guest.email ? "border-red-300 bg-red-50" : "border-gray-200 focus:border-primary/50"}`}
                                                        placeholder={guest.sendConfirmation ? "Required for confirmation" : "Email (Optional)"}
                                                    />
                                                </div>

                                                {/* Phone */}
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400 z-10" />
                                                    <input
                                                        type="tel"
                                                        value={guest.phone || ""}
                                                        onChange={(e) => onUpdateGuest(guest.tempId, { phone: e.target.value })}
                                                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary/50 text-black placeholder:text-gray-400"
                                                        placeholder="Phone"
                                                    />
                                                </div>

                                                {/* Nationality */}
                                                <div className="relative">
                                                    <Globe className="absolute left-3 top-3 w-4 h-4 text-gray-400 z-10" />
                                                    <input
                                                        type="text"
                                                        list="nationality-list-pos"
                                                        value={guest.nationality || ""}
                                                        onChange={(e) => onUpdateGuest(guest.tempId, { nationality: e.target.value })}
                                                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary/50 text-black placeholder:text-gray-400"
                                                        placeholder="Type to search..."
                                                    />
                                                    <datalist id="nationality-list-pos">
                                                        {nationalities.map(n => (
                                                            <option key={n} value={n} />
                                                        ))}
                                                    </datalist>
                                                </div>

                                                {/* Source Selection */}
                                                <div className="relative col-span-2">
                                                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400 z-10" />
                                                    <select
                                                        value={guest.source || "Walk-in"}
                                                        onChange={(e) => onUpdateGuest(guest.tempId, { source: e.target.value })}
                                                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary/50 text-black appearance-none"
                                                    >
                                                        <option value="Walk-in">Source: Walk-in</option>
                                                        <option value="In-House Guest">Source: In-House Guest</option>
                                                        <option value="Google Maps">Source: Google Maps</option>
                                                        <option value="Facebook">Source: Facebook</option>
                                                        <option value="Instagram">Source: Instagram</option>
                                                        <option value="Other">Source: Other</option>
                                                    </select>
                                                </div>

                                                {/* Room # (Only valid if In-House Guest) */}
                                                {guest.source === "In-House Guest" && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        className="relative col-span-2"
                                                    >
                                                        <BedDouble className="absolute left-3 top-3 w-4 h-4 text-amber-600 z-10" />
                                                        <input
                                                            type="text"
                                                            value={guest.room || ""}
                                                            onChange={(e) => onUpdateGuest(guest.tempId, { room: e.target.value })}
                                                            className="w-full pl-9 pr-3 py-2.5 text-sm bg-amber-50 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 text-amber-900 placeholder:text-amber-900/40"
                                                            placeholder="Room Number (Required)"
                                                            autoFocus
                                                        />
                                                    </motion.div>
                                                )}

                                            </div>

                                            {/* Voucher Redemption */}
                                            {onValidateVoucher && !guest.voucherId && (
                                                <div className="pt-2 border-t border-dashed border-white/20 space-y-2">
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Scan Voucher"
                                                            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono uppercase text-black placeholder:text-gray-400"
                                                            value={voucherInput}
                                                            onChange={(e) => setVoucherInput(e.target.value)}
                                                        />
                                                        <Button
                                                            size="sm"
                                                            className="text-[10px]"
                                                            onClick={() => {
                                                                const voucher = onValidateVoucher(voucherInput)
                                                                if (voucher) {
                                                                    onUpdateGuest(guest.tempId, {
                                                                        voucherId: voucher.id,
                                                                        voucherCode: voucher.code,
                                                                        manualDiscount: 0,
                                                                        treatment: {
                                                                            id: voucher.treatmentId,
                                                                            title: voucher.treatmentTitle,
                                                                            price_thb: 0,
                                                                            duration_min: 0
                                                                        }
                                                                    })
                                                                    setVoucherInput("")
                                                                } else {
                                                                    alert("Invalid or Used Code")
                                                                }
                                                            }}
                                                        >
                                                            Apply
                                                        </Button>
                                                    </div>

                                                    {/* Manual Discount Input */}
                                                    <div className="flex items-center justify-between bg-white/5 border border-white/10 p-2 rounded-lg">
                                                        <span className="text-[10px] uppercase text-foreground/40 font-bold tracking-wider">Discount Override</span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs text-foreground/40 font-bold">-฿</span>
                                                            <input
                                                                type="number"
                                                                className="w-20 bg-transparent text-right text-xs font-mono font-bold focus:outline-none border-b border-dashed border-foreground/20 text-foreground"
                                                                placeholder="0"
                                                                value={guest.manualDiscount || ""}
                                                                onChange={(e) => onUpdateGuest(guest.tempId, { manualDiscount: Number(e.target.value) })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Treatment Display */}
                                {guest.treatment ? (
                                    <div className="bg-[#042A40]/40 rounded-xl p-4 border border-white/10 flex justify-between items-center text-sm hover:bg-[#042A40]/60 transition-colors">
                                        <div>
                                            <div className="text-primary font-bold font-serif text-base flex items-center gap-2">
                                                {guest.treatment.title}
                                                {guest.voucherId && <span className="bg-primary text-[#0A2021] text-[9px] px-1.5 rounded uppercase tracking-wider">Prepaid</span>}
                                            </div>
                                            <div className="text-[10px] uppercase tracking-wider text-foreground/40">{guest.treatment.duration_min > 0 ? `${guest.treatment.duration_min} min` : 'Voucher'} • {guest.time}</div>
                                            {guest.voucherCode && <div className="text-[9px] font-mono text-emerald-400 mt-1">Code: {guest.voucherCode}</div>}
                                        </div>
                                        <div className="text-right">
                                            {guest.manualDiscount ? (
                                                <>
                                                    <div className="text-[10px] text-foreground/30 line-through">฿{guest.treatment.price_thb.toLocaleString()}</div>
                                                    <div className="font-mono font-medium text-emerald-400">฿{Math.max(0, guest.treatment.price_thb - guest.manualDiscount).toLocaleString()}</div>
                                                </>
                                            ) : (
                                                <div className="font-mono font-medium text-foreground">฿{guest.treatment.price_thb.toLocaleString()}</div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-xs text-foreground/40 italic flex items-center justify-between border-2 border-dashed border-white/10 p-4 rounded-xl hover:bg-primary/5 transition-colors group">
                                        <span className="group-hover:text-primary transition-colors">Select a ritual from the grid...</span>
                                    </div>
                                )}

                                {/* Copy Previous Button - Always visible if previous guest has treatment */}
                                {index > 0 && cart[index - 1].treatment && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full h-8 text-[10px] bg-white border border-gray-200 hover:border-primary/50 text-gray-600 shadow-sm mt-2"
                                        onClick={(e) => { e.stopPropagation(); onCopyPrevious(guest.tempId) }}
                                    >
                                        <Copy className="w-3 h-3 mr-1" /> Copy Previous Guest's Treatment
                                    </Button>
                                )}
                            </div>

                            {activeGuestId === guest.tempId && (
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                <Button
                    variant="ghost"
                    onClick={onAddGuest}
                    className="w-full py-6 border-2 border-dashed border-white/10 hover:border-primary/40 hover:bg-primary/5 text-foreground/40 hover:text-primary rounded-xl"
                >
                    <Plus className="w-4 h-4 mr-2" /> Add Another Guest
                </Button>
            </div>

            {/* Footer / Checkout */}
            <div className="p-6 bg-card border-t border-primary/10 pb-10">
                {/* Salesman Selector */}
                <div className="mb-6">
                    <label className="text-[10px] uppercase font-bold text-foreground/40 mb-2 block tracking-wider">Sold By (Commission)</label>
                    <select
                        value={selectedSalesmanId || ""}
                        onChange={(e) => onSelectSalesman(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-xl p-3 text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="">-- No Commission --</option>
                        {salesmen.filter(s => s.active).map(s => (
                            <option key={s.id} value={s.id}>{s.nickname}</option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-between items-end mb-6">
                    <div className="text-xs text-foreground/50 uppercase tracking-widest font-bold">Total Estimate</div>
                    <div className="text-3xl font-serif text-primary">฿{total.toLocaleString()}</div>
                </div>

                <Button
                    size="lg"
                    onClick={onCheckout}
                    className={`w-full rounded-xl py-8 text-lg font-serif shadow-xl transition-all ${isCheckoutDisabled ? "bg-gray-200 text-gray-600 shadow-none cursor-not-allowed" : "bg-primary hover:bg-primary/90 !text-white shadow-primary/20"}`}
                    style={!isCheckoutDisabled ? { color: 'white' } : undefined}
                    disabled={isCheckoutDisabled}
                >
                    {cart.some(g => g.sendConfirmation && !g.email) ? (
                        <span className="flex items-center"><Mail className="w-5 h-5 mr-2" /> Email Required</span>
                    ) : (
                        <span className="flex items-center"><Check className="w-5 h-5 mr-3" /> Complete Booking</span>
                    )}
                </Button>
            </div>
        </div>
    )
}
