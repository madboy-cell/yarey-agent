import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, doc, getDoc, addDoc } from "firebase/firestore"

/**
 * POST /api/gift/create
 * Sender creates a pending gift → gets a shareable code
 * 
 * Body: { voucherId, senderId, senderName, credits? }
 * Returns: { code, expiresAt }
 * 
 * NOTE: This does NOT modify the voucher. Credits are only deducted
 * when the friend actually claims the gift via /api/gift/claim.
 */
export async function POST(req: NextRequest) {
    try {
        const { voucherId, senderId, senderName, credits = 1 } = await req.json()

        if (!voucherId || !senderId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Get voucher
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

        // Package credit validation
        if (voucher.type === "package") {
            const remaining = voucher.creditsRemaining ?? voucher.creditsTotal ?? 1
            if (credits > remaining) {
                return NextResponse.json({ error: `Only ${remaining} credits remaining` }, { status: 400 })
            }
            if (credits < 1) {
                return NextResponse.json({ error: "Must gift at least 1 credit" }, { status: 400 })
            }
        }

        // Generate unique code
        const code = `GIFT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
        const now = new Date()
        const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()

        // Create pending gift — voucher is NOT modified here
        await addDoc(collection(db, "pending_gifts"), {
            code,
            senderId,
            senderName: senderName || "Member",
            voucherId,
            treatmentTitle: voucher.treatmentTitle,
            treatmentId: voucher.treatmentId || "",
            voucherType: voucher.type || "single",
            credits,
            status: "pending",
            createdAt: now.toISOString(),
            expiresAt,
            originalPrice: voucher.originalPrice || voucher.pricePaid || 0,
            voucherExpiresAt: voucher.expiresAt || null,
        })

        return NextResponse.json({ success: true, code, expiresAt })

    } catch (error: any) {
        console.error("Gift Create Error:", error)
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
    }
}
