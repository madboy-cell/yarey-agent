export interface Treatment {
    id: string
    title: string
    category: string
    duration_min: number
    price_thb: number
    description: string
    active: boolean
    includes?: string[]
}

export interface Booking {
    id: string
    guests: number
    time: string
    date: string
    status: string
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
    items?: any[]
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
    status: string
    expiresAt?: string
    type?: "single" | "package"
    creditsTotal?: number
    creditsRemaining?: number
    recipientName?: string
    clientId?: string
}

export interface Client {
    id: string
    name: string
    email: string
    phone?: string
    visits?: number
}
