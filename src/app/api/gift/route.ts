import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, doc, getDoc, updateDoc, addDoc } from "firebase/firestore"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { voucherId, senderId, senderName, recipientId, recipientName, credits } = body

        // Validate required fields
        if (!voucherId || !senderId || !recipientId || !recipientName || !credits) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        if (senderId === recipientId) {
            return NextResponse.json({ error: "Cannot gift to yourself" }, { status: 400 })
        }

        // Get original voucher
        const voucherRef = doc(db, "vouchers", voucherId)
        const voucherSnap = await getDoc(voucherRef)

        if (!voucherSnap.exists()) {
            return NextResponse.json({ error: "Voucher not found" }, { status: 404 })
        }

        const voucher = { id: voucherSnap.id, ...voucherSnap.data() } as any

        // Validate ownership
        if (voucher.clientId !== senderId) {
            return NextResponse.json({ error: "You don't own this voucher" }, { status: 403 })
        }

        if (voucher.status !== "ISSUED") {
            return NextResponse.json({ error: "Voucher is not active" }, { status: 400 })
        }

        const now = new Date().toISOString()
        const giftCode = `GIFT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

        if (voucher.type === "package") {
            // --- PACKAGE GIFT: Split credits ---
            const currentRemaining = voucher.creditsRemaining || voucher.creditsTotal || 1

            if (credits > currentRemaining) {
                return NextResponse.json({ error: `Only ${currentRemaining} credits remaining` }, { status: 400 })
            }

            if (credits < 1) {
                return NextResponse.json({ error: "Must gift at least 1 credit" }, { status: 400 })
            }

            // 1. Create new voucher for recipient
            // pricePaid: 0 — gifted vouchers are NOT revenue (already paid by original buyer)
            const newVoucherData = {
                code: giftCode,
                treatmentId: voucher.treatmentId,
                treatmentTitle: voucher.treatmentTitle,
                pricePaid: 0,
                originalPrice: voucher.originalPrice || voucher.pricePaid,
                status: "ISSUED",
                recipientName: recipientName,
                clientId: recipientId,
                issuedAt: now,
                type: credits === 1 ? "single" as const : "package" as const,
                creditsTotal: credits,
                creditsRemaining: credits,
                expiresAt: voucher.expiresAt,
                giftedFrom: senderId,
                giftedFromName: senderName,
                giftedAt: now,
                parentVoucherId: voucherId,
            }

            const newVoucherRef = await addDoc(collection(db, "vouchers"), newVoucherData)

            // 2. Deduct credits from sender's voucher
            const newRemaining = currentRemaining - credits
            await updateDoc(voucherRef, {
                creditsRemaining: newRemaining,
                // If all credits consumed, mark as redeemed
                ...(newRemaining <= 0 && { status: "REDEEMED", redeemedAt: now })
            })

            // 3. Record the gift transaction
            await addDoc(collection(db, "gift_transactions"), {
                senderId, senderName,
                recipientId, recipientName,
                voucherId,
                newVoucherId: newVoucherRef.id,
                treatmentTitle: voucher.treatmentTitle,
                creditsSent: credits,
                status: "completed",
                giftedAt: now,
            })

            return NextResponse.json({
                success: true,
                type: "package_split",
                newVoucherId: newVoucherRef.id,
                senderCreditsRemaining: newRemaining,
                recipientCredits: credits,
            })

        } else {
            // --- SINGLE VOUCHER: Full transfer ---

            // 1. Transfer voucher ownership
            await updateDoc(voucherRef, {
                clientId: recipientId,
                recipientName: recipientName,
                giftedFrom: senderId,
                giftedFromName: senderName,
                giftedAt: now,
                code: giftCode, // New code for security
            })

            // 2. Record the gift transaction
            await addDoc(collection(db, "gift_transactions"), {
                senderId, senderName,
                recipientId, recipientName,
                voucherId,
                treatmentTitle: voucher.treatmentTitle,
                creditsSent: 1,
                status: "completed",
                giftedAt: now,
            })

            return NextResponse.json({
                success: true,
                type: "single_transfer",
                voucherId,
            })
        }

    } catch (error: any) {
        console.error("Gift API Error:", error)
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
    }
}
