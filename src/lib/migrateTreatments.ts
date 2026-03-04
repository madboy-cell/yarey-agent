/**
 * Migration: Merge duplicate treatment documents into variants
 * 
 * Run from admin panel or as a one-time script.
 * Groups treatments by title + category, merges duration/price into variants array.
 * Deletes duplicate docs, keeps the first one with all variants.
 */

import { db } from "@/lib/firebase"
import { collection, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore"

interface RawTreatment {
    id: string
    title: string
    category: string
    duration_min: number
    price_thb: number
    description?: string
    active?: boolean
    includes?: string[]
    variants?: { duration_min: number; price_thb: number; label?: string }[]
}

export async function migrateTreatmentsToVariants(): Promise<{
    merged: number
    deleted: number
    groups: { title: string; variantCount: number }[]
}> {
    const snapshot = await getDocs(collection(db, "treatments"))
    const treatments: RawTreatment[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<RawTreatment, "id">),
    }))

    // Already migrated treatments (have variants) — skip
    const alreadyMigrated = treatments.filter(t => t.variants && t.variants.length > 0)
    const flat = treatments.filter(t => !t.variants || t.variants.length === 0)

    // Group by normalized title + category
    const groups = new Map<string, RawTreatment[]>()
    for (const t of flat) {
        const key = `${t.title.trim().toLowerCase()}|${(t.category || "").trim().toLowerCase()}`
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(t)
    }

    let merged = 0
    let deleted = 0
    const resultGroups: { title: string; variantCount: number }[] = []

    for (const [, group] of groups) {
        if (group.length <= 1) {
            // Single doc — still add variants array for consistency
            const t = group[0]
            const variants = [{ duration_min: t.duration_min, price_thb: t.price_thb }]
            await updateDoc(doc(db, "treatments", t.id), { variants })
            resultGroups.push({ title: t.title, variantCount: 1 })
            continue
        }

        // Multiple docs with same title — merge into first doc
        // Sort by duration so variants are in order
        group.sort((a, b) => a.duration_min - b.duration_min)

        const primary = group[0]
        const variants = group.map(t => ({
            duration_min: t.duration_min,
            price_thb: t.price_thb,
        }))

        // Keep the most complete description and includes
        const bestDescription = group.find(t => t.description && t.description.length > 10)?.description || primary.description || ""
        const bestIncludes = group.find(t => t.includes && t.includes.length > 0)?.includes || primary.includes || []

        // Update primary doc with all variants
        await updateDoc(doc(db, "treatments", primary.id), {
            variants,
            description: bestDescription,
            includes: bestIncludes,
            // Keep lowest duration/price as the default
            duration_min: variants[0].duration_min,
            price_thb: variants[0].price_thb,
        })

        // Delete duplicate docs
        for (let i = 1; i < group.length; i++) {
            await deleteDoc(doc(db, "treatments", group[i].id))
            deleted++
        }

        merged++
        resultGroups.push({ title: primary.title, variantCount: variants.length })
    }

    console.log(`✅ Migration complete: ${merged} groups merged, ${deleted} docs deleted`)
    console.log(`   ${alreadyMigrated.length} treatments already had variants (skipped)`)
    resultGroups.forEach(g => console.log(`   → ${g.title}: ${g.variantCount} variants`))

    return { merged, deleted, groups: resultGroups }
}
