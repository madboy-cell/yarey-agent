import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { X, Copy, Check, DollarSign, Receipt, CreditCard, Banknote, Users, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Booking } from "@/types"

interface DailyClosingModalProps {
    date: string // YYYY-MM-DD
    bookings: Booking[]
    onClose: () => void
}

export const DailyClosingModal = ({ date, bookings, onClose }: DailyClosingModalProps) => {
    const [copied, setCopied] = useState(false)

    // Filter bookings for this date + Completed/Confirmed status
    const dailyBookings = useMemo(() => {
        return bookings.filter(b =>
            b.date === date &&
            b.status !== "Cancelled" &&
            b.status !== "No Show"
        )
    }, [bookings, date])

    // Calculate Totals
    const report = useMemo(() => {
        let totalRevenue = 0
        let cash = 0
        let transfer = 0
        let credit = 0
        let wechat = 0
        let alipay = 0
        let other = 0
        let guests = 0

        dailyBookings.forEach(b => {
            const price = b.priceSnapshot || 0
            totalRevenue += price
            guests += (b.guests || 1)

            if (b.paymentMethod === "Cash") cash += price
            else if (b.paymentMethod === "Transfer") transfer += price
            else if (b.paymentMethod === "Credit Card") credit += price
            else if (b.paymentMethod === "WeChat Pay") wechat += price
            else if (b.paymentMethod === "AliPay") alipay += price
            else other += price
        })

        return { totalRevenue, cash, transfer, credit, wechat, alipay, other, guests }
    }, [dailyBookings])

    const handleCopy = () => {
        // Generate Guest List String
        const guestListText = dailyBookings.map((b, i) => {
            const name = b.contact?.name || "Guest"
            const treatment = b.treatment || "Service"
            const price = b.priceSnapshot?.toLocaleString() || "0"
            const method = b.paymentMethod ? `[${b.paymentMethod.substring(0, 4)}]` : ""
            return `${i + 1}. ${name} - ${treatment} - ฿${price} ${method}`
        }).join("\n")

        const text = `🟢 YAREY WELLNESS - DAILY CLOSE
📅 Date: ${new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}

💵 TOTAL REVENUE: ${report.totalRevenue.toLocaleString()} THB

🔸 Cash: ${report.cash.toLocaleString()}
🔹 Transfer: ${report.transfer.toLocaleString()}
💳 Credit Card: ${report.credit.toLocaleString()}
💬 WeChat: ${report.wechat.toLocaleString()}
💎 AliPay: ${report.alipay.toLocaleString()}
${report.other > 0 ? `❓ Other: ${report.other.toLocaleString()}` : ""}

📝 GUEST LIST (${dailyBookings.length}):
${guestListText}

#YareyWellness #DailyReport`

        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

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
                            <p className="text-gray-400 text-sm mt-1">{new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        </div>
                        <Button variant="ghost" onClick={onClose} className="rounded-full h-10 w-10 p-0 hover:bg-white/5 text-gray-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Total Card */}
                    <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 mb-6 text-center">
                        <p className="text-xs uppercase tracking-widest text-primary/60 font-bold mb-2">Total Revenue</p>
                        <h1 className="text-4xl font-serif text-primary">฿{report.totalRevenue.toLocaleString()}</h1>
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-3 mb-8">
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3 text-white">
                                <Banknote className="w-4 h-4 text-green-400" />
                                <span>Cash</span>
                            </div>
                            <span className="font-mono font-bold">฿{report.cash.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3 text-white">
                                <DollarSign className="w-4 h-4 text-blue-400" />
                                <span>Transfer</span>
                            </div>
                            <span className="font-mono font-bold">฿{report.transfer.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3 text-white">
                                <CreditCard className="w-4 h-4 text-purple-400" />
                                <span>Credit Card</span>
                            </div>
                            <span className="font-mono font-bold">฿{report.credit.toLocaleString()}</span>
                        </div>
                        {(report.wechat > 0 || report.alipay > 0) && (
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3 text-white">
                                    <Globe className="w-4 h-4 text-green-400" />
                                    <span>Digital Wallet (WeChat/Ali)</span>
                                </div>
                                <span className="font-mono font-bold">฿{(report.wechat + report.alipay).toLocaleString()}</span>
                            </div>
                        )}
                        {report.other > 0 && (
                            <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-200">
                                <div className="flex items-center gap-3">
                                    <Receipt className="w-4 h-4" />
                                    <span>Unspecified</span>
                                </div>
                                <span className="font-mono font-bold">฿{report.other.toLocaleString()}</span>
                            </div>
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
                        className={`w-full h-12 rounded-xl font-bold text-lg transition-all ${copied ? "bg-green-500 text-white" : "bg-primary text-[#051818] hover:bg-primary/90"}`}
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
