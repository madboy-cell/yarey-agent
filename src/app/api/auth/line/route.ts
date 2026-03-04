/**
 * /api/auth/line — Unified auth handler (LINE + Web)
 * 
 * Modes:
 *  1. LINE lookup:  { lineUserId, displayName, pictureUrl }
 *     → Searches by lineUserId. Returns member or null.
 *  
 *  2. Register/link: { lineUserId?, email, displayName? }
 *     → If email matches existing client: links lineUserId (if provided), returns member.
 *     → If no match: creates new client with email + lineUserId (if provided).
 *
 *  3. Web login:    { mode: "web", email }
 *     → Searches by email. If found: returns member. If not: creates new.
 *
 * No Firebase Auth SDK used — identity comes from LINE or email input.
 */

import { NextRequest, NextResponse } from "next/server"

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "yarey-biomarker"
const FIRESTORE_REST = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

async function getAccessToken(): Promise<string | null> {
    try {
        const res = await fetch(
            "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
            { headers: { "Metadata-Flavor": "Google" } }
        )
        if (!res.ok) return null
        const data = await res.json()
        return data.access_token
    } catch {
        return null
    }
}

function docToObj(doc: any): Record<string, any> {
    const result: Record<string, any> = {}
    if (!doc.fields) return result
    for (const [key, val] of Object.entries(doc.fields) as [string, any][]) {
        if (val.stringValue !== undefined) result[key] = val.stringValue
        else if (val.integerValue !== undefined) result[key] = Number(val.integerValue)
        else if (val.doubleValue !== undefined) result[key] = val.doubleValue
        else if (val.booleanValue !== undefined) result[key] = val.booleanValue
        else if (val.nullValue !== undefined) result[key] = null
        else if (val.mapValue !== undefined) result[key] = docToObj(val.mapValue)
        else if (val.arrayValue !== undefined) result[key] = (val.arrayValue.values || []).map((v: any) => {
            if (v.stringValue !== undefined) return v.stringValue
            if (v.integerValue !== undefined) return Number(v.integerValue)
            return v
        })
    }
    return result
}

function objToFields(obj: Record<string, any>): Record<string, any> {
    const fields: Record<string, any> = {}
    for (const [key, val] of Object.entries(obj)) {
        if (val === null || val === undefined) {
            fields[key] = { nullValue: null }
        } else if (typeof val === "string") {
            fields[key] = { stringValue: val }
        } else if (typeof val === "number") {
            fields[key] = Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val }
        } else if (typeof val === "boolean") {
            fields[key] = { booleanValue: val }
        }
    }
    return fields
}

function extractId(name: string): string {
    const parts = name.split("/")
    return parts[parts.length - 1]
}

// Helper: query a single client by field
async function queryClientByField(
    field: string, value: string, headers: Record<string, string>
): Promise<{ id: string; doc: any; data: Record<string, any> } | null> {
    const res = await fetch(`${FIRESTORE_REST}:runQuery`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            structuredQuery: {
                from: [{ collectionId: "clients" }],
                where: {
                    fieldFilter: {
                        field: { fieldPath: field },
                        op: "EQUAL",
                        value: { stringValue: value },
                    },
                },
                limit: 1,
            },
        }),
    })
    const data = await res.json()
    if (Array.isArray(data) && data.length > 0 && data[0].document) {
        const doc = data[0].document
        const id = extractId(doc.name)
        return { id, doc, data: docToObj(doc) }
    }
    return null
}

// Helper: update fields on existing client
async function patchClient(
    id: string, updates: Record<string, any>, existingFields: any, headers: Record<string, string>
) {
    const fieldPaths = Object.keys(updates).map(k => `updateMask.fieldPaths=${k}`).join("&")
    await fetch(`${FIRESTORE_REST}/clients/${id}?${fieldPaths}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
            fields: { ...existingFields, ...objToFields(updates) },
        }),
    }).catch(() => { })
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { lineUserId, displayName, pictureUrl, email, mode } = body

        const token = await getAccessToken()
        if (!token) {
            return NextResponse.json({ error: "Cannot get service credentials" }, { status: 500 })
        }

        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        }

        // ═══ Mode: Web login (email only, no LINE) ═══
        if (mode === "web" && email) {
            const normalizedEmail = email.toLowerCase().trim()
            const found = await queryClientByField("email", normalizedEmail, headers)

            if (found) {
                return NextResponse.json({
                    success: true,
                    member: { id: found.id, ...found.data },
                    isNew: false,
                })
            }

            // Create new web-only member
            const newClient = {
                name: normalizedEmail.split("@")[0], // Default name from email
                email: normalizedEmail,
                visits: 0,
                visitCount: 0,
                totalSpend: 0,
                joinedDate: new Date().toISOString().split("T")[0],
                source: "web",
            }

            const createRes = await fetch(`${FIRESTORE_REST}/clients`, {
                method: "POST",
                headers,
                body: JSON.stringify({ fields: objToFields(newClient) }),
            })
            const created = await createRes.json()

            if (!createRes.ok) {
                return NextResponse.json({ error: "Failed to create client" }, { status: 500 })
            }

            return NextResponse.json({
                success: true,
                member: { id: extractId(created.name), ...newClient },
                isNew: true,
            })
        }

        // ═══ Mode: LINE lookup / register ═══
        if (!lineUserId) {
            return NextResponse.json({ error: "Missing lineUserId or mode" }, { status: 400 })
        }

        // 1. Look up by lineUserId
        const lineMatch = await queryClientByField("lineUserId", lineUserId, headers)

        if (lineMatch) {
            // Found — update picture if changed
            const member: Record<string, any> = { id: lineMatch.id, ...lineMatch.data }
            if (pictureUrl && member.pictureUrl !== pictureUrl) {
                await patchClient(lineMatch.id, { pictureUrl }, lineMatch.doc.fields, headers)
                member.pictureUrl = pictureUrl
            }

            return NextResponse.json({
                success: true,
                member,
                isNew: false,
            })
        }

        // 2. Not found by lineUserId — if email provided, try to link or create
        if (email) {
            const normalizedEmail = email.toLowerCase().trim()
            const emailMatch = await queryClientByField("email", normalizedEmail, headers)

            if (emailMatch) {
                // Email exists → link lineUserId to this account
                const updates: Record<string, any> = { lineUserId }
                if (pictureUrl) updates.pictureUrl = pictureUrl
                if (displayName && !emailMatch.data.name) updates.name = displayName

                await patchClient(emailMatch.id, updates, emailMatch.doc.fields, headers)

                return NextResponse.json({
                    success: true,
                    member: { id: emailMatch.id, ...emailMatch.data, ...updates },
                    isNew: false,
                    linked: true,
                })
            }

            // No match by email either → create new with both
            const newClient: Record<string, any> = {
                name: displayName || normalizedEmail.split("@")[0],
                email: normalizedEmail,
                lineUserId,
                visits: 0,
                visitCount: 0,
                totalSpend: 0,
                joinedDate: new Date().toISOString().split("T")[0],
                source: "line",
            }
            if (pictureUrl) newClient.pictureUrl = pictureUrl

            const createRes = await fetch(`${FIRESTORE_REST}/clients`, {
                method: "POST",
                headers,
                body: JSON.stringify({ fields: objToFields(newClient) }),
            })
            const created = await createRes.json()

            if (!createRes.ok) {
                return NextResponse.json({ error: "Failed to create client" }, { status: 500 })
            }

            return NextResponse.json({
                success: true,
                member: { id: extractId(created.name), ...newClient },
                isNew: true,
            })
        }

        // 3. Not found, no email yet → return null (prompt for email)
        return NextResponse.json({
            success: true,
            member: null,
            isNew: false,
            needsEmail: true,
        })

    } catch (err: any) {
        console.error("[/api/auth/line] Error:", err)
        return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
    }
}
