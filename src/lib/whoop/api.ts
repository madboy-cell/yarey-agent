
/**
 * WHOOP API Utility
 * Handles OAuth token exchange and data fetching
 * API Docs: https://developer.whoop.com/api
 */

const WHOOP_API_BASE = 'https://api.prod.whoop.com';

const CLIENT_ID = process.env.WHOOP_CLIENT_ID;
const CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_BASE_URL
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/whoop/callback`
    : 'http://localhost:3000/api/whoop/callback';

export interface WhoopTokenResponse {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    token_type: string;
}

export async function exchangeWhoopCode(code: string): Promise<WhoopTokenResponse> {
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
    });

    const response = await fetch(`${WHOOP_API_BASE}/oauth/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`WHOOP Token Exchange Failed: ${error}`);
    }

    return response.json();
}

export async function getWhoopMetrics(accessToken: string, days: number = 14) {
    // WHOOP Developer API v1 Endpoints
    // Docs: https://developer.whoop.com/api

    const start = new Date();
    start.setDate(start.getDate() - days);
    const startISO = start.toISOString();

    const headers = {
        'Authorization': `Bearer ${accessToken}`,
    };

    // 1. Fetch Recovery (HRV, RHR)
    const recoveryRes = await fetch(`${WHOOP_API_BASE}/developer/v1/recovery?start=${startISO}`, { headers });
    const recoveryData = await recoveryRes.json();

    // 2. Fetch Sleep (Deep Sleep, Resp Rate)
    const sleepRes = await fetch(`${WHOOP_API_BASE}/developer/v1/activity/sleep?start=${startISO}`, { headers });
    const sleepData = await sleepRes.json();

    return {
        recovery: recoveryData.records || [],
        sleep: sleepData.records || [],
    };
}
