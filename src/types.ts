export interface TreatmentVariant {
    duration_min: number
    price_thb: number
    label?: string           // e.g. "60 min", "Morning Special"
}

export interface Treatment {
    id: string
    title: string
    category: string
    duration_min: number      // Default / first variant (backward compat)
    price_thb: number         // Default / first variant (backward compat)
    description: string
    active: boolean
    includes?: string[]
    variants?: TreatmentVariant[]  // Multiple duration/price options
}

export interface Booking {
    id: string
    guests: number
    time: string
    date: string
    status: "Confirmed" | "Arrived" | "In Ritual" | "Started" | "Checked In" | "Complete" | "Cancelled" | string
    treatment: string
    contact?: {
        name: string
        method: string
        handle: string
        email?: string | null
        nationality?: string | null
        source?: string | null
    }
    notes?: string
    isWalkIn?: boolean
    groupId?: string
    priceSnapshot?: number
    // Salesman / Commission
    salesmanId?: string | null
    commissionSnapshot?: number // The rate at time of booking
    commissionAmount?: number // The calculated amount
    // Therapist / Cost Logic
    therapistId?: string | null
    therapistCostSnapshot?: number // How much this booking costs in labor
    paymentMethod?: "Cash" | "Transfer" | "Credit Card" | string
    items?: { name: string; price: number; qty: number }[]
    // Partner / Media attribution
    partnerId?: string | null       // CirclePartner.id
    mediaId?: string | null         // CircleMedia.id
    boundVoucherCode?: string | null // The code used
    discountApplied?: number        // ฿ discount amount
    partnerCommission?: number      // ฿ commission to partner (auto-calc)
    isEventBooking?: boolean        // true if from a CircleEvent
    eventId?: string                // CircleEvent.id
}

export interface Salesman {
    id: string
    name: string
    nickname: string
    commissionRate: number
    active: boolean
    role?: string
    hourlyRate?: number
    baseSalary?: number
    photoUrl?: string
}

export interface Voucher {
    id: string
    code: string
    treatmentId: string
    treatmentTitle: string
    pricePaid: number
    originalPrice?: number
    status: "ISSUED" | "REDEEMED" | "EXPIRED" | "VOID" | "REFUNDED" | string
    // Gacha fields
    gachaMachineId?: string
    gachaPrizeId?: string
    expiresAt?: string
    issuedAt?: string
    redeemedAt?: string
    type?: "single" | "package" | "gacha"
    creditsTotal?: number
    creditsRemaining?: number
    recipientName?: string
    clientId?: string
    // Staff attribution & commission
    issuedByStaffId?: string     // salesmanId who issued/sold this voucher
    issuedByStaffName?: string   // display name at time of issue
    commissionRate?: number      // snapshot of staff commission rate (e.g. 0.05)
    commissionAmount?: number    // calculated: pricePaid * commissionRate
    // Gift tracking
    giftedFrom?: string          // clientId of the sender
    giftedFromName?: string      // display name of the sender
    giftedAt?: string            // ISO timestamp when gifted
    parentVoucherId?: string     // for package splits, links to original voucher
    // Birthday gift tracking
    isBirthdayGift?: boolean     // true if issued as a birthday gift
    birthdayYear?: number        // year the birthday gift was issued for
    // Bound voucher (Partner & Media tracking)
    boundType?: "partner" | "media"  // null = regular voucher
    boundEntityId?: string          // partnerId or mediaId
    discountPercent?: number        // e.g. 20 = 20% off
    usageCount?: number             // times redeemed (auto-incremented)
}

export interface Client {
    id: string
    name: string
    email: string
    phone?: string
    birthday?: string           // ISO date string (YYYY-MM-DD)
    visits?: number
    visitCount?: number
    totalSpend?: number
    joinedDate?: string
    lineUserId?: string         // LINE LIFF userId
    telegramUserId?: string     // Telegram WebApp userId
}

export interface Block {
    id: string
    time: string
    date: string
    reason: string
}

export interface Session {
    id: string
    email: string
    score: number
    pillarName: string
    metrics: Record<string, any>    // eslint-disable-line @typescript-eslint/no-explicit-any
    protocol: Record<string, unknown>[]
    timestamp: any                  // eslint-disable-line @typescript-eslint/no-explicit-any — Firestore Timestamp
    dataSource?: string
    // v8.1 fields
    clientId?: string
    clientName?: string
    platform?: string
    severity?: string
    trigger?: string
    capacity?: {
        totalScore: number
        level: number
        label: string
        dimensions: { name: string; score: number; maxScore: number; insight: string }[]
        safetyFlags: string[]
    }
    massage?: { name: string; nameTh?: string; modality?: string; pressure: string; duration: number; herbs?: string[]; oilBlend?: string; thermalPairing?: string }
    topRecipe?: { name: string; modality: string; intensity: string; totalTime: number; saunaTemp: number; coldTemp: number }
    recipesAvailable?: number
    engineVersion?: string
    baseline?: Record<string, number>
    baselineDelta?: Record<string, number>
    illnessWarning?: { active: boolean; severity: string; signals: string[]; recommendation?: string }
    clinicalNarrative?: string
}

export interface Expense {
    id: string
    month: string
    title: string
    amount: number
    category: string
}

export interface GiftTransaction {
    id: string
    senderId: string
    senderName: string
    recipientId: string
    recipientName: string
    voucherId: string           // original voucher ID
    newVoucherId?: string       // new voucher created (package splits)
    treatmentTitle: string
    creditsSent: number         // 1 for single, N for package
    status: "completed"
    giftedAt: string            // ISO timestamp
}

// ═══════════════════════════════════════════════
//  CIRCLE MODULE — 4 Business Sub-Modules
// ═══════════════════════════════════════════════

// ─── 1. EVENTS ─────────────────────────────────
export interface CircleEvent {
    id: string
    title: string                   // "After Marathon Ice Bath"
    hostName: string                // Company or person
    hostPhone: string
    hostEmail?: string
    hostLineId?: string
    // Scheduling
    eventType: "one_time" | "recurring"
    recurringRule?: {
        frequency: "weekly" | "biweekly" | "monthly"
        dayOfWeek?: number          // 0=Sun, 6=Sat
    }
    dates: string[]                 // ISO dates for all occurrences
    blockType: "whole_day" | "morning" | "sun_peak" | "evening" | "none"
    startTime?: string              // "10:00" — event start time
    endTime?: string                // "13:00" — event end time
    durationHours: number           // 3, 6, 12
    // Capacity
    expectedGuests: number
    maxCapacity: number
    actualAttendance?: number       // Post-event
    // Financials
    financialType: "we_earn" | "we_pay"
    amount: number                  // Revenue or cost
    perHeadPricing?: boolean        // If true, amount = per guest
    paymentTerms?: string
    // Status
    status: "draft" | "confirmed" | "completed" | "cancelled"
    staffAssigned?: string[]        // salesmanIds
    equipmentNotes?: string
    notes?: string
    createdAt?: string
}

// ─── 2. PARTNERS ───────────────────────────────
export interface CirclePartner {
    id: string
    name: string                    // "CrossFit Bangkok"
    contactPerson: string
    phone: string
    email?: string
    lineId?: string
    // Deal Terms
    commissionType: "percentage" | "per_head"
    commissionRate: number          // 0.15 = 15% or ฿ flat per head
    contractStart?: string
    contractEnd?: string
    // Bound Voucher
    boundVoucherCode: string        // e.g. "PTR-CROSSFIT" — staff picks
    discountPercent: number         // e.g. 20 = 20% off
    // Auto-tracked (from bookings)
    totalGuestsSent?: number
    totalRevenue?: number
    totalCommissionPaid?: number
    // Status
    status: "active" | "inactive" | "prospect"
    notes?: string
    createdAt?: string
}

// ─── 3. MEDIA ──────────────────────────────────
export type MediaStatus = "scheduled" | "visited" | "content_posted" | "completed" | "cancelled"

export interface CircleMedia {
    id: string
    name: string                    // Influencer name or outlet
    contactPerson?: string
    phone: string
    email?: string
    // Social
    instagramHandle?: string
    instagramFollowers?: number
    facebookPage?: string
    tiktokHandle?: string
    tiktokFollowers?: number
    // Visit
    visitDate?: string
    visitTime?: string
    treatmentBooked?: string
    status: MediaStatus
    // Financials
    cost: number                    // What we pay them (one-time)
    paymentStatus: "unpaid" | "paid"
    // Bound Voucher
    boundVoucherCode: string        // e.g. "INF-SOMCHAI20" — staff picks
    discountPercent: number
    // Performance (auto-calc from bound voucher usage)
    guestsGenerated?: number
    revenueGenerated?: number
    roi?: number                    // revenueGenerated / cost
    // Content
    contentUrl?: string
    contentDeliverables?: string    // "1 reel + 3 stories"
    canRepost?: boolean
    notes?: string
    createdAt?: string
}

// ─── 4. SUPPLIERS ──────────────────────────────
export interface CircleSupplier {
    id: string
    name: string                    // "Thai Herbs Co."
    contactPerson?: string
    phone: string
    email?: string
    lineId?: string
    // Cost
    costType: "daily" | "monthly"
    costAmount: number
    category: string                // "Supplies", "Utilities", etc.
    // Contract
    contractStart?: string
    contractEnd?: string
    paymentTerms?: string           // "Net 30"
    priority: "primary" | "secondary" | "backup"
    status: "active" | "inactive"
    notes?: string
    createdAt?: string
}

// ─── HEALTH SCORECARD GOALS ────────────────────
export interface CircleGoals {
    partnerBookings: number
    mediaVisits: number
    eventsHosted: number
    totalBookings: number
    revenue: number
    coldDays: number
}

// ─── GACHA MACHINE ─────────────────────────────
export interface GachaPrize {
    id: string
    type: "discount" | "treatment"
    discountPercent?: number
    treatmentId?: string
    treatmentTitle?: string
    label: string
    weight: number
    color: string
}

export interface GachaMachine {
    id: string
    title: string
    description?: string
    prizes: GachaPrize[]
    targetType: "all" | "specific"
    targetMemberIds?: string[]
    active: boolean
    expiresAt: string
    createdAt: string
    playedBy: Record<string, {
        playedAt: string
        prizeId: string
        voucherId: string
        prizeName: string
    }>
}
