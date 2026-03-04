"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Search, Gift, User, ChevronRight, Check, Minus, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Voucher, Client } from "@/types"

interface GiftModalProps {
    voucher: Voucher
    sender: Client
    clients: Client[]
    onClose: () => void
    onGiftComplete: () => void
}

export function GiftModal({ voucher, sender, clients, onClose, onGiftComplete }: GiftModalProps) {
    const [step, setStep] = useState<"search" | "confirm" | "sending" | "success">("search")
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedRecipient, setSelectedRecipient] = useState<Client | null>(null)
    const [credits, setCredits] = useState(1)
    const [error, setError] = useState<string | null>(null)

    const isPackage = voucher.type === "package"
    const maxCredits = isPackage ? (voucher.creditsRemaining || 1) : 1

    // Filter clients (exclude self, search by name/email)
    const filteredClients = useMemo(() => {
        if (!searchQuery.trim()) return []
        const q = searchQuery.toLowerCase()
        return clients
            .filter(c => c.id !== sender.id)
            .filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.email.toLowerCase().includes(q)
            )
            .slice(0, 8)
    }, [clients, searchQuery, sender.id])

    // Parse treatment name from "120m | Signature Massage" format
    const treatmentName = useMemo(() => {
        const raw = voucher.treatmentTitle || "Experience"
        const match = raw.match(/^\d+m\s*\|\s*(.*)/)
        return match ? match[1] : raw
    }, [voucher.treatmentTitle])

    const handleGift = async () => {
        if (!selectedRecipient) return
        setStep("sending")
        setError(null)

        try {
            const res = await fetch("/api/gift", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    voucherId: voucher.id,
                    senderId: sender.id,
                    senderName: sender.name,
                    recipientId: selectedRecipient.id,
                    recipientName: selectedRecipient.name,
                    credits: isPackage ? credits : 1,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Gift failed")
            }

            setStep("success")
            // Auto close after success animation
            setTimeout(() => {
                onGiftComplete()
            }, 2500)
        } catch (err: any) {
            setError(err.message)
            setStep("confirm")
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-end sm:items-center justify-center"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-md bg-[#0A1F20] border border-[#D1C09B]/20 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-white/5 flex justify-between items-start shrink-0">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.3em] text-[#D1C09B]/60 font-bold mb-1">Gift Experience</div>
                        <h3 className="text-xl font-serif text-white">{treatmentName}</h3>
                        {isPackage && (
                            <div className="text-xs text-emerald-400/80 mt-1 font-medium">
                                {voucher.creditsRemaining}/{voucher.creditsTotal} sessions available
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <X className="w-4 h-4 text-white/60" />
                    </button>
                </div>

                {/* Step: Search */}
                <AnimatePresence mode="wait">
                    {step === "search" && (
                        <motion.div
                            key="search"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="p-6 space-y-4 overflow-y-auto flex-1"
                        >
                            <div className="text-sm text-white/50 mb-2">Who would you like to gift this to?</div>

                            {/* Search input */}
                            <div className="relative">
                                <Search className="w-4 h-4 text-white/30 absolute left-4 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#D1C09B]/40 transition-colors"
                                />
                            </div>

                            {/* Results */}
                            <div className="space-y-2">
                                {filteredClients.map(client => (
                                    <button
                                        key={client.id}
                                        onClick={() => {
                                            setSelectedRecipient(client)
                                            setStep("confirm")
                                        }}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-[#D1C09B]/20 transition-all group text-left"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-[#D1C09B]/10 flex items-center justify-center text-[#D1C09B] shrink-0">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-white font-medium text-sm truncate">{client.name}</div>
                                            <div className="text-white/40 text-xs truncate">{client.email}</div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-[#D1C09B] transition-colors shrink-0" />
                                    </button>
                                ))}
                                {searchQuery.length > 0 && filteredClients.length === 0 && (
                                    <div className="text-center py-8 text-white/30 text-sm">
                                        No members found matching &ldquo;{searchQuery}&rdquo;
                                    </div>
                                )}
                                {searchQuery.length === 0 && (
                                    <div className="text-center py-8 text-white/20 text-sm">
                                        Start typing to search members
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Step: Confirm */}
                    {step === "confirm" && selectedRecipient && (
                        <motion.div
                            key="confirm"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="p-6 space-y-6 overflow-y-auto flex-1"
                        >
                            {/* Recipient */}
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                                <div className="w-12 h-12 rounded-full bg-[#D1C09B]/10 flex items-center justify-center text-[#D1C09B]">
                                    <User className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-white font-serif text-lg">{selectedRecipient.name}</div>
                                    <div className="text-white/40 text-xs">{selectedRecipient.email}</div>
                                </div>
                                <button
                                    onClick={() => { setStep("search"); setSelectedRecipient(null) }}
                                    className="text-xs text-[#D1C09B]/60 hover:text-[#D1C09B] transition-colors underline"
                                >
                                    Change
                                </button>
                            </div>

                            {/* Credit selector (packages only) */}
                            {isPackage && (
                                <div className="space-y-3">
                                    <div className="text-sm text-white/50">How many sessions to gift?</div>
                                    <div className="flex items-center justify-center gap-6">
                                        <button
                                            onClick={() => setCredits(c => Math.max(1, c - 1))}
                                            disabled={credits <= 1}
                                            className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                        >
                                            <Minus className="w-5 h-5" />
                                        </button>
                                        <div className="text-center">
                                            <div className="text-5xl font-light text-white font-mono">{credits}</div>
                                            <div className="text-xs text-white/30 mt-1">session{credits !== 1 ? "s" : ""}</div>
                                        </div>
                                        <button
                                            onClick={() => setCredits(c => Math.min(maxCredits, c + 1))}
                                            disabled={credits >= maxCredits}
                                            className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Summary */}
                            <div className="bg-[#051818] border border-white/10 rounded-xl p-4 space-y-3">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Summary</div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-white/60">You will have</span>
                                    <span className="text-white font-medium">
                                        {isPackage
                                            ? `${(voucher.creditsRemaining || 1) - credits}/${voucher.creditsTotal} sessions`
                                            : "Voucher transferred"
                                        }
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-white/60">{selectedRecipient.name} gets</span>
                                    <span className="text-emerald-400 font-medium">
                                        {isPackage ? `${credits} session${credits !== 1 ? "s" : ""}` : treatmentName}
                                    </span>
                                </div>
                            </div>

                            {error && (
                                <div className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                    {error}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="space-y-3 pt-2">
                                <Button
                                    onClick={handleGift}
                                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#D1C09B] to-[#B89A6A] text-[#051818] font-bold text-sm uppercase tracking-wider hover:brightness-110 transition-all shadow-[0_0_30px_rgba(209,192,155,0.2)]"
                                >
                                    <Gift className="w-5 h-5 mr-2" />
                                    Send Gift
                                </Button>
                                <button
                                    onClick={onClose}
                                    className="w-full text-center text-white/30 hover:text-white/60 text-sm transition-colors py-2"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step: Sending */}
                    {step === "sending" && (
                        <motion.div
                            key="sending"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-12 flex flex-col items-center justify-center gap-6"
                        >
                            <div className="w-16 h-16 rounded-full bg-[#D1C09B]/10 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-[#D1C09B] animate-spin" />
                            </div>
                            <div className="text-center">
                                <div className="text-white font-serif text-lg">Sending gift...</div>
                                <div className="text-white/40 text-sm mt-1">Processing your generous gesture</div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step: Success */}
                    {step === "success" && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-12 flex flex-col items-center justify-center gap-6"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", damping: 10, stiffness: 200, delay: 0.2 }}
                                className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center"
                            >
                                <Check className="w-10 h-10 text-emerald-400" />
                            </motion.div>
                            <div className="text-center">
                                <div className="text-white font-serif text-xl mb-1">Gift Sent! 🎁</div>
                                <div className="text-white/50 text-sm">
                                    {selectedRecipient?.name} will see {isPackage ? `${credits} session${credits !== 1 ? "s" : ""}` : "the voucher"} in their portal.
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    )
}
