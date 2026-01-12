
import { NextResponse } from 'next/server';
import { exchangeWhoopCode } from '@/lib/whoop/api';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/members?whoop=error&msg=${error}`);
    }

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    try {
        // 1. Exchange the code for real tokens
        const tokens = await exchangeWhoopCode(code);

        // 2. Temporarily store the token or link it to a session
        // In a real app, we would use the 'state' parameter or a cookie to link this to the 
        // currently logged-in Client. For now, we'll save it to a 'whoop_sessions' collection.
        const sessionRef = await addDoc(collection(db, 'whoop_sessions'), {
            ...tokens,
            createdAt: new Date().toISOString(),
            status: 'active'
        });

        // 3. Redirect back to members page with the session ID
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        return NextResponse.redirect(`${baseUrl}/members?whoop=success&sessionId=${sessionRef.id}`);

    } catch (err: any) {
        console.error('WHOOP Callback Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
