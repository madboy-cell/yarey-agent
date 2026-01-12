"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Lock, Mail, ArrowRight, AlertCircle } from "lucide-react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"

export default function AdminLoginPage() {
    const router = useRouter()
    const [credentials, setCredentials] = useState({ email: "", password: "" })
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            await signInWithEmailAndPassword(auth, credentials.email, credentials.password)
            // Auth state listener in layout will handle the rest, but we push just in case
            router.push("/admin")
        } catch (err: any) {
            console.error(err)
            if (err.code === 'auth/invalid-credential') {
                setError("Invalid email or password.")
            } else if (err.code === 'auth/too-many-requests') {
                setError("Too many failed attempts. Try again later.")
            } else {
                setError("Access denied. Please contact support.")
            }
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#051818] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Ambiance */}
            <div className="absolute inset-0 opacity-20 bg-[url('/noise.png')] pointer-events-none" />
            <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-primary/5 rounded-full blur-[100px]" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl relative z-10"
            >
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-serif text-[#D1C09B] mb-2">Staff Portal</h1>
                    <p className="text-white/40 text-sm">Secure access for Sanctuary Hosts only.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-white/60 font-bold ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                            <input
                                type="email"
                                value={credentials.email}
                                onChange={e => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#D1C09B] transition-colors"
                                placeholder="name@yarey.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-white/60 font-bold ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                            <input
                                type="password"
                                value={credentials.password}
                                onChange={e => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#D1C09B] transition-colors"
                                placeholder="Enter password"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="bg-red-500/10 border border-red-500/20 text-red-200 text-sm p-3 rounded-lg flex items-center gap-2"
                        >
                            <AlertCircle className="w-4 h-4" /> {error}
                        </motion.div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#D1C09B] hover:bg-[#bfa778] text-[#051818] font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {loading ? "Verifying..." : "Access Dashboard"}
                        {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button onClick={() => router.push("/")} className="text-xs text-white/20 hover:text-white transition-colors">
                        ← Return to Main Site
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
