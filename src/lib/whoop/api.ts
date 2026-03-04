/**
 * WHOOP API Utility
 * Handles OAuth token exchange and data fetching
 * API Docs: https://developer.whoop.com/api
 * 
 * All credentials read directly from process.env (no Firestore overhead).
 */

const WHOOP_API_BASE = 'https://api.prod.whoop.com'

export interface WhoopTokenResponse {
    access_token: string
    expires_in: number
    refresh_token: string
    scope: string
    token_type: string
}

function getDateISO(daysAgo: number): string {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    return date.toISOString()
}

async function fetchWhoopAPI(endpoint: string, accessToken: string) {
    const response = await fetch(`${WHOOP_API_BASE}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    })

    if (!response.ok) {
        throw new Error(`WHOOP API Error: ${response.status} ${endpoint}`)
    }

    return response.json()
}

export async function exchangeWhoopCode(code: string): Promise<WhoopTokenResponse> {
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const REDIRECT_URI = `${BASE_URL}/api/whoop/callback`

    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.WHOOP_CLIENT_ID || '',
        client_secret: process.env.WHOOP_CLIENT_SECRET || '',
        redirect_uri: REDIRECT_URI
    })

    const response = await fetch(`${WHOOP_API_BASE}/oauth/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    })

    if (!response.ok) {
        const errorBody = await response.text()
        console.error('  [exchangeWhoopCode] FAILED:', response.status, errorBody)
        throw new Error(`WHOOP Token Exchange Failed (${response.status}): ${errorBody}`)
    }

    return response.json()
}


export async function getWhoopMetrics(accessToken: string, days: number = 14) {
    const startISO = getDateISO(days)

    const [recoveryData, sleepData] = await Promise.all([
        fetchWhoopAPI(`/developer/v1/recovery?start=${startISO}`, accessToken),
        fetchWhoopAPI(`/developer/v1/activity/sleep?start=${startISO}`, accessToken)
    ])

    return {
        recovery: recoveryData.records || [],
        sleep: sleepData.records || []
    }
}
