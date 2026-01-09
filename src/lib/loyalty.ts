
export interface BookingStub {
    id: string
    paymentMethod?: string
    notes?: string
    priceSnapshot?: number
    status?: string
    contact?: { email?: string }
}

export interface VoucherStub {
    id: string
    clientId?: string
    status: string
    pricePaid?: number
}

// 1. Centralized Redemption Detection
// (Must match logic in Admin Clients Page)
export const isRedemptionBooking = (b: BookingStub): boolean => {
    return (
        (b.paymentMethod === "Voucher") ||
        (!!b.notes && /voucher|redeem|gift|prepaid|package|promo|comp/i.test(b.notes))
    )
}

// 2. Calculate Spend (Funder Model)
export const calculateClientSpend = (
    bookings: BookingStub[],
    vouchers: VoucherStub[],
    clientEmail: string,
    clientId: string
): number => {
    // A. Booking Spend (Services)
    // Rule: Count ONLY if NOT a redemption.
    const bookingSpend = bookings.reduce((sum, b) => {
        // Filter by ownership
        if (b.contact?.email !== clientEmail) return sum
        if (b.status === "Cancelled") return sum

        // Check redemption
        if (isRedemptionBooking(b)) return sum

        return sum + (Number(b.priceSnapshot) || 0)
    }, 0)

    // B. Voucher Spend (Pre-paid)
    // Rule: Count ALL vouchers owned by this client (Issued OR Redeemed), unless Void/Refunded.
    // This ensures the "Funder" keeps the points.
    const voucherSpend = vouchers.reduce((sum, v) => {
        if (v.clientId !== clientId) return sum
        if (v.status === "VOID" || v.status === "REFUNDED") return sum

        return sum + (Number(v.pricePaid) || 0)
    }, 0)

    return bookingSpend + voucherSpend
}

// 3. Tier Definitions
export const TIERS = [
    { name: "Seeker", spend: 0 },
    { name: "Initiate", spend: 8000 },
    { name: "Devotee", spend: 25000 },
    { name: "Alchemist", spend: 55000 },
    { name: "Guardian", spend: 88000 }
]

export const determineTier = (spend: number): string => {
    let tier = "Seeker"
    for (const t of TIERS) {
        if (spend >= t.spend) tier = t.name
    }
    return tier
}
