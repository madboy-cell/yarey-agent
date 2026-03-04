"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { VibeMeter } from "@/components/feature/vibe-meter"
import { Leaf, MapPin, Phone, Clock, Star } from "lucide-react"
import Script from "next/script"

const ease = [0.16, 1, 0.3, 1] as const

// ─── JSON-LD Structured Data ───
const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DaySpa",
    "name": "Yarey Spa & Wellness",
    "alternateName": "YAREY Wellness Retreat",
    "image": "https://yareywellness.com/og-image.jpg",
    "description": "Premium spa in Kathu, Phuket offering Thai massage, Finnish sauna, ice bath cold plunge, herbal compress therapy, and guided thermal rituals.",
    "url": "https://yareywellness.com",
    "telephone": "+66848469393",
    "email": "yarey.wellness@gmail.com",
    "address": {
        "@type": "PostalAddress",
        "streetAddress": "96 Vichitsongkram Rd, Areca Resort & Spa",
        "addressLocality": "Kathu",
        "addressRegion": "Phuket",
        "postalCode": "83120",
        "addressCountry": "TH"
    },
    "geo": {
        "@type": "GeoCoordinates",
        "latitude": 7.9089,
        "longitude": 98.3483
    },
    "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": "10:30",
        "closes": "22:30"
    },
    "priceRange": "฿฿",
    "currenciesAccepted": "THB",
    "paymentAccepted": "Cash, Credit Card, Transfer",
    "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "206",
        "bestRating": "5"
    },
    "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Spa Services",
        "itemListElement": [
            {
                "@type": "Offer",
                "itemOffered": {
                    "@type": "Service",
                    "name": "Yarey Signature Massage",
                    "description": "90-minute restorative therapy combining Thai stretches and manual muscular unknotting"
                },
                "price": "3500",
                "priceCurrency": "THB"
            },
            {
                "@type": "Offer",
                "itemOffered": {
                    "@type": "Service",
                    "name": "Thermal Guided Journey",
                    "description": "120-minute guided cycle through fire and ice zones — Finnish sauna and ice bath cold plunge with personalized infusions"
                },
                "price": "1800",
                "priceCurrency": "THB"
            },
            {
                "@type": "Offer",
                "itemOffered": {
                    "@type": "Service",
                    "name": "Contrast Ritual",
                    "description": "90-minute structured thermal shock — 90°C Finnish dry sauna followed by 5°C cold plunge for complete autonomic reset"
                },
                "price": "1800",
                "priceCurrency": "THB"
            },
            {
                "@type": "Offer",
                "itemOffered": {
                    "@type": "Service",
                    "name": "Meso-Botanical Facial",
                    "description": "60-minute facial using cold-distilled hydrosols for cellular hydration"
                },
                "price": "3200",
                "priceCurrency": "THB"
            },
            {
                "@type": "Offer",
                "itemOffered": {
                    "@type": "Service",
                    "name": "Thai Tradition Massage",
                    "description": "Traditional Thai massage with ancient stretching techniques and pressure point therapy"
                }
            },
            {
                "@type": "Offer",
                "itemOffered": {
                    "@type": "Service",
                    "name": "Herbal Compress Massage",
                    "description": "Thai herbal compress massage with warm herbal poultice therapy using traditional medicinal herbs"
                }
            }
        ]
    },
    "amenityFeature": [
        { "@type": "LocationFeatureSpecification", "name": "Finnish Sauna", "value": true },
        { "@type": "LocationFeatureSpecification", "name": "Ice Bath Cold Plunge", "value": true },
        { "@type": "LocationFeatureSpecification", "name": "Steam Room", "value": true },
        { "@type": "LocationFeatureSpecification", "name": "Swimming Pool", "value": true },
        { "@type": "LocationFeatureSpecification", "name": "Himalayan Salt Sauna", "value": true }
    ],
    "sameAs": [
        "https://www.google.com/maps/place/?q=place_id:ChIJGaxSUq8xUDARNagpVsKhIGk"
    ]
}

const SERVICES = [
    { icon: "🔥", title: "Finnish Sauna", desc: "90°C dry heat with Himalayan salt infusion" },
    { icon: "🧊", title: "Ice Bath Cold Plunge", desc: "5°C therapeutic cold immersion for recovery" },
    { icon: "🙏", title: "Thai Massage", desc: "Traditional stretching & pressure point therapy" },
    { icon: "🌿", title: "Herbal Compress", desc: "Warm Thai herbal poultice healing therapy" },
    { icon: "🔄", title: "Contrast Ritual", desc: "Guided fire & ice cycles for autonomic reset" },
    { icon: "🌸", title: "Aromatherapy", desc: "Botanical oil massage with curated blends" },
]

export default function Home() {
    return (
        <>
            <Script
                id="jsonld-spa"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <div className="relative w-full bg-background text-foreground selection:bg-primary/20">

                {/* ═══════════════════════════════════════════
                     HERO SECTION — Full-screen with video
                ═══════════════════════════════════════════ */}
                <section className="relative h-[100svh] w-full" aria-label="Hero">

                    {/* Video Background */}
                    <video
                        autoPlay muted loop playsInline
                        preload="none"
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ filter: "saturate(0.75) brightness(0.5) contrast(1.1)" }}
                        aria-hidden="true"
                    >
                        <source src="/videos/hero.mp4" type="video/mp4" />
                    </video>

                    {/* Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/30" aria-hidden="true" />
                    <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-transparent to-background/20" aria-hidden="true" />

                    {/* All Content */}
                    <div className="relative z-10 h-full flex flex-col">

                        {/* NAV */}
                        <header className="flex-shrink-0 w-full px-4 md:px-12 lg:px-16">
                            <nav className="max-w-[1440px] mx-auto h-16 md:h-20 flex items-center justify-between" aria-label="Main navigation">
                                <Link
                                    href="/"
                                    className="text-[13px] tracking-[0.4em] uppercase font-sans font-extralight text-white/70 hover:text-white transition-colors duration-500"
                                    aria-label="Yarey Spa & Wellness — Home"
                                >
                                    Yarey
                                </Link>
                                <VibeMeter />
                            </nav>
                        </header>

                        {/* HERO — centered */}
                        <main className="flex-1 flex flex-col items-center justify-center px-6">
                            <div className="text-center max-w-5xl mx-auto">
                                {/* Tagline */}
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 1, delay: 0.3, ease }}
                                    className="flex justify-center mb-6 md:mb-10"
                                >
                                    <div className="inline-flex items-center gap-2.5 px-5 py-2 border border-white/[0.08] bg-white/[0.03]">
                                        <Leaf className="w-3 h-3 text-primary/40" />
                                        <span className="text-[9px] tracking-[0.4em] uppercase text-white/30 font-light">Phuket Wellness Sanctuary</span>
                                    </div>
                                </motion.div>

                                {/* Headline — H1 */}
                                <motion.h1
                                    initial={{ opacity: 0, y: 35 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 1.5, delay: 0.6, ease }}
                                    className="text-[12vw] md:text-[9vw] lg:text-[7.5vw] font-serif font-light text-white leading-[0.88] tracking-[-0.03em] mb-5 md:mb-8"
                                >
                                    Return to<br />
                                    <span className="italic text-primary/85">your senses.</span>
                                </motion.h1>

                                {/* Sub */}
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 1, delay: 1.4 }}
                                    className="text-[12px] md:text-[15px] text-white/30 font-light max-w-sm md:max-w-md mx-auto leading-[1.8] tracking-wide mb-8 md:mb-14"
                                >
                                    Premium spa & wellness in Kathu, Phuket. Guided thermal immersion —
                                    Finnish sauna, ice bath cold plunge, and traditional Thai massage
                                    designed to wash away the weight of the modern world.
                                </motion.p>

                                {/* CTA */}
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: 1.9 }}
                                    className="flex flex-col sm:flex-row items-center justify-center gap-3"
                                >
                                    <Link href="/guest">
                                        <button className="px-12 py-6 md:px-16 md:py-7 bg-white text-background text-[10px] md:text-[11px] uppercase tracking-[0.4em] font-semibold hover:bg-primary transition-all duration-500 shadow-2xl shadow-white/20">
                                            Member Area
                                        </button>
                                    </Link>
                                    <a
                                        href="tel:+66848469393"
                                        className="px-8 py-4 md:px-10 md:py-5 border border-white/[0.12] text-white/40 text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-light hover:text-white/70 hover:border-white/25 transition-all duration-500 flex items-center gap-2"
                                    >
                                        <Phone className="w-3 h-3" />
                                        Book Now
                                    </a>
                                </motion.div>
                            </div>
                        </main>

                        {/* BOTTOM BAR */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 2.5 }}
                            className="flex-shrink-0 pb-6 md:pb-10 flex justify-center"
                        >
                            <div className="flex items-center gap-4 md:gap-6 text-white/12">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-2.5 h-2.5" />
                                    <span className="text-[7px] tracking-[0.4em] uppercase font-light">Kathu, Phuket</span>
                                </div>
                                <span className="text-[6px]">·</span>
                                <div className="flex items-center gap-1">
                                    <Star className="w-2 h-2" />
                                    <span className="text-[7px] tracking-[0.3em] font-light">4.9 ★ (206 reviews)</span>
                                </div>
                                <span className="text-[6px]">·</span>
                                <div className="flex items-center gap-1">
                                    <Clock className="w-2 h-2" />
                                    <span className="text-[7px] tracking-[0.3em] font-light">Open 10:30–22:30</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* ═══════════════════════════════════════════
                     SERVICES SECTION — SEO-rich content
                ═══════════════════════════════════════════ */}
                <section className="relative py-20 md:py-28 px-6" aria-label="Our Services">
                    <div className="max-w-5xl mx-auto">
                        {/* Section Header */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8, ease }}
                            className="text-center mb-16"
                        >
                            <span className="text-[9px] tracking-[0.5em] uppercase text-primary/40 font-light block mb-4">Signature Experiences</span>
                            <h2 className="text-3xl md:text-5xl font-serif font-light text-white/90 leading-tight mb-4">
                                Spa & Wellness <span className="italic text-primary/70">Rituals</span>
                            </h2>
                            <p className="text-[13px] text-white/25 font-light max-w-lg mx-auto leading-[1.8]">
                                From traditional Thai massage to guided thermal immersion through fire and ice —
                                every ritual at Yarey is designed for deep nervous system restoration.
                            </p>
                        </motion.div>

                        {/* Service Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                            {SERVICES.map((s, i) => (
                                <motion.article
                                    key={s.title}
                                    initial={{ opacity: 0, y: 16 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-50px" }}
                                    transition={{ duration: 0.6, delay: i * 0.08, ease }}
                                    className="group rounded-xl p-5 md:p-6 border border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.08] transition-all duration-500"
                                >
                                    <span className="text-2xl md:text-3xl block mb-3">{s.icon}</span>
                                    <h3 className="text-[13px] md:text-sm font-semibold text-white/80 mb-1.5 tracking-wide">{s.title}</h3>
                                    <p className="text-[10px] md:text-[11px] text-white/25 font-light leading-relaxed">{s.desc}</p>
                                </motion.article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ═══════════════════════════════════════════
                     ABOUT / LOCATION SECTION
                ═══════════════════════════════════════════ */}
                <section className="relative py-16 md:py-24 px-6 border-t border-white/[0.04]" aria-label="About & Location">
                    <div className="max-w-5xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-12 md:gap-16">
                            {/* About */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.8, ease }}
                            >
                                <span className="text-[9px] tracking-[0.5em] uppercase text-primary/40 font-light block mb-4">About Yarey</span>
                                <h2 className="text-2xl md:text-3xl font-serif font-light text-white/85 leading-snug mb-5">
                                    A sanctuary of <span className="italic text-primary/70">thermal intelligence</span>
                                </h2>
                                <div className="space-y-4 text-[12px] md:text-[13px] text-white/30 font-light leading-[1.9]">
                                    <p>
                                        Yarey Spa & Wellness is a premium day spa located within the Areca Resort & Spa
                                        in Kathu, Phuket, Thailand. We combine traditional Thai healing arts with modern
                                        thermal science — from 90°C Finnish dry sauna to 5°C ice bath cold plunge.
                                    </p>
                                    <p>
                                        Our signature Contrast Ritual and Thermal Guided Journey are designed as
                                        structured cycles of fire and ice — a proven method for autonomic nervous system
                                        reset, enhanced recovery, and deep relaxation. Every session is personalized
                                        through our wearable-integrated biometric intelligence system.
                                    </p>
                                    <p>
                                        Whether you seek recovery from athletic training, relief from travel fatigue,
                                        or simply a world-class spa experience in Phuket — Yarey is your sanctuary.
                                    </p>
                                </div>

                                {/* Rating badge */}
                                <div className="mt-6 inline-flex items-center gap-3 px-4 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                                    <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <Star key={n} className="w-3 h-3 fill-amber-400 text-amber-400" />
                                        ))}
                                    </div>
                                    <span className="text-[11px] text-white/50 font-light">
                                        <strong className="text-white/80 font-semibold">4.9</strong> · 206 reviews on Google
                                    </span>
                                </div>
                            </motion.div>

                            {/* Location */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.8, ease }}
                            >
                                <span className="text-[9px] tracking-[0.5em] uppercase text-primary/40 font-light block mb-4">Visit Us</span>
                                <h2 className="text-2xl md:text-3xl font-serif font-light text-white/85 leading-snug mb-5">
                                    Find <span className="italic text-primary/70">your way</span>
                                </h2>

                                {/* Map link card */}
                                <a
                                    href="https://www.google.com/maps/place/?q=place_id:ChIJGaxSUq8xUDARNagpVsKhIGk"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500 overflow-hidden mb-6"
                                    aria-label="Open Yarey Spa on Google Maps"
                                >
                                    <div className="p-5">
                                        <div className="flex items-start gap-3">
                                            <MapPin className="w-4 h-4 text-primary/50 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <div className="text-[13px] text-white/70 font-medium mb-1">Yarey Spa & Wellness</div>
                                                <address className="text-[11px] text-white/30 font-light leading-relaxed not-italic">
                                                    96 Vichitsongkram Rd, Areca Resort & Spa<br />
                                                    Kathu District, Phuket 83120, Thailand
                                                </address>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-t border-white/[0.04] px-5 py-3 flex items-center justify-center gap-2">
                                        <span className="text-[9px] uppercase tracking-[0.3em] text-primary/50 font-light">Open in Google Maps →</span>
                                    </div>
                                </a>

                                {/* Contact details */}
                                <div className="space-y-3">
                                    <a href="tel:+66848469393" className="flex items-center gap-3 group">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/[0.06] group-hover:border-white/[0.12] transition-colors">
                                            <Phone className="w-3.5 h-3.5 text-primary/40" />
                                        </div>
                                        <div>
                                            <div className="text-[12px] text-white/60 font-light group-hover:text-white/80 transition-colors">+66 84 846 9393</div>
                                            <div className="text-[9px] text-white/20 font-light">Call or WhatsApp</div>
                                        </div>
                                    </a>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/[0.06]">
                                            <Clock className="w-3.5 h-3.5 text-primary/40" />
                                        </div>
                                        <div>
                                            <div className="text-[12px] text-white/60 font-light">Open daily 10:30 – 22:30</div>
                                            <div className="text-[9px] text-white/20 font-light">Walk-ins welcome</div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* ═══════════════════════════════════════════
                     FOOTER
                ═══════════════════════════════════════════ */}
                <footer className="relative py-8 px-6 border-t border-white/[0.04]" aria-label="Site footer">
                    <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4 md:gap-6 text-white/12">
                            <span className="text-[8px] tracking-[0.4em] uppercase font-light">© 2026 Yarey Spa & Wellness</span>
                            <span className="text-[6px]">·</span>
                            <Link href="/privacy" className="text-[7px] tracking-[0.4em] uppercase font-light hover:text-white/30 transition-colors duration-500">Privacy</Link>
                            <span className="text-[6px]">·</span>
                            <Link href="/admin/login" className="text-[7px] tracking-[0.4em] uppercase font-light text-white/[0.04] hover:text-white/15 transition-colors duration-500">Staff</Link>
                        </div>
                        <div className="flex items-center gap-1.5 text-white/12">
                            <MapPin className="w-2.5 h-2.5" />
                            <span className="text-[7px] tracking-[0.3em] uppercase font-light">Kathu, Phuket, Thailand</span>
                        </div>
                    </div>
                </footer>

            </div>
        </>
    )
}
