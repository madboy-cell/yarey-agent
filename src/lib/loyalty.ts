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
    giftedFrom?: string  // If set, this voucher was gifted (not purchased)
}

const REDEMPTION_KEYWORDS = /voucher|redeem|gift|prepaid|package|promo|comp/i

export const TIERS = [
    { name: "Seeker", spend: 0 },
    { name: "Initiate", spend: 8000 },
    { name: "Devotee", spend: 25000 },
    { name: "Alchemist", spend: 55000 },
    { name: "Guardian", spend: 88000 }
] as const

export const isRedemptionBooking = (b: BookingStub): boolean => {
    return b.paymentMethod === "Voucher" || (!!b.notes && REDEMPTION_KEYWORDS.test(b.notes))
}

function isValidBooking(booking: BookingStub, clientEmail: string): boolean {
    return (
        booking.contact?.email === clientEmail &&
        booking.status !== "Cancelled" &&
        !isRedemptionBooking(booking)
    )
}

function isValidVoucher(voucher: VoucherStub, clientId: string): boolean {
    return (
        voucher.clientId === clientId &&
        voucher.status !== "VOID" &&
        voucher.status !== "REFUNDED" &&
        !voucher.giftedFrom  // Gifted vouchers don't count as revenue
    )
}

export const calculateClientSpend = (
    bookings: BookingStub[],
    vouchers: VoucherStub[],
    clientEmail: string,
    clientId: string
): number => {
    const bookingSpend = bookings.reduce((sum, b) =>
        isValidBooking(b, clientEmail) ? sum + (Number(b.priceSnapshot) || 0) : sum
        , 0)

    const voucherSpend = vouchers.reduce((sum, v) =>
        isValidVoucher(v, clientId) ? sum + (Number(v.pricePaid) || 0) : sum
        , 0)

    return bookingSpend + voucherSpend
}

export const determineTier = (spend: number): string => {
    return TIERS.reduce((tier, t) => spend >= t.spend ? t.name : tier, "Seeker")
}
