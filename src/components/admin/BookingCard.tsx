
import { motion } from "framer-motion"
import { CheckSquare, Play, LogOut, MessageCircle, Clock } from "lucide-react"
import { Booking } from "@/app/admin/page"

export interface BookingProps {
    booking: any
    onClick: () => void
    statusColors: Record<string, string>
}

export const BookingCard = ({ booking, onClick, statusColors }: BookingProps) => {

    const getVisitCount = (handle?: string) => {
        return booking.visitCount || 1
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={onClick}
            className="group bg-[#0A2021]/80 border border-[#D1C09B]/20 p-6 rounded-[1.5rem] hover:shadow-[0_0_30px_rgba(209,192,155,0.1)] hover:border-[#D1C09B]/40 transition-all duration-300 relative overflow-hidden cursor-pointer backdrop-blur-sm"
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-serif text-lg text-[#F2F2F2] group-hover:text-glow transition-all duration-300">
                            {booking.contact?.name || "Guest"}
                        </h4>
                        {/* Visit Badge */}
                        {(booking.visitCount > 1) && (
                            <span className="text-[9px] bg-[#D1C09B]/10 text-[#D1C09B] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold border border-[#D1C09B]/20">
                                {booking.visitCount}th Visit
                            </span>
                        )}
                    </div>

                    {/* Treatment & Time */}
                    <div className="flex items-center text-[10px] uppercase tracking-widest text-[#D1C09B]/60 font-bold gap-2">
                        <span>{booking.treatment}</span>
                        <span>•</span>
                        <Clock className="w-3 h-3" />
                        <span>{booking.time}</span>
                    </div>
                </div>

                {/* Status Badge */}
                <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border backdrop-blur-md shadow-sm transition-all ${statusColors[booking.status] || "bg-[#042A40]/50 text-[#F2F2F2]/60 border-[#F2F2F2]/10"}`}>
                    {booking.status}
                </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-1 mt-3 mb-4">
                <p className="text-xs text-[#F2F2F2]/60 font-medium font-sans">
                    {booking.contact?.email}
                </p>
                <p className="text-xs text-[#F2F2F2]/40 font-sans">
                    {booking.contact?.handle}
                </p>
            </div>

            {/* Notes Section */}
            <div className="mt-4 pt-4 border-t border-[#D1C09B]/10">
                {booking.notes ? (
                    <p className="text-xs text-[#F2F2F2]/70 italic truncate font-serif">"{booking.notes}"</p>
                ) : (
                    <p className="text-xs text-[#F2F2F2]/20 italic font-serif">No notes added...</p>
                )}
            </div>

            {/* ID Hash */}
            <div className="absolute bottom-4 right-6 text-[10px] font-mono text-[#D1C09B]/20">
                #{booking.id?.substring(0, 4)}
            </div>

        </motion.div>
    )
}
