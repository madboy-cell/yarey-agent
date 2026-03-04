"use client"

import { useState } from "react"
import { Gift, X, Minus, Plus, Loader2, Copy, Check, ArrowDownCircle } from "lucide-react"
import QRCode from "react-qr-code"
import { useGuest } from "../layout"
import { Voucher } from "@/types"

type GiftStep = "idle" | "credits" | "generated"

export default function GuestVouchers() {
    const { member, vouchers, platform } = useGuest()

    // QR view
    const [qrVoucher, setQrVoucher] = useState<Voucher | null>(null)

    // Gift send state
    const [giftStep, setGiftStep] = useState<GiftStep>("idle")
    const [giftVoucher, setGiftVoucher] = useState<Voucher | null>(null)
    const [credits, setCredits] = useState(1)
    const [sending, setSending] = useState(false)
    const [giftCode, setGiftCode] = useState("")
    const [giftError, setGiftError] = useState("")
    const [copied, setCopied] = useState(false)

    // Gift claim state
    const [showClaim, setShowClaim] = useState(false)
    const [claimCode, setClaimCode] = useState("")
    const [claiming, setClaiming] = useState(false)
    const [claimResult, setClaimResult] = useState<string | null>(null)
    const [claimError, setClaimError] = useState("")

    const active = vouchers.filter(v => v.status === "ISSUED")

    // ─── Gift Send ───────────────
    const startGift = (v: Voucher) => {
        setGiftVoucher(v)
        setGiftError("")
        setCopied(false)
        setGiftCode("")
        setCredits(1)
        setGiftStep("credits")
        // Always show confirmation — API is called only when user taps Generate
    }

    const handleGenerate = async (v: Voucher | null = giftVoucher, c: number = credits) => {
        if (!v || !member) return
        setSending(true)
        setGiftError("")
        try {
            const res = await fetch("/api/gift/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    voucherId: v.id,
                    senderId: member.id,
                    senderName: member.name,
                    credits: c,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed")
            setGiftCode(data.code)
            setGiftStep("generated")
        } catch (err: any) {
            setGiftError(err.message)
        }
        setSending(false)
    }

    const copyCode = async () => {
        try { await navigator.clipboard.writeText(giftCode) } catch { }
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const resetGift = () => {
        setGiftStep("idle")
        setGiftVoucher(null)
        setGiftCode("")
        setGiftError("")
        setCopied(false)
    }

    // ─── Gift Claim ──────────────
    const handleClaim = async () => {
        if (!claimCode || !member) return
        setClaiming(true)
        setClaimError("")
        try {
            const res = await fetch("/api/gift/claim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: claimCode.toUpperCase().trim(),
                    recipientId: member.id,
                    recipientName: member.name,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Invalid code")
            setClaimResult(data.treatment || "Gift claimed!")
        } catch (err: any) {
            setClaimError(err.message)
        }
        setClaiming(false)
    }

    const resetClaim = () => {
        setShowClaim(false)
        setClaimCode("")
        setClaimResult(null)
        setClaimError("")
    }

    const maxCredits = giftVoucher?.type === "package" ? (giftVoucher.creditsRemaining || 1) : 1

    // ─── VIEW: QR Code ───────────
    if (qrVoucher) {
        return (
            <div className="min-h-screen flex flex-col">
                <header className="sticky top-0 z-50 backdrop-blur-xl border-b px-5 py-3" style={{ background: "color-mix(in srgb, var(--g-bg) 80%, transparent)", borderColor: "var(--g-border)" }}>
                    <div className="max-w-md mx-auto flex justify-between items-center">
                        <div className="text-lg font-serif" style={{ color: "var(--g-accent)" }}>📱 Show QR</div>
                        <button onClick={() => setQrVoucher(null)} className="p-1.5 rounded-lg active:scale-90 transition-transform" style={{ background: "var(--g-surface)" }}>
                            <X className="w-4 h-4" style={{ color: "var(--g-text-muted)" }} />
                        </button>
                    </div>
                </header>
                <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
                    <div className="text-center">
                        <div className="font-serif text-lg" style={{ color: "var(--g-text)" }}>{qrVoucher.treatmentTitle}</div>
                        <div className="text-xs font-mono mt-1" style={{ color: "var(--g-text-muted)" }}>{qrVoucher.code}</div>
                    </div>
                    <div className="rounded-2xl p-4" style={{ background: "#ffffff" }}>
                        <QRCode value={qrVoucher.code} size={180} />
                    </div>
                    <p className="text-[11px] text-center" style={{ color: "var(--g-text-secondary)" }}>แสดง QR นี้ให้พนักงาน<br />Show this QR to staff</p>
                    <button onClick={() => setQrVoucher(null)} className="w-full max-w-xs py-3 rounded-xl text-sm font-bold active:scale-[0.97] transition-transform"
                        style={{ background: "var(--g-accent)", color: "var(--g-accent-text)" }}>Done</button>
                </div>
            </div>
        )
    }

    // ─── VIEW: Gift Send ─────────
    if (giftStep !== "idle") {
        return (
            <div className="min-h-screen">
                <header className="sticky top-0 z-50 backdrop-blur-xl border-b px-5 py-3" style={{ background: "color-mix(in srgb, var(--g-bg) 80%, transparent)", borderColor: "var(--g-border)" }}>
                    <div className="max-w-md mx-auto flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4" style={{ color: "#f472b6" }} />
                            <span className="text-sm font-serif" style={{ color: "var(--g-accent)" }}>
                                {giftStep === "generated" ? "Gift Code Ready" : "ส่งของขวัญ · Gift"}
                            </span>
                        </div>
                        <button onClick={resetGift} className="p-1.5 rounded-lg active:scale-90 transition-transform" style={{ background: "var(--g-surface)" }}>
                            <X className="w-4 h-4" style={{ color: "var(--g-text-muted)" }} />
                        </button>
                    </div>
                </header>

                <div className="max-w-md mx-auto px-5 pt-6 space-y-5">
                    {/* Voucher info */}
                    <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "rgba(244,114,182,0.08)", border: "1px solid rgba(244,114,182,0.15)" }}>
                        <span className="text-lg">🎁</span>
                        <div className="flex-1">
                            <div className="text-sm font-bold">{giftVoucher?.treatmentTitle}</div>
                            <div className="text-[10px]" style={{ color: "var(--g-text-muted)" }}>
                                {giftVoucher?.type === "package" ? `${giftVoucher.creditsRemaining} credits left` : giftVoucher?.code}
                            </div>
                        </div>
                    </div>

                    {/* Step: Confirm / Credits */}
                    {giftStep === "credits" && (
                        <div className="space-y-5">
                            {giftVoucher?.type === "package" && (giftVoucher.creditsRemaining || 0) > 1 ? (
                                <>
                                    <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--g-text-muted)" }}>
                                        จำนวนครั้ง · Credits to Gift
                                    </div>
                                    <div className="flex items-center justify-center gap-6 py-3">
                                        <button onClick={() => setCredits(Math.max(1, credits - 1))}
                                            className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                                            style={{ background: "var(--g-surface)", border: "1px solid var(--g-border)" }}>
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <div className="text-center">
                                            <div className="text-4xl font-mono font-bold" style={{ color: "var(--g-accent)" }}>{credits}</div>
                                            <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--g-text-muted)" }}>credits</div>
                                        </div>
                                        <button onClick={() => setCredits(Math.min(maxCredits, credits + 1))}
                                            className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                                            style={{ background: "var(--g-surface)", border: "1px solid var(--g-border)" }}>
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="text-[10px] text-center" style={{ color: "var(--g-text-muted)" }}>
                                        Remaining after: {(giftVoucher?.creditsRemaining || 0) - credits}/{giftVoucher?.creditsTotal}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-4 space-y-2">
                                    <div className="text-4xl">🎁</div>
                                    <div className="text-sm" style={{ color: "var(--g-text-secondary)" }}>
                                        ส่ง voucher นี้ให้เพื่อน?
                                    </div>
                                    <div className="text-xs" style={{ color: "var(--g-text-muted)" }}>
                                        Send this voucher to a friend?
                                    </div>
                                </div>
                            )}
                            {giftError && (
                                <div className="p-3 rounded-xl text-xs text-center" style={{ background: "rgba(239,68,68,0.1)", color: "var(--g-danger)" }}>{giftError}</div>
                            )}
                            <button onClick={() => handleGenerate()} disabled={sending}
                                className="w-full py-3.5 rounded-xl font-bold active:scale-[0.97] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ background: "linear-gradient(135deg, #f472b6, #c084fc)", color: "#fff" }}>
                                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Gift className="w-4 h-4" /> Generate Gift Code</>}
                            </button>
                        </div>
                    )}

                    {/* Step: Generated */}
                    {giftStep === "generated" && (
                        <div className="space-y-5 text-center">
                            <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--g-text-muted)" }}>
                                ส่งโค้ดนี้ให้เพื่อน · Send This Code
                            </div>

                            <button
                                onClick={copyCode}
                                className="w-full rounded-2xl p-6 active:scale-[0.98] transition-transform"
                                style={{ background: "var(--g-surface)", border: "2px dashed var(--g-border)" }}
                            >
                                <div className="text-3xl font-mono font-black tracking-[0.2em]" style={{ color: "var(--g-accent)" }}>
                                    {giftCode}
                                </div>
                                <div className="flex items-center justify-center gap-1 mt-2">
                                    {copied
                                        ? <><Check className="w-3.5 h-3.5" style={{ color: "var(--g-success)" }} /><span className="text-[10px] font-bold" style={{ color: "var(--g-success)" }}>Copied!</span></>
                                        : <><Copy className="w-3.5 h-3.5" style={{ color: "var(--g-text-muted)" }} /><span className="text-[10px]" style={{ color: "var(--g-text-muted)" }}>Tap to copy</span></>
                                    }
                                </div>
                            </button>

                            <div className="text-[10px]" style={{ color: "var(--g-text-muted)" }}>
                                ⏳ Code expires in 48 hours
                            </div>

                            <div className="rounded-xl p-3 text-[10px] text-left space-y-1" style={{ background: "var(--g-surface)", border: "1px solid var(--g-border)" }}>
                                <div className="font-bold" style={{ color: "var(--g-text-secondary)" }}>บอกเพื่อน · Tell your friend:</div>
                                <div style={{ color: "var(--g-text-muted)" }}>1. เปิดแอป Sanctuary</div>
                                <div style={{ color: "var(--g-text-muted)" }}>2. ไปที่แท็บ Vouchers</div>
                                <div style={{ color: "var(--g-text-muted)" }}>3. กด "Claim Gift" แล้ววางโค้ด</div>
                            </div>

                            <button onClick={resetGift}
                                className="w-full py-3 rounded-xl text-sm font-bold active:scale-[0.97]"
                                style={{ background: "var(--g-accent)", color: "var(--g-accent-text)" }}>
                                เสร็จสิ้น · Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // ─── VIEW: Claim Gift ────────
    if (showClaim) {
        return (
            <div className="min-h-screen">
                <header className="sticky top-0 z-50 backdrop-blur-xl border-b px-5 py-3" style={{ background: "color-mix(in srgb, var(--g-bg) 80%, transparent)", borderColor: "var(--g-border)" }}>
                    <div className="max-w-md mx-auto flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <ArrowDownCircle className="w-4 h-4" style={{ color: "#f472b6" }} />
                            <span className="text-sm font-serif" style={{ color: "var(--g-accent)" }}>รับของขวัญ · Claim Gift</span>
                        </div>
                        <button onClick={resetClaim} className="p-1.5 rounded-lg active:scale-90 transition-transform" style={{ background: "var(--g-surface)" }}>
                            <X className="w-4 h-4" style={{ color: "var(--g-text-muted)" }} />
                        </button>
                    </div>
                </header>

                <div className="max-w-md mx-auto px-5 pt-6 space-y-5">
                    {claimResult ? (
                        <div className="text-center space-y-4 py-8">
                            <div className="text-5xl">🎉</div>
                            <div className="text-lg font-serif" style={{ color: "var(--g-accent)" }}>ได้รับของขวัญแล้ว!</div>
                            <div className="text-sm font-bold">{claimResult}</div>
                            <div className="text-[10px]" style={{ color: "var(--g-text-muted)" }}>Voucher added to your account</div>
                            <button onClick={resetClaim}
                                className="w-full py-3 rounded-xl text-sm font-bold active:scale-[0.97]"
                                style={{ background: "var(--g-accent)", color: "var(--g-accent-text)" }}>
                                View Vouchers
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="text-center py-4">
                                <div className="text-4xl mb-2">🎁</div>
                                <div className="text-sm" style={{ color: "var(--g-text-secondary)" }}>วางโค้ดที่ได้รับจากเพื่อน</div>
                                <div className="text-xs" style={{ color: "var(--g-text-muted)" }}>Enter the gift code from your friend</div>
                            </div>
                            <input
                                type="text"
                                value={claimCode}
                                onChange={e => setClaimCode(e.target.value.toUpperCase())}
                                placeholder="GIFT-XXXX"
                                autoFocus
                                className="w-full py-4 rounded-xl text-center text-2xl font-mono font-bold tracking-[0.3em] uppercase outline-none"
                                style={{ background: "var(--g-surface)", border: "1px solid var(--g-border)", color: "var(--g-accent)" }}
                                onFocus={e => e.target.style.borderColor = "var(--g-accent)"}
                                onBlur={e => e.target.style.borderColor = "var(--g-border)"}
                            />
                            {claimError && (
                                <div className="p-3 rounded-xl text-xs text-center" style={{ background: "rgba(239,68,68,0.1)", color: "var(--g-danger)" }}>{claimError}</div>
                            )}
                            <button onClick={handleClaim} disabled={claiming || !claimCode}
                                className="w-full py-3.5 rounded-xl font-bold active:scale-[0.97] transition-transform disabled:opacity-40 flex items-center justify-center gap-2"
                                style={{ background: "linear-gradient(135deg, #f472b6, #c084fc)", color: "#fff" }}>
                                {claiming ? <><Loader2 className="w-4 h-4 animate-spin" /> Claiming...</> : <><Gift className="w-4 h-4" /> Claim Gift</>}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // ─── VIEW: Default — Voucher List ───
    return (
        <div>
            <header className="sticky top-0 z-50 backdrop-blur-xl border-b px-5 py-3" style={{ background: "color-mix(in srgb, var(--g-bg) 80%, transparent)", borderColor: "var(--g-border)" }}>
                <div className="max-w-md mx-auto flex justify-between items-center">
                    <div className="text-lg font-serif" style={{ color: "var(--g-accent)" }}>🎫 Vouchers</div>
                    <button
                        onClick={() => setShowClaim(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-transform"
                        style={{ background: "rgba(244,114,182,0.12)", border: "1px solid rgba(244,114,182,0.2)", color: "#f472b6" }}
                    >
                        <ArrowDownCircle className="w-3.5 h-3.5" /> Claim Gift
                    </button>
                </div>
            </header>

            <div className="max-w-md mx-auto px-5 pt-5 space-y-3">
                {active.length > 0 ? (
                    <>
                        <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--g-success)" }}>
                            ใช้งานได้ · Active ({active.length})
                        </div>
                        {active.map((v, i) => {
                            const isGiftable = !v.boundType && (!v.expiresAt || new Date(v.expiresAt) > new Date())
                            return (
                                <div
                                    key={v.id}
                                    className="rounded-2xl p-4 space-y-3"
                                    style={{ background: "var(--g-surface)", border: "1px solid var(--g-border)" }}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-sm font-bold">{v.treatmentTitle}</div>
                                            <div className="text-[10px] font-mono mt-0.5" style={{ color: "var(--g-text-muted)" }}>
                                                Code: {v.code}
                                            </div>
                                        </div>
                                        <span className="text-[9px] uppercase px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(16,185,129,0.12)", color: "var(--g-success)" }}>
                                            {v.type === "package" ? `${v.creditsRemaining}/${v.creditsTotal}` : "Active"}
                                        </span>
                                    </div>

                                    {v.type === "package" && v.creditsTotal && v.creditsRemaining !== undefined && (
                                        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--g-border)" }}>
                                            <div className="h-full rounded-full transition-all" style={{ width: `${(v.creditsRemaining / v.creditsTotal) * 100}%`, background: "var(--g-success)" }} />
                                        </div>
                                    )}

                                    {v.expiresAt && (
                                        <div className="text-[10px]" style={{ color: "var(--g-text-muted)" }}>
                                            หมดอายุ: {new Date(v.expiresAt).toLocaleDateString("th-TH")}
                                        </div>
                                    )}

                                    {v.giftedFrom && (
                                        <div className="text-[10px]" style={{ color: "#f472b6" }}>
                                            🎁 Gifted from {v.giftedFromName || "a friend"}
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setQrVoucher(v)}
                                            className="flex-1 py-2.5 rounded-xl text-xs font-bold active:scale-[0.97] transition-transform"
                                            style={{ background: "var(--g-accent)", color: "var(--g-accent-text)" }}
                                        >
                                            📱 Show QR
                                        </button>
                                        {isGiftable && (
                                            <button
                                                onClick={() => startGift(v)}
                                                className="py-2.5 px-4 rounded-xl text-xs font-bold active:scale-[0.97] transition-transform flex items-center gap-1.5"
                                                style={{ background: "rgba(244,114,182,0.12)", border: "1px solid rgba(244,114,182,0.2)", color: "#f472b6" }}
                                            >
                                                <Gift className="w-3.5 h-3.5" /> Gift
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </>
                ) : (
                    <div className="text-center py-16">
                        <div className="text-4xl mb-3">🎫</div>
                        <div className="text-sm" style={{ color: "var(--g-text-secondary)" }}>ยังไม่มี voucher</div>
                        <div className="text-xs mt-1" style={{ color: "var(--g-text-muted)" }}>No active vouchers</div>
                    </div>
                )}
            </div>
        </div>
    )
}
