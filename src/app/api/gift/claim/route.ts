import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, query, where, updateDoc, addDoc } from "firebase/firestore"

/**
 * POST /api/gift/claim
 * Recipient claims a gift by entering the code.
 * This is where the voucher is actually modified:
 *   - Package: deduct credits from sender, create new voucher for recipient
 *   - Single: transfer clientId from sender to recipient
 * 
 * Body: { code, recipientId, recipientName }
 * Returns: { success, treatment, senderName, credits }
 */
export async function POST(req: NextRequest) {
    try {
        const { code, recipientId, recipientName } = await req.json()

        if (!code || !recipientId || !recipientName) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Find the pending gift by code
        const q = query(
            collection(db, "pending_gifts"),
            where("code", "==", code.toUpperCase().trim()),
            where("status", "==", "pending")
        )
        const snap = await getDocs(q)

        if (snap.empty) {
            return NextResponse.json({ error: "Invalid or expired gift code" }, { status: 404 })
        }

        const giftDoc = snap.docs[0]
        const gift = { id: giftDoc.id, ...giftDoc.data() } as any

        // Check expiry
        if (new Date(gift.expiresAt) < new Date()) {
            await updateDoc(doc(db, "pending_gifts", gift.id), { status: "expired" })
            return NextResponse.json({ error: "This gift code has expired" }, { status: 410 })
        }

        // Can't claim your own gift
        if (gift.senderId === recipientId) {
            return NextResponse.json({ error: "Cannot claim your own gift" }, { status: 400 })
        }

        // Get the original voucher
        const voucherRef = doc(db, "vouchers", gift.voucherId)
        const voucherSnap = await getDoc(voucherRef)

        if (!voucherSnap.exists()) {
            return NextResponse.json({ error: "Original voucher no longer exists" }, { status: 404 })
        }

        const voucher = { id: voucherSnap.id, ...voucherSnap.data() } as any
        const now = new Date().toISOString()

        if (gift.voucherType === "package") {
            // ─── PACKAGE: Deduct credits from sender, create new voucher for recipient ───
            const currentRemaining = voucher.creditsRemaining ?? voucher.creditsTotal ?? 1
            const credits = gift.credits

            if (credits > currentRemaining) {
                return NextResponse.json({ error: "Insufficient credits on original voucher" }, { status: 400 })
            }

            // Deduct from sender's voucher
            const newRemaining = currentRemaining - credits
            await updateDoc(voucherRef, {
                creditsRemaining: newRemaining,
                ...(newRemaining <= 0 && { status: "REDEEMED", redeemedAt: now }),
            })

            // Create new voucher for recipient
            const newVoucherRef = await addDoc(collection(db, "vouchers"), {
                code: `GIFTD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                treatmentId: gift.treatmentId || voucher.treatmentId || "",
                treatmentTitle: gift.treatmentTitle,
                pricePaid: 0,
                originalPrice: gift.originalPrice || voucher.originalPrice || 0,
                status: "ISSUED",
                recipientName,
                clientId: recipientId,
                issuedAt: now,
                type: credits === 1 ? "single" : "package",
                creditsTotal: credits,
                creditsRemaining: credits,
                expiresAt: gift.voucherExpiresAt || voucher.expiresAt || null,
                giftedFrom: gift.senderId,
                giftedFromName: gift.senderName,
                giftedAt: now,
                parentVoucherId: gift.voucherId,
            })

            // Record transaction
            await addDoc(collection(db, "gift_transactions"), {
                senderId: gift.senderId,
                senderName: gift.senderName,
                recipientId,
                recipientName,
                voucherId: gift.voucherId,
                newVoucherId: newVoucherRef.id,
                treatmentTitle: gift.treatmentTitle,
                creditsSent: credits,
                giftCode: gift.code,
                status: "completed",
                giftedAt: now,
            })

        } else {
            // ─── SINGLE: Transfer ownership to recipient ───
            await updateDoc(voucherRef, {
                clientId: recipientId,
                recipientName,
                giftedFrom: gift.senderId,
                giftedFromName: gift.senderName,
                giftedAt: now,
            })

            // Record transaction
            await addDoc(collection(db, "gift_transactions"), {
                senderId: gift.senderId,
                senderName: gift.senderName,
                recipientId,
                recipientName,
                voucherId: gift.voucherId,
                treatmentTitle: gift.treatmentTitle,
                creditsSent: 1,
                giftCode: gift.code,
                status: "completed",
                giftedAt: now,
            })
        }

        // Mark gift as claimed
        await updateDoc(doc(db, "pending_gifts", gift.id), {
            status: "claimed",
            claimedBy: recipientId,
            claimedByName: recipientName,
            claimedAt: now,
        })

        return NextResponse.json({
            success: true,
            treatment: gift.treatmentTitle,
            senderName: gift.senderName,
            credits: gift.credits,
        })

    } catch (error: any) {
        console.error("Gift Claim Error:", error)
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
    }
}
