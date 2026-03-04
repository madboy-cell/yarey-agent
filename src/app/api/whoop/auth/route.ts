import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const memberId = searchParams.get('memberId');

        const CLIENT_ID = process.env.WHOOP_CLIENT_ID || '';
        if (!CLIENT_ID) {
            return NextResponse.json({ error: "Missing WHOOP_CLIENT_ID env var" }, { status: 500 });
        }

        const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const REDIRECT_URI = `${BASE_URL}/api/whoop/callback`;

        const SCOPES = [
            'offline',
            'read:profile',
            'read:recovery',
            'read:sleep',
            'read:cycles',
            'read:workout',
        ].join(' ');

        // Pass memberId AND platform in state so callback can redirect correctly
        // Using ~ as delimiter (URL-safe, won't be mangled by OAuth providers)
        const platform = searchParams.get('platform') || 'web';
        const state = memberId ? `mid~${memberId}~plt~${platform}` : `plt~${platform}`;

        const authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES)}&state=${encodeURIComponent(state)}`;

        return NextResponse.redirect(authUrl);
    } catch (error: any) {
        console.error("WHOOP Auth Error:", error);
        return NextResponse.json({ error: error.message || "Auth failed" }, { status: 500 });
    }
}
