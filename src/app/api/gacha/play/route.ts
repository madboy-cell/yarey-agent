import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, runTransaction } from "firebase/firestore"
import { GachaMachine, GachaPrize } from "@/types"

export const dynamic = "force-dynamic"

function selectPrize(prizes: GachaPrize[]): GachaPrize {
    const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0)
    let roll = Math.random() * totalWeight
    for (const prize of prizes) {
        roll -= prize.weight
        if (roll <= 0) return prize
    }
    return prizes[prizes.length - 1]
}

export async function POST(req: NextRequest) {
    try {
        const { machineId, memberId, memberName } = await req.json()

        if (!machineId || !memberId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const result = await runTransaction(db, async (tx) => {
            const machineRef = doc(db, "gacha_machines", machineId)
            const machineSnap = await tx.get(machineRef)

            if (!machineSnap.exists()) throw new Error("NOT_FOUND")
            const machine = { id: machineSnap.id, ...machineSnap.data() } as GachaMachine

            if (!machine.active) throw new Error("INACTIVE")
            if (new Date(machine.expiresAt) < new Date()) throw new Error("EXPIRED")
            if (machine.targetType === "specific" && !machine.targetMemberIds?.includes(memberId)) {
                throw new Error("NOT_ELIGIBLE")
            }
            if (machine.playedBy?.[memberId]) throw new Error("ALREADY_PLAYED")

            // Pick prize
            const prize = selectPrize(machine.prizes)

            // Build voucher
            const code = `GACHA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
            const now = new Date().toISOString()

            const voucherData: Record<string, unknown> = {
                code,
                type: "gacha",
                status: "ISSUED",
                pricePaid: 0,
                clientId: memberId,
                recipientName: memberName || "",
                issuedAt: now,
                expiresAt: machine.expiresAt,
                gachaMachineId: machineId,
                gachaPrizeId: prize.id,
                creditsTotal: 1,
                creditsRemaining: 1,
                ...(prize.type === "discount"
                    ? { discountPercent: prize.discountPercent, treatmentTitle: "Any Treatment", treatmentId: "" }
                    : { treatmentId: prize.treatmentId, treatmentTitle: prize.treatmentTitle }
                ),
            }

            const voucherRef = doc(collection(db, "vouchers"))
            tx.set(voucherRef, voucherData)

            tx.update(machineRef, {
                [`playedBy.${memberId}`]: {
                    playedAt: now,
                    prizeId: prize.id,
                    voucherId: voucherRef.id,
                    prizeName: prize.label,
                },
            })

            return { prize, voucher: { id: voucherRef.id, ...voucherData } }
        })

        return NextResponse.json(result)
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Unknown error"
        const statusMap: Record<string, number> = {
            NOT_FOUND: 404, INACTIVE: 410, EXPIRED: 410,
            NOT_ELIGIBLE: 403, ALREADY_PLAYED: 403,
        }
        return NextResponse.json({ error: msg }, { status: statusMap[msg] || 500 })
    }
}
