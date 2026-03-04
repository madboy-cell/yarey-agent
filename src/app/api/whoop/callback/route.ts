import { NextResponse } from 'next/server';
import { exchangeWhoopCode } from '@/lib/whoop/api';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, query, where, getDocs, updateDoc } from 'firebase/firestore';

/**
 * ALWAYS render a standalone page — NEVER redirect to /guest/ routes.
 * Redirecting to /guest/* triggers LIFF init in external browsers → LINE login page.
 * LINE users: green "Return to LINE" button
 * Web users: button to navigate to the guest app
 */
function renderPage(opts: { success: boolean; isLine: boolean; webRedirectUrl: string; message?: string }) {
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${opts.success ? 'WHOOP Connected' : 'Connection Error'}</title>
    <style>
        * { box-sizing: border-box; }
        body { background:#051818; color:#D1C09B; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; padding:20px; }
        .card { text-align:center; max-width:340px; width:100%; }
        .icon { font-size:4rem; margin-bottom:20px; animation: pop 0.4s ease-out; }
        @keyframes pop { 0% { transform:scale(0.5); opacity:0; } 100% { transform:scale(1); opacity:1; } }
        .title { font-size:1.4rem; font-weight:800; margin:0 0 12px; letter-spacing:-0.02em; }
        .subtitle-th { font-size:0.9rem; opacity:0.7; margin:0 0 6px; line-height:1.5; }
        .subtitle-en { font-size:0.78rem; opacity:0.4; margin:0 0 28px; line-height:1.4; }
        .btn-primary { display:block; width:100%; background:${opts.isLine ? '#06C755' : '#D1C09B'}; color:${opts.isLine ? '#fff' : '#051818'}; border:none; padding:15px 32px; border-radius:999px; font-size:0.95rem; font-weight:700; cursor:pointer; text-decoration:none; text-align:center; margin-bottom:10px; transition:transform 0.15s; }
        .btn-primary:active { transform:scale(0.97); }
        .btn-secondary { display:block; width:100%; background:rgba(209,192,155,0.12); color:#D1C09B; border:1px solid rgba(209,192,155,0.2); padding:13px 32px; border-radius:999px; font-size:0.85rem; font-weight:600; cursor:pointer; text-align:center; text-decoration:none; transition:transform 0.15s; }
        .btn-secondary:active { transform:scale(0.97); }
        .hint { font-size:0.7rem; opacity:0.3; margin-top:20px; line-height:1.5; }
        .divider { display:flex; align-items:center; gap:8px; margin:6px 0; }
        .divider::before, .divider::after { content:''; flex:1; height:1px; background:rgba(209,192,155,0.1); }
        .divider span { font-size:0.7rem; opacity:0.3; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">${opts.success ? '✅' : '❌'}</div>
        <p class="title">${opts.success ? 'WHOOP Connected!' : 'Connection Failed'}</p>
        <p class="subtitle-th">
            ${opts.success
            ? (opts.isLine
                ? 'เชื่อมต่อสำเร็จแล้ว! กลับไปที่ LINE เพื่อดูข้อมูลสุขภาพ'
                : 'เชื่อมต่อสำเร็จแล้ว! คุณสามารถปิดหน้านี้ได้')
            : (opts.message || 'กรุณาลองใหม่อีกครั้ง')}
        </p>
        <p class="subtitle-en">
            ${opts.success
            ? (opts.isLine
                ? 'Return to LINE to sync and view your wellness data.'
                : 'You can close this window now. Your WHOOP data will sync automatically.')
            : (opts.message || 'Please try again.')}
        </p>
        ${opts.success ? (opts.isLine ? `
        <a href="https://line.me/R/" class="btn-primary">
            กลับไปที่ LINE · Return to LINE
        </a>
        <div class="divider"><span>or</span></div>
        <button onclick="window.close()" class="btn-secondary">
            ปิดหน้านี้ · Close Window
        </button>
        ` : `
        <button onclick="window.close()" class="btn-primary">
            ปิดหน้านี้ · Close This Window
        </button>
        `) : `
        <button onclick="window.close()" class="btn-primary">
            ปิดหน้านี้ · Close Window
        </button>
        `}
        <p class="hint">
            ${opts.success
            ? (opts.isLine
                ? 'ถ้าปุ่มไม่ทำงาน ปัดหน้านี้ปิดแล้วเปิด LINE<br/>If buttons do not work, swipe this page away and open LINE'
                : 'ปิดหน้านี้แล้วกลับไปหน้า Sanctuary<br/>Close this window and return to the Sanctuary app')
            : 'ปิดหน้านี้แล้วลองใหม่<br/>Close this page and try again'}
        </p>
    </div>
    <script>
        // Auto-close external browser window after 3 seconds
        setTimeout(function() { try { window.close(); } catch(e) {} }, 3000);
    </script>
</body>
</html>`;
    return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html' } });
}

export async function GET(request: Request) {

    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const state = searchParams.get('state') || '';

        // --- Parse state FIRST so isLine is available for ALL responses ---
        // State format: mid~MEMBERID~plt~line (using ~ as safe delimiter)
        let memberId: string | null = null;
        let memberEmail: string | null = null;
        let isLine = false;

        if (state) {
            const parts = state.split('~');
            for (let i = 0; i < parts.length; i++) {
                if (parts[i] === 'mid' && parts[i + 1]) {
                    memberId = decodeURIComponent(parts[i + 1]);
                    i++;
                } else if (parts[i] === 'email' && parts[i + 1]) {
                    memberEmail = decodeURIComponent(parts[i + 1]);
                    i++;
                } else if (parts[i] === 'plt' && parts[i + 1]) {
                    isLine = parts[i + 1] === 'line';
                    i++;
                }
            }
        }

        if (error) {
            return renderPage({
                success: false, isLine,
                webRedirectUrl: `${BASE_URL}/guest/whoop?whoop=error&msg=${encodeURIComponent(error)}`,
                message: error,
            });
        }

        if (!code) {
            return renderPage({
                success: false, isLine,
                webRedirectUrl: `${BASE_URL}/guest/whoop?whoop=error&msg=no_code`,
                message: 'No authorization code received',
            });
        }

        if (!process.env.WHOOP_CLIENT_ID || !process.env.WHOOP_CLIENT_SECRET) {
            return renderPage({
                success: false, isLine,
                webRedirectUrl: `${BASE_URL}/guest/whoop?whoop=error&msg=server_config`,
                message: 'Server configuration error',
            });
        }

        // --- Step 1: Exchange code for tokens ---
        let tokens;
        try {
            tokens = await exchangeWhoopCode(code);
        } catch (tokenErr: any) {
            console.error('❌ Token exchange FAILED:', tokenErr.message);
            return renderPage({
                success: false, isLine,
                webRedirectUrl: `${BASE_URL}/guest/whoop?whoop=error&msg=${encodeURIComponent('Token exchange failed')}`,
                message: 'Token exchange failed. Please try again.',
            });
        }

        // --- Step 2: Save session to Firestore ---
        let sessionId: string | null = null;

        try {
            if (memberId) {
                const q = query(collection(db, 'whoop_sessions'), where('memberId', '==', memberId));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const existingDoc = querySnapshot.docs[0];
                    sessionId = existingDoc.id;
                    await updateDoc(doc(db, 'whoop_sessions', sessionId), {
                        access_token: tokens.access_token,
                        refresh_token: tokens.refresh_token,
                        expires_in: tokens.expires_in,
                        scope: tokens.scope,
                        updatedAt: new Date().toISOString(),
                        status: 'active'
                    });
                }
            } else if (memberEmail) {
                const q = query(collection(db, 'whoop_sessions'), where('email', '==', memberEmail));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const existingDoc = querySnapshot.docs[0];
                    sessionId = existingDoc.id;
                    await updateDoc(doc(db, 'whoop_sessions', sessionId), {
                        access_token: tokens.access_token,
                        refresh_token: tokens.refresh_token,
                        expires_in: tokens.expires_in,
                        scope: tokens.scope,
                        updatedAt: new Date().toISOString(),
                        status: 'active',
                    });
                }
            }

            if (!sessionId) {
                const sessionData: Record<string, any> = {
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    expires_in: tokens.expires_in,
                    scope: tokens.scope,
                    createdAt: new Date().toISOString(),
                    status: 'active'
                };
                if (memberId) sessionData.memberId = memberId;
                if (memberEmail) sessionData.email = memberEmail;

                const sessionRef = await addDoc(collection(db, 'whoop_sessions'), sessionData);
                sessionId = sessionRef.id;
            }
        } catch (dbErr: any) {
            console.error('❌ Firestore FAILED:', dbErr.message);
            return renderPage({
                success: false, isLine,
                webRedirectUrl: `${BASE_URL}/guest/whoop?whoop=error&msg=${encodeURIComponent('Database error')}`,
                message: 'Database error. Please try again.',
            });
        }

        // --- Step 3: Success ---
        return renderPage({
            success: true, isLine,
            webRedirectUrl: `${BASE_URL}/guest/whoop?whoop=success&sessionId=${sessionId}`,
        });

    } catch (err: any) {
        console.error('❌ UNHANDLED:', err?.message);
        return renderPage({
            success: false, isLine: false,
            webRedirectUrl: `${BASE_URL}/guest/whoop?whoop=error&msg=${encodeURIComponent(err?.message || 'Unknown error')}`,
            message: err?.message || 'Unknown error',
        });
    }
}
