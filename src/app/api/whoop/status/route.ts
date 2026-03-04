import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
        return NextResponse.json({ connected: false, error: 'No session ID' }, { status: 400 });
    }

    try {
        // 1. Direct doc lookup (sessionId IS a Firestore doc ID)
        const directRef = doc(db, 'whoop_sessions', sessionId);
        const directSnap = await getDoc(directRef);

        if (directSnap.exists() && directSnap.data().status === 'active') {
            return NextResponse.json({
                connected: true,
                status: 'active',
                sessionId: directSnap.id,
                expires_in: directSnap.data().expires_in
            });
        }

        // 2. Query by memberId field (primary lookup for LINE-only auth)
        const midQuery = query(collection(db, 'whoop_sessions'), where('memberId', '==', sessionId));
        const midSnapshot = await getDocs(midQuery);

        if (!midSnapshot.empty) {
            const found = midSnapshot.docs.find(d => d.data().status === 'active') || midSnapshot.docs[0];
            const data = found.data();
            if (data.status === 'active') {
                return NextResponse.json({
                    connected: true,
                    status: 'active',
                    sessionId: found.id,
                    expires_in: data.expires_in
                });
            }
        }

        // 3. Legacy: query by email field (backwards compat)
        const emailQuery = query(collection(db, 'whoop_sessions'), where('email', '==', sessionId));
        const emailSnapshot = await getDocs(emailQuery);

        if (!emailSnapshot.empty) {
            const found = emailSnapshot.docs.find(d => d.data().status === 'active') || emailSnapshot.docs[0];
            const data = found.data();
            if (data.status === 'active') {
                return NextResponse.json({
                    connected: true,
                    status: 'active',
                    sessionId: found.id,
                    expires_in: data.expires_in
                });
            }
        }

        return NextResponse.json({ connected: false, reason: 'Session not found' });
    } catch (error) {
        console.error('Error verifying WHOOP session:', error);
        return NextResponse.json({ connected: false, error: 'Database error' }, { status: 500 });
    }
}
