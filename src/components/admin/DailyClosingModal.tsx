import { useState, useMemo, useCallback } from "react"
import { motion } from "framer-motion"
import { X, Copy, Check, DollarSign, Receipt, CreditCard, Banknote, Users, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Booking } from "@/types"

interface DailyClosingModalProps {
    date: string
    bookings: Booking[]
    onClose: () => void
}

const PAYMENT_METHOD_MAP = {
    "Cash": "cash",
    "Transfer": "transfer",
    "Credit Card": "credit",
    "WeChat Pay": "wechat",
    "AliPay": "alipay"
} as const

const PaymentRow = ({ icon: Icon, label, amount, iconColor, isError = false }: {
    icon: any
    label: string
    amount: number
    iconColor: string
    isError?: boolean
}) => (
    <div className={`flex justify-between items-center p-3 rounded-xl border ${isError ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-white/5 border-white/5'
        }`}>
        <div className="flex items-center gap-3 text-white">
            <Icon className={`w-4 h-4 ${iconColor}`} />
            <span>{label}</span>
        </div>
        <span className="font-mono font-bold">฿{amount.toLocaleString()}</span>
    </div>
)

export const DailyClosingModal = ({ date, bookings, onClose }: DailyClosingModalProps) => {
    const [selectedDate, setSelectedDate] = useState(date)
    const [copied, setCopied] = useState(false)

    const dailyBookings = useMemo(
        () => bookings.filter(b =>
            b.date === selectedDate &&
            b.status !== "Cancelled" &&
            b.status !== "No Show"
        ),
        [bookings, selectedDate]
    )

    const report = useMemo(() => {
        const totals = {
            totalRevenue: 0,
            cash: 0,
            transfer: 0,
            credit: 0,
            wechat: 0,
            alipay: 0,
            other: 0,
            guests: 0
        }

        dailyBookings.forEach(b => {
            const price = b.priceSnapshot || 0
            totals.totalRevenue += price
            totals.guests += (b.guests || 1)

            const methodKey = PAYMENT_METHOD_MAP[b.paymentMethod as keyof typeof PAYMENT_METHOD_MAP]
            if (methodKey) {
                totals[methodKey] += price
            } else {
                totals.other += price
            }
        })

        return totals
    }, [dailyBookings])

    const handleCopy = useCallback(() => {
        const guestListText = dailyBookings.map((b, i) => {
            const name = b.contact?.name || "Guest"
            const treatment = b.treatment || "Service"
            const price = b.priceSnapshot?.toLocaleString() || "0"
            const method = b.paymentMethod ? `[${b.paymentMethod.substring(0, 4)}]` : ""
            return `${i + 1}. ${name} - ${treatment} - ฿${price} ${method}`
        }).join("\n")

        const otherLine = report.other > 0 ? `❓ Other: ${report.other.toLocaleString()}` : ""
        const displayDate = new Date(selectedDate).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })

        const text = `🟢 YAREY WELLNESS - DAILY CLOSE
📅 Date: ${displayDate}

💵 TOTAL REVENUE: ${report.totalRevenue.toLocaleString()} THB

🔸 Cash: ${report.cash.toLocaleString()}
🔹 Transfer: ${report.transfer.toLocaleString()}
💳 Credit Card: ${report.credit.toLocaleString()}
💬 WeChat: ${report.wechat.toLocaleString()}
💎 AliPay: ${report.alipay.toLocaleString()}
${otherLine}

📝 GUEST LIST (${dailyBookings.length}):
${guestListText}

#YareyWellness #DailyReport`

        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [dailyBookings, report, selectedDate])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0c2627] w-full max-w-md rounded-[2rem] shadow-2xl border border-primary/20 overflow-hidden relative"
            >
                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="font-serif text-2xl text-primary tracking-wide flex items-center gap-2">
                                <Receipt className="w-6 h-6" /> Daily Closing
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-transparent text-gray-400 text-sm focus:text-white focus:outline-none cursor-pointer"
                                />
                            </div>
                        </div>
                        <Button variant="ghost" onClick={onClose} className="rounded-full h-10 w-10 p-0 hover:bg-white/5 text-gray-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 mb-6 text-center">
                        <p className="text-xs uppercase tracking-widest text-primary/60 font-bold mb-2">Total Revenue</p>
                        <h1 className="text-4xl font-serif text-primary">฿{report.totalRevenue.toLocaleString()}</h1>
                    </div>

                    <div className="space-y-3 mb-8">
                        <PaymentRow icon={Banknote} label="Cash" amount={report.cash} iconColor="text-green-400" />
                        <PaymentRow icon={DollarSign} label="Transfer" amount={report.transfer} iconColor="text-blue-400" />
                        <PaymentRow icon={CreditCard} label="Credit Card" amount={report.credit} iconColor="text-purple-400" />
                        {report.wechat > 0 && (
                            <PaymentRow icon={Globe} label="WeChat Pay" amount={report.wechat} iconColor="text-green-400" />
                        )}
                        {report.alipay > 0 && (
                            <PaymentRow icon={Globe} label="AliPay" amount={report.alipay} iconColor="text-blue-400" />
                        )}
                        {report.other > 0 && (
                            <PaymentRow icon={Receipt} label="Unspecified" amount={report.other} iconColor="" isError />
                        )}
                    </div>

                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl mb-8">
                        <div className="flex items-center gap-2 text-gray-400">
                            <Users className="w-4 h-4" />
                            <span className="text-sm">Total Guests</span>
                        </div>
                        <span className="text-xl font-bold text-white">{report.guests}</span>
                    </div>

                    <Button
                        onClick={handleCopy}
                        className={`w-full h-12 rounded-xl font-bold text-lg transition-all ${copied ? "bg-green-500 text-white" : "bg-primary text-[#051818] hover:bg-primary/90"
                            }`}
                    >
                        {copied ? (
                            <><Check className="w-5 h-5 mr-2" /> Copied for LINE</>
                        ) : (
                            <><Copy className="w-5 h-5 mr-2" /> Copy Summary</>
                        )}
                    </Button>
                </div>
            </motion.div>
        </div>
    )
}
