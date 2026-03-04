import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { memberId, email } = body;

        if (!memberId && !email) {
            return NextResponse.json({ error: 'memberId or email is required' }, { status: 400 });
        }

        // Find sessions by memberId first, then fall back to email
        let snapshot;
        if (memberId) {
            const q = query(collection(db, 'whoop_sessions'), where('memberId', '==', memberId));
            snapshot = await getDocs(q);
        }

        // Fallback to email if no results from memberId
        if ((!snapshot || snapshot.empty) && email) {
            const q = query(collection(db, 'whoop_sessions'), where('email', '==', email));
            snapshot = await getDocs(q);
        }

        if (!snapshot || snapshot.empty) {
            return NextResponse.json({
                success: true,
                disconnected: 0,
                message: 'No WHOOP sessions found — already disconnected',
            });
        }

        // Deactivate only active sessions
        const activeDocs = snapshot.docs.filter(d => d.data().status === 'active');

        if (activeDocs.length === 0) {
            return NextResponse.json({
                success: true,
                disconnected: 0,
                message: 'WHOOP already disconnected',
            });
        }

        const updates = activeDocs.map(d =>
            updateDoc(doc(db, 'whoop_sessions', d.id), {
                status: 'disconnected',
                disconnectedAt: new Date().toISOString(),
                access_token: null,
                refresh_token: null,
            })
        );
        await Promise.all(updates);

        return NextResponse.json({
            success: true,
            disconnected: activeDocs.length,
            message: 'WHOOP disconnected successfully',
        });
    } catch (error: any) {
        console.error('WHOOP disconnect error:', error);
        return NextResponse.json({ error: error.message || 'Disconnect failed' }, { status: 500 });
    }
}
