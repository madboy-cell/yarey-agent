import { useState, useEffect } from 'react'

interface WhoopMetrics {
    hrv: number
    rhr: number
    deepSleep: number
    respRate: number
    recoveryScore?: number
    dataSource?: string
    baseline?: {
        percentChange: {
            hrv: number
            deepSleep: number
        }
        average: {
            hrv: number
            rhr: number
            deepSleep: number
            respRate: number
            sleepMidpoint: number
        }
        meta?: {
            daysUsed: number
            status: string
            message?: string
        }
    }
}

interface WhoopMonitorProps {
    sessionId: string
    onDataUpdate?: (metrics: WhoopMetrics) => void
}

type StatusType = 'loading' | 'syncing' | 'scored' | 'pending' | 'error'

const POLL_INTERVALS = {
    pending: 5000,
    default: 30000
} as const

const RECOVERY_COLORS = {
    high: "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]",
    medium: "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]",
    low: "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]",
    neutral: "text-white/40"
} as const

function getRecoveryColor(score: number, status: StatusType): string {
    if (status !== 'scored') return RECOVERY_COLORS.neutral
    if (score >= 67) return RECOVERY_COLORS.high
    if (score >= 34) return RECOVERY_COLORS.medium
    return RECOVERY_COLORS.low
}

function getDataSourceLabel(dataSource?: string): string {
    switch (dataSource) {
        case 'whoop_v2_live':
            return '⚡ WHOOP V2 LIVE'
        case 'whoop_simulated':
            return '⚠️ SIMULATION'
        case 'firestore_cache':
            return '📂 CACHED'
        default:
            return 'UNKNOWN'
    }
}

export function WhoopMonitor({ sessionId, onDataUpdate }: WhoopMonitorProps) {
    const [metrics, setMetrics] = useState<WhoopMetrics | null>(null)
    const [status, setStatus] = useState<StatusType>('loading')
    const [lastSynced, setLastSynced] = useState<string | null>(null)
    const [retryCount, setRetryCount] = useState(0)
    const [needsCalibration, setNeedsCalibration] = useState(false)
    const [calibrationMessage, setCalibrationMessage] = useState<string | null>(null)

    const pollInterval = status === 'pending' ? POLL_INTERVALS.pending : POLL_INTERVALS.default

    useEffect(() => {
        let isMounted = true

        async function fetchData() {
            try {
                const res = await fetch(`/api/whoop/metrics?sessionId=${sessionId}`)
                const data = await res.json()

                if (!isMounted) return

                if (data.success) {
                    const combinedMetrics = {
                        ...data.metrics,
                        dataSource: data.dataSource,
                        baseline: data.baseline
                    }

                    setMetrics(combinedMetrics)
                    setLastSynced(data.last_synced)
                    onDataUpdate?.(combinedMetrics)

                    setNeedsCalibration(!!data.needsManualCalibration)
                    setCalibrationMessage(
                        data.needsManualCalibration
                            ? (data.baseline?.meta?.message || 'Personalized intake required.')
                            : null
                    )

                    if (data.score_state === 'PENDING_SCORE') {
                        setStatus('pending')
                    } else if (data.score_state === 'UNSCORABLE') {
                        setStatus('error')
                    } else {
                        setStatus('scored')
                    }

                    setRetryCount(0)
                } else {
                    console.warn('WHOOP API Error:', data.error)
                }
            } catch (err) {
                console.error("Poll Error:", err)
                if (retryCount < 3) setRetryCount(prev => prev + 1)
            }
        }

        fetchData()
        const intervalId = setInterval(fetchData, pollInterval)

        return () => {
            isMounted = false
            clearInterval(intervalId)
        }
    }, [sessionId, pollInterval, retryCount, onDataUpdate])

    if (!metrics && status === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-3">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-white/50">Syncing with WHOOP V2...</p>
            </div>
        )
    }

    const displayScore = metrics?.recoveryScore || 0
    const isLive = metrics?.dataSource === 'whoop_v2_live'

    return (
        <div className="w-full bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 overflow-hidden relative">
            {status === 'pending' && (
                <div className="absolute top-0 right-0 p-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-amber-400/80 font-mono">PROCESSING</span>
                </div>
            )}

            {status === 'scored' && isLive && (
                <div className="absolute top-0 right-0 p-3">
                    <span className="text-xs text-emerald-400/50 font-mono flex items-center gap-1">
                        ● LIVE
                    </span>
                </div>
            )}

            {needsCalibration && (
                <div className="mb-6 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <span className="text-lg">✨</span>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Personalized Intake Needed</h4>
                            <p className="text-xs text-white/50 mt-0.5">
                                {calibrationMessage || 'Complete a brief intake to calibrate your sanctuary experience.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-8 relative z-10">
                <div className="col-span-2 flex flex-col items-center mb-4">
                    <span className="text-sm uppercase tracking-widest text-white/40 mb-1">Recovery</span>
                    <h2 className={`text-6xl font-black ${getRecoveryColor(displayScore, status)} transition-colors duration-500`}>
                        {metrics ? `${displayScore}%` : '--'}
                    </h2>
                    {status === 'pending' && (
                        <p className="text-xs text-white/30 mt-2 animate-pulse">
                            High-res sync in progress...
                        </p>
                    )}
                </div>

                <MetricItem
                    label="HRV"
                    value={metrics ? `${Math.round(metrics.hrv)} ms` : '--'}
                    status={status}
                    percentChange={metrics?.baseline?.percentChange?.hrv}
                />
                <MetricItem label="RHR" value={metrics ? `${Math.round(metrics.rhr)} bpm` : '--'} status={status} />
                <MetricItem
                    label="Deep Sleep"
                    value={metrics ? `${Math.round(metrics.deepSleep)} min` : '--'}
                    status={status}
                    percentChange={metrics?.baseline?.percentChange?.deepSleep}
                />
                <MetricItem label="Resp Rate" value={metrics ? `${metrics.respRate.toFixed(1)}` : '--'} status={status} />
            </div>

            {lastSynced && (
                <div className="mt-8 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-white/20 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                        <span className={metrics?.dataSource === 'whoop_v2_live' ? 'text-emerald-500/50' : 'text-amber-500/50'}>
                            Source:
                            <span className="font-bold ml-1">{getDataSourceLabel(metrics?.dataSource)}</span>
                        </span>
                    </div>
                    <span>Last Sync: {new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            )}
        </div>
    )
}

function MetricItem({ label, value, status, percentChange }: {
    label: string
    value: string
    status: string
    percentChange?: number
}) {
    const isNeutral = status !== 'scored'

    const getChangeColor = () => {
        if (percentChange === undefined) return 'text-white/30'
        return percentChange > 0 ? 'text-emerald-400' : 'text-rose-400'
    }

    return (
        <div className="flex flex-col items-center p-3 bg-white/5 rounded-xl border border-white/5 relative group">
            <span className="text-[10px] uppercase text-white/40 mb-1">{label}</span>
            <span className={`text-xl font-bold font-mono ${isNeutral ? 'text-white/60' : 'text-white'}`}>
                {value}
            </span>
            {percentChange !== undefined && !isNaN(percentChange) && (
                <div className={`absolute top-2 right-2 text-[9px] font-mono ${getChangeColor()} bg-black/40 px-1 rounded-full`}>
                    {percentChange > 0 ? '+' : ''}{percentChange}%
                </div>
            )}
        </div>
    )
}
