import { Treatment, TreatmentVariant } from "@/types"

/**
 * Get variants from a treatment, handling both old (flat) and new (variants[]) format.
 * Always returns at least one variant.
 */
export function getVariants(t: Treatment): TreatmentVariant[] {
    if (t.variants && t.variants.length > 0) return t.variants
    return [{ duration_min: t.duration_min, price_thb: t.price_thb }]
}

/**
 * Get the price range display string for a treatment.
 * e.g. "฿800" (single) or "฿800 – ฿1,500" (multiple)
 */
export function priceRange(t: Treatment): string {
    const v = getVariants(t)
    const prices = v.map(x => x.price_thb).sort((a, b) => a - b)
    if (prices.length === 1 || prices[0] === prices[prices.length - 1]) {
        return `฿${prices[0].toLocaleString()}`
    }
    return `฿${prices[0].toLocaleString()} – ฿${prices[prices.length - 1].toLocaleString()}`
}

/**
 * Get duration range display string for a treatment.
 * e.g. "60 min" or "60–120 min"
 */
export function durationRange(t: Treatment): string {
    const v = getVariants(t)
    const durations = v.map(x => x.duration_min).sort((a, b) => a - b)
    if (durations.length === 1 || durations[0] === durations[durations.length - 1]) {
        return `${durations[0]} min`
    }
    return `${durations[0]}–${durations[durations.length - 1]} min`
}

/**
 * Format a booking treatment string from treatment + selected variant.
 * e.g. "Thai Massage" + 90 min → "Thai Massage (90 min)"
 */
export function formatBookingTreatment(title: string, durationMin: number): string {
    return `${title} (${durationMin} min)`
}
