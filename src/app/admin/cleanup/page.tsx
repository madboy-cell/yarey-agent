"use client"

import { useEffect, useState } from 'react'
import { collection, getDocs, deleteDoc, doc, query, where, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Trash2, AlertTriangle, RefreshCw, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function CleanupPage() {
    const router = useRouter()
    const [stats, setStats] = useState({
        total: 0,
        testData: 0,
        loading: true
    })
    const [actionStatus, setActionStatus] = useState<'idle' | 'deleting' | 'success' | 'error'>('idle')
    const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
    const [deleteInput, setDeleteInput] = useState("")

    const fetchStats = async () => {
        setStats(prev => ({ ...prev, loading: true }))
        try {
            const bookingsRef = collection(db, 'bookings')
            const snapshot = await getDocs(bookingsRef)
            const total = snapshot.size
            const testData = snapshot.docs.filter(d => d.data().isTestData === true).length

            setStats({ total, testData, loading: false })
        } catch (error) {
            console.error("Error fetching stats:", error)
            setStats(prev => ({ ...prev, loading: false }))
        }
    }

    useEffect(() => {
        fetchStats()
    }, [])

    const deleteTestData = async () => {
        if (!confirm("Delete only test data (isTestData=true)?")) return

        setActionStatus('deleting')
        try {
            const bookingsRef = collection(db, 'bookings')
            const q = query(bookingsRef, where('isTestData', '==', true))
            const snapshot = await getDocs(q)

            const batch = writeBatch(db)
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref)
            })
            await batch.commit()

            await fetchStats()
            setActionStatus('success')
            setTimeout(() => setActionStatus('idle'), 3000)
        } catch (error) {
            console.error("Error deleting test data:", error)
            setActionStatus('error')
        }
    }

    const deleteAllData = async () => {
        if (deleteInput !== "DELETE") return

        setActionStatus('deleting')
        try {
            const bookingsRef = collection(db, 'bookings')
            const snapshot = await getDocs(bookingsRef)

            // Firestore batches are limited to 500 ops. Simple chunking.
            const chunks = []
            let currentChunk = writeBatch(db)
            let count = 0

            snapshot.docs.forEach((doc) => {
                currentChunk.delete(doc.ref)
                count++
                if (count >= 400) {
                    chunks.push(currentChunk)
                    currentChunk = writeBatch(db)
                    count = 0
                }
            })
            if (count > 0) chunks.push(currentChunk)

            for (const chunk of chunks) {
                await chunk.commit()
            }

            await fetchStats()
            setConfirmDeleteAll(false)
            setDeleteInput("")
            setActionStatus('success')
            setTimeout(() => setActionStatus('idle'), 3000)
        } catch (error) {
            console.error("Error deleting all data:", error)
            setActionStatus('error')
        }
    }

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Trash2 className="text-red-500" /> Data Cleanup
                    </h1>
                    <button
                        onClick={() => router.push('/admin')}
                        className="text-sm text-white/50 hover:text-white"
                    >
                        &larr; Back to Admin
                    </button>
                </div>

                {/* Stats Card */}
                <div className="bg-card border border-primary/20 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold">Booking Database Status</h2>
                        <button onClick={fetchStats} className="p-2 hover:bg-white/5 rounded-full">
                            <RefreshCw className={`w-4 h-4 ${stats.loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 rounded-xl">
                            <div className="text-xs text-foreground/40 uppercase tracking-widest mb-1">Total Bookings</div>
                            <div className="text-2xl font-mono font-bold">{stats.loading ? "..." : stats.total}</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl">
                            <div className="text-xs text-foreground/40 uppercase tracking-widest mb-1">Test Data</div>
                            <div className="text-2xl font-mono font-bold text-primary">{stats.loading ? "..." : stats.testData}</div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                    {/* Delete Test Data Only */}
                    <div className="bg-card border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h3 className="font-bold flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-primary"></span>
                                Delete Test Data Only
                            </h3>
                            <p className="text-sm text-foreground/50 mt-1">
                                Safe. Removes only records marked as 'isTestData: true'.
                            </p>
                        </div>
                        <button
                            onClick={deleteTestData}
                            disabled={stats.testData === 0 || actionStatus === 'deleting'}
                            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/50 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            Delete {stats.testData} Test Records
                        </button>
                    </div>

                    {/* DANGER ZONE: Delete All */}
                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-red-500/10 rounded-xl">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-red-400">Danger Zone: Delete Everything</h3>
                                <p className="text-sm text-red-400/60 mt-1">
                                    This action cannot be undone. This will permanently delete ALL {stats.total} bookings from the database.
                                </p>
                            </div>
                        </div>

                        {!confirmDeleteAll ? (
                            <button
                                onClick={() => setConfirmDeleteAll(true)}
                                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-6 py-3 rounded-xl font-bold transition-all"
                            >
                                Start Deletion Process
                            </button>
                        ) : (
                            <div className="bg-black/40 p-4 rounded-xl space-y-4 border border-red-500/30">
                                <p className="text-sm text-red-200">
                                    To confirm, type <strong className="text-white">DELETE</strong> below:
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={deleteInput}
                                        onChange={(e) => setDeleteInput(e.target.value)}
                                        placeholder="Type DELETE"
                                        className="flex-1 bg-black border border-red-500/30 rounded-lg px-4 py-2 text-white placeholder:text-white/20 focus:outline-none focus:border-red-500"
                                    />
                                    <button
                                        onClick={deleteAllData}
                                        disabled={deleteInput !== "DELETE" || actionStatus === 'deleting'}
                                        className="bg-red-500 text-black px-6 py-2 rounded-lg font-bold hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        I Understand, Delete All
                                    </button>
                                    <button
                                        onClick={() => {
                                            setConfirmDeleteAll(false)
                                            setDeleteInput("")
                                        }}
                                        className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Toasts */}
                {actionStatus === 'success' && (
                    <div className="fixed bottom-8 right-8 bg-emerald-500 text-black px-6 py-3 rounded-xl shadow-lg font-bold flex items-center gap-2 animate-in slide-in-from-bottom-4">
                        <Check className="w-5 h-5" /> Operation Complete
                    </div>
                )}
            </div>
        </div>
    )
}
