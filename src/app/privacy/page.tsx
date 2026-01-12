
import Link from 'next/link'

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-[#051111] text-foreground/80 p-8 md:p-24 font-sans leading-relaxed">
            <div className="max-w-3xl mx-auto space-y-12">
                <header className="space-y-4">
                    <Link href="/" className="text-primary hover:text-primary/80 transition-colors text-sm font-medium">
                        ← Back to Home
                    </Link>
                    <h1 className="text-4xl md:text-5xl font-serif text-primary tracking-tight">Privacy Policy</h1>
                    <p className="text-sm text-foreground/40 font-mono italic">Last updated: January 12, 2026</p>
                </header>

                <section className="space-y-6">
                    <h2 className="text-2xl font-serif text-foreground italic border-b border-primary/10 pb-2">1. Overview</h2>
                    <p>
                        Yarey ("we," "us," or "our") is committed to protecting the privacy of our guests. This Privacy Policy explains how we collect,
                        use, and protect your biometric and personal data when you use the Yarey Bio-Verification OS and integrate your WHOOP wearable data.
                    </p>
                </section>

                <section className="space-y-6">
                    <h2 className="text-2xl font-serif text-foreground italic border-b border-primary/10 pb-2">2. WHOOP Data Integration</h2>
                    <p>
                        When you authorize Yarey to connect with your WHOOP account, we collect the following physiological metrics:
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                        <li>Heart Rate Variability (HRV)</li>
                        <li>Resting Heart Rate (RHR)</li>
                        <li>Sleep patterns (Deep Sleep/REM)</li>
                        <li>Respiratory Rate</li>
                        <li>Daily Strain and Recovery Scores</li>
                    </ul>
                    <p className="mt-4">
                        This data is strictly used to assign your wellness "Pillar" and personalize your automated recovery protocols (e.g., Cold Plunge temperature and Sauna duration).
                    </p>
                </section>

                <section className="space-y-6">
                    <h2 className="text-2xl font-serif text-foreground italic border-b border-primary/10 pb-2">3. Data Security</h2>
                    <p>
                        Your health data is encrypted and stored securely within our private Firestore environment. We do not sell, trade, or share your biometric data
                        with any third parties. Access is limited to authenticated systems required to run your wellness rituals.
                    </p>
                </section>

                <section className="space-y-6">
                    <h2 className="text-2xl font-serif text-foreground italic border-b border-primary/10 pb-2">4. Your Rights</h2>
                    <p>
                        You can revoke Yarey's access to your WHOOP data at any time through the WHOOP mobile app or by contacting our staff. Upon request,
                        we will permanently delete your biometric history from our servers.
                    </p>
                </section>

                <footer className="pt-12 border-t border-primary/10 text-center text-sm text-foreground/40 italic">
                    <p>© 2026 Yarey Wellness Spa. Bio-Verification Verified.</p>
                </footer>
            </div>
        </div>
    )
}
