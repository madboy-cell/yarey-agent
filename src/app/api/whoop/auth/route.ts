
import { NextResponse } from 'next/server';

export async function GET() {
    const CLIENT_ID = process.env.WHOOP_CLIENT_ID;
    const REDIRECT_URI = process.env.NEXT_PUBLIC_BASE_URL
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/whoop/callback`
        : 'http://localhost:3000/api/whoop/callback';

    // Scopes needed for Pillar analysis
    const SCOPES = [
        'offline',
        'read:profile',
        'read:recovery',
        'read:sleep',
    ].join(' ');

    // Correct WHOOP OAuth URL
    const authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES)}&state=yarey_connect`;

    return NextResponse.redirect(authUrl);
}
