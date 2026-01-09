"use client"

import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { ArrowRight, Phone, MessageCircle, Instagram, Facebook } from "lucide-react"

export default function BookingPage() {
    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center py-20 px-6">

            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
            </div>

            <Container className="max-w-2xl relative z-10 text-center space-y-12">
                <div className="space-y-6">
                    <span className="text-[10px] font-bold tracking-[0.6em] uppercase text-primary/60 block animate-pulse">Reservation</span>
                    <h1 className="text-5xl md:text-7xl font-serif text-foreground leading-[1.05]">
                        Personalized <br /><span className="italic text-primary">Concierge.</span>
                    </h1>
                    <p className="text-foreground/60 font-light text-xl leading-relaxed max-w-lg mx-auto">
                        To ensure the perfect sanctuary experience, all reservations are currated directly by our reception team.
                    </p>
                </div>

                <div className="space-y-8">
                    <p className="text-[10px] uppercase tracking-widest text-foreground/30 font-bold">Connect Directly</p>
                    <div className="grid grid-cols-1 gap-6 max-w-md mx-auto">
                        {[
                            { label: "WhatsApp Concierge", icon: MessageCircle, action: () => window.open('https://wa.me/6676123456', '_blank'), color: "text-[#25D366]", bg: "bg-[#25D366]/10", hover: "group-hover:bg-[#25D366]" },
                            { label: "Call Reception", icon: Phone, action: () => window.location.href = 'tel:+6676123456', color: "text-primary", bg: "bg-primary/10", hover: "group-hover:bg-primary" },
                            { label: "Instagram DM", icon: Instagram, action: () => window.open('https://instagram.com', '_blank'), color: "text-[#E1306C]", bg: "bg-[#E1306C]/10", hover: "group-hover:bg-[#E1306C]" }
                        ].map((item, i) => (
                            <Button
                                key={i}
                                variant="outline"
                                className="h-20 rounded-2xl border-primary/10 bg-white/40 hover:bg-white hover:border-primary/30 transition-all duration-500 flex items-center gap-6 justify-between px-8 group shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
                                onClick={item.action}
                            >
                                <div className="flex items-center gap-6">
                                    <div className={`p-3 rounded-full ${item.bg} ${item.color} ${item.hover} group-hover:text-white transition-all duration-300`}>
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <span className="font-serif text-lg text-foreground/80 group-hover:text-foreground transition-colors">{item.label}</span>
                                </div>
                                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 text-primary/40" />
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="bg-white/30 backdrop-blur-md border border-white/40 p-10 rounded-[2.5rem] space-y-3 shadow-lg shadow-primary/5">
                    <p className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Visit Us</p>
                    <p className="text-2xl font-serif text-foreground">Lobby Level, Main Sanctuary</p>
                </div>

                <div className="pt-8">
                    <Button variant="ghost" className="text-[10px] uppercase tracking-[0.2em] text-foreground/30 hover:text-primary transition-colors hover:bg-transparent" onClick={() => window.location.href = '/'}>
                        Return to Home
                    </Button>
                </div>
            </Container>
        </div>
    )
}
