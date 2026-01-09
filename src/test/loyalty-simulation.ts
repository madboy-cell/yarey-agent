
import { calculateClientSpend } from "../lib/loyalty"

const runTests = () => {
    console.log("🧪 Running Loyalty Logic Simulation...")
    let passed = 0
    let failed = 0

    const assert = (name: string, actual: number, expected: number) => {
        if (actual === expected) {
            console.log(`✅ [PASS] ${name}: ${actual} == ${expected}`)
            passed++
        } else {
            console.error(`❌ [FAIL] ${name}: Expected ${expected}, Got ${actual}`)
            failed++
        }
    }

    // Client IDs
    const SOMCHAI = "somchai@test.com"
    const FRIEND = "friend@test.com"

    // 1. Standard Visit
    // Cash booking 5000 -> Spend 5000
    assert("Cash Visit", calculateClientSpend(
        [{ id: "b1", priceSnapshot: 5000, contact: { email: SOMCHAI } }],
        [],
        SOMCHAI, "id_somchai"
    ), 5000)

    // 2. Voucher Purchase
    // Voucher 5000 (Issued) -> Spend 5000
    assert("Voucher Purchase", calculateClientSpend(
        [],
        [{ id: "v1", pricePaid: 5000, status: "ISSUED", clientId: "id_somchai" }],
        SOMCHAI, "id_somchai"
    ), 5000)

    // 3. Voucher Redemption (Funder Model Check - Double Spend Prevention)
    // Somchai buys voucher (5000). Redeem it (Booking 5000).
    // Spend should be 5000 (from Voucher). Booking should be 0 (Redemption).
    assert("Voucher Self-Redemption (No Double Count)", calculateClientSpend(
        [{ id: "b2", priceSnapshot: 5000, contact: { email: SOMCHAI }, notes: "Redeem Voucher", paymentMethod: "Voucher" }],
        [{ id: "v2", pricePaid: 5000, status: "REDEEMED", clientId: "id_somchai" }],
        SOMCHAI, "id_somchai"
    ), 5000)

    // 4. Voucher Gift
    // Somchai buys (5000). Friend uses (5000).
    // Somchai Spend = 5000. Friend Spend = 0.
    assert("Voucher Gift (Buyer Spend)", calculateClientSpend(
        // Booking belongs to Friend (ignored by filter)
        [{ id: "b3", priceSnapshot: 5000, contact: { email: FRIEND }, notes: "Gift from Somchai" }],
        [{ id: "v3", pricePaid: 5000, status: "REDEEMED", clientId: "id_somchai" }],
        SOMCHAI, "id_somchai"
    ), 5000)

    assert("Voucher Gift (Recipient Spend)", calculateClientSpend(
        [{ id: "b3", priceSnapshot: 5000, contact: { email: FRIEND }, notes: "Gift Redeem", paymentMethod: "Voucher" }],
        [{ id: "v3", pricePaid: 5000, status: "REDEEMED", clientId: "id_somchai" }], // Not owned by friend
        FRIEND, "id_friend"
    ), 0) // Should be 0 because booking is redemption and voucher is not owned.

    // 5. Keyword Check
    // Ensuring keywords like 'Promo' or 'Package' suppress the price
    assert("Promo Keyword Suppression", calculateClientSpend(
        [{ id: "b4", priceSnapshot: 9999, contact: { email: SOMCHAI }, notes: "Special Promo Package" }],
        [],
        SOMCHAI, "id_somchai"
    ), 0)

    // 6. Mixed Bag
    // Cash Visit (2000) + Voucher Purchase (3000) = 5000
    assert("Mixed Cash + Voucher", calculateClientSpend(
        [{ id: "b5", priceSnapshot: 2000, contact: { email: SOMCHAI } }],
        [{ id: "v4", pricePaid: 3000, status: "ISSUED", clientId: "id_somchai" }],
        SOMCHAI, "id_somchai"
    ), 5000)

    console.log(`\nTest Summary: ${passed} Passed, ${failed} Failed.`)
}

runTests()
