"use client"

import { useRef, useEffect, useState } from "react"
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { VibeMeter } from "@/components/feature/vibe-meter"
import { Leaf, MapPin, Phone, Clock, Star, ChevronDown, Sparkles } from "lucide-react"
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
    "geo": { "@type": "GeoCoordinates", "latitude": 7.9089, "longitude": 98.3483 },
    "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": "10:30", "closes": "22:30"
    },
    "priceRange": "฿฿",
    "currenciesAccepted": "THB",
    "paymentAccepted": "Cash, Credit Card, Transfer",
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "206", "bestRating": "5" },
    "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Spa Services",
        "itemListElement": [
            { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Yarey Signature Massage", "description": "90-minute restorative therapy" }, "price": "3500", "priceCurrency": "THB" },
            { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Thermal Guided Journey", "description": "120-minute guided fire & ice cycle" }, "price": "1800", "priceCurrency": "THB" },
            { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Contrast Ritual", "description": "90-minute thermal shock protocol" }, "price": "1800", "priceCurrency": "THB" },
            { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Meso-Botanical Facial", "description": "60-minute cellular hydration facial" }, "price": "3200", "priceCurrency": "THB" },
            { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Thai Tradition Massage" } },
            { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Herbal Compress Massage" } }
        ]
    },
    "amenityFeature": [
        { "@type": "LocationFeatureSpecification", "name": "Finnish Sauna", "value": true },
        { "@type": "LocationFeatureSpecification", "name": "Ice Bath Cold Plunge", "value": true },
        { "@type": "LocationFeatureSpecification", "name": "Steam Room", "value": true },
        { "@type": "LocationFeatureSpecification", "name": "Swimming Pool", "value": true },
        { "@type": "LocationFeatureSpecification", "name": "Himalayan Salt Sauna", "value": true }
    ],
    "sameAs": ["https://www.google.com/maps/place/?q=place_id:ChIJGaxSUq8xUDARNagpVsKhIGk"]
}

const SERVICES = [
    { icon: "/icons/sauna.png", title: "Finnish Sauna", desc: "90°C dry heat with Himalayan salt infusion", accent: "from-orange-500/20 to-red-600/10", glow: "shadow-orange-500/20" },
    { icon: "/icons/ice-bath.png", title: "Ice Bath Cold Plunge", desc: "5°C therapeutic cold immersion for recovery", accent: "from-cyan-400/20 to-blue-600/10", glow: "shadow-cyan-500/20" },
    { icon: "/icons/thai-massage.png", title: "Thai Massage", desc: "Traditional stretching & pressure point therapy", accent: "from-amber-400/20 to-yellow-600/10", glow: "shadow-amber-500/20" },
    { icon: "/icons/herbal-compress.png", title: "Herbal Compress", desc: "Warm Thai herbal poultice healing therapy", accent: "from-emerald-500/20 to-green-600/10", glow: "shadow-emerald-500/20" },
    { icon: "/icons/contrast-ritual.png", title: "Contrast Ritual", desc: "Guided fire & ice cycles for autonomic reset", accent: "from-violet-500/20 to-purple-600/10", glow: "shadow-violet-500/20" },
    { icon: "/icons/aromatherapy.png", title: "Aromatherapy", desc: "Botanical oil massage with curated blends", accent: "from-pink-400/20 to-rose-600/10", glow: "shadow-pink-500/20" },
]

// ─── Floating Particles Component ───
function FloatingParticles() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {[...Array(20)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-primary/20"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                        y: [0, -30 - Math.random() * 40, 0],
                        opacity: [0, 0.6, 0],
                        scale: [0.5, 1, 0.5],
                    }}
                    transition={{
                        duration: 4 + Math.random() * 6,
                        repeat: Infinity,
                        delay: Math.random() * 5,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    )
}

// ─── Magnetic hover effect for service cards ───
function ServiceCard({ service, index }: { service: typeof SERVICES[0]; index: number }) {
    const ref = useRef<HTMLDivElement>(null)
    const x = useMotionValue(0)
    const y = useMotionValue(0)
    const rotateX = useSpring(useTransform(y, [-100, 100], [8, -8]), { stiffness: 300, damping: 30 })
    const rotateY = useSpring(useTransform(x, [-100, 100], [-8, 8]), { stiffness: 300, damping: 30 })

    const handleMouse = (e: React.MouseEvent) => {
        if (!ref.current) return
        const rect = ref.current.getBoundingClientRect()
        x.set(e.clientX - rect.left - rect.width / 2)
        y.set(e.clientY - rect.top - rect.height / 2)
    }

    const handleLeave = () => {
        x.set(0)
        y.set(0)
    }

    return (
        <motion.article
            ref={ref}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: index * 0.1, ease }}
            style={{ rotateX, rotateY, transformPerspective: 800 }}
            onMouseMove={handleMouse}
            onMouseLeave={handleLeave}
            className="group relative"
        >
            {/* Glow background */}
            <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${service.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl`} />

            <div className={`relative rounded-2xl p-6 md:p-8 border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm
                group-hover:border-white/[0.15] group-hover:bg-white/[0.04] transition-all duration-700
                group-hover:shadow-2xl ${service.glow} overflow-hidden`}
            >
                {/* Animated gradient shimmer */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
                    <div className={`absolute inset-0 bg-gradient-to-br ${service.accent}`} />
                </div>

                {/* Service icon */}
                <motion.div
                    className="relative w-12 h-12 md:w-14 md:h-14 mb-4"
                    whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                    <Image
                        src={service.icon}
                        alt={service.title}
                        width={56}
                        height={56}
                        className="w-full h-full object-contain drop-shadow-lg"
                        loading="lazy"
                    />
                </motion.div>

                <h3 className="relative text-sm md:text-base font-semibold text-white/90 mb-2 tracking-wide group-hover:text-white transition-colors duration-500">
                    {service.title}
                </h3>
                <p className="relative text-[11px] md:text-xs text-white/30 font-light leading-relaxed group-hover:text-white/50 transition-colors duration-500">
                    {service.desc}
                </p>

                {/* Corner accent */}
                <div className="absolute bottom-0 right-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                    <div className={`absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl ${service.accent} rounded-tl-3xl`} />
                </div>
            </div>
        </motion.article>
    )
}

// ─── Animated Counter ───
function AnimatedCounter({ target, suffix = "" }: { target: string; suffix?: string }) {
    const [count, setCount] = useState(0)
    const numTarget = parseFloat(target)

    useEffect(() => {
        let frame: number
        const duration = 2000
        const start = performance.now()

        const animate = (now: number) => {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 4) // ease-out quart
            setCount(Math.round(eased * numTarget * 10) / 10)
            if (progress < 1) frame = requestAnimationFrame(animate)
        }
        frame = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(frame)
    }, [numTarget])

    return <span>{count}{suffix}</span>
}

export default function Home() {
    const heroRef = useRef<HTMLElement>(null)
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] })
    const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
    const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.1])
    const heroY = useTransform(scrollYProgress, [0, 1], [0, 150])
    const textY = useTransform(scrollYProgress, [0, 0.5], [0, -80])

    // Scroll indicator
    const [showScroll, setShowScroll] = useState(true)
    useEffect(() => {
        const handleScroll = () => setShowScroll(window.scrollY < 50)
        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    return (
        <>
            <Script
                id="jsonld-spa"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <div className="relative w-full bg-background text-foreground selection:bg-primary/20">

                {/* ═══════════════════════════════════════════
                     HERO SECTION — Parallax full-screen
                ═══════════════════════════════════════════ */}
                <section ref={heroRef} className="relative h-[100svh] w-full overflow-hidden" aria-label="Hero">

                    {/* Video Background with Parallax */}
                    <motion.div
                        className="absolute inset-0"
                        style={{ scale: heroScale, y: heroY }}
                    >
                        <video
                            autoPlay muted loop playsInline
                            preload="none"
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{ filter: "saturate(0.75) brightness(0.4) contrast(1.15)" }}
                            aria-hidden="true"
                        >
                            <source src="/videos/hero.mp4" type="video/mp4" />
                        </video>
                    </motion.div>

                    {/* Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" aria-hidden="true" />
                    <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-transparent to-background/30" aria-hidden="true" />

                    {/* Noise texture */}
                    <div className="absolute inset-0 noise-overlay" />

                    {/* Floating particles */}
                    <FloatingParticles />

                    {/* Content */}
                    <motion.div className="relative z-10 h-full flex flex-col" style={{ opacity: heroOpacity }}>

                        {/* NAV */}
                        <header className="flex-shrink-0 w-full px-4 md:px-12 lg:px-16">
                            <nav className="max-w-[1440px] mx-auto h-16 md:h-20 flex items-center justify-between" aria-label="Main navigation">
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 1, delay: 0.2, ease }}
                                >
                                    <Link
                                        href="/"
                                        className="text-[13px] tracking-[0.5em] uppercase font-sans font-extralight text-white/70 hover:text-white transition-colors duration-500"
                                        aria-label="Yarey Spa & Wellness — Home"
                                    >
                                        Yarey
                                    </Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 1, delay: 0.4, ease }}
                                >
                                    <VibeMeter />
                                </motion.div>
                            </nav>
                        </header>

                        {/* HERO Content — centered with parallax */}
                        <motion.main className="flex-1 flex flex-col items-center justify-center px-6" style={{ y: textY }}>
                            <div className="text-center max-w-5xl mx-auto">
                                {/* Tagline */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                    transition={{ duration: 1.2, delay: 0.3, ease }}
                                    className="flex justify-center mb-6 md:mb-10"
                                >
                                    <div className="inline-flex items-center gap-2.5 px-5 py-2.5 border border-white/[0.08] bg-white/[0.03] rounded-full backdrop-blur-sm">
                                        <Sparkles className="w-3 h-3 text-primary/50" />
                                        <span className="text-[9px] tracking-[0.4em] uppercase text-white/35 font-light">Phuket Wellness Sanctuary</span>
                                    </div>
                                </motion.div>

                                {/* Headline — H1 with staggered reveal */}
                                <div className="overflow-hidden mb-5 md:mb-8">
                                    <motion.h1
                                        initial={{ opacity: 0, y: 80 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 1.4, delay: 0.6, ease }}
                                        className="text-[12vw] md:text-[9vw] lg:text-[7.5vw] font-serif font-light text-white leading-[0.88] tracking-[-0.03em]"
                                    >
                                        Return to<br />
                                        <motion.span
                                            initial={{ opacity: 0, x: -30 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 1.2, delay: 1.0, ease }}
                                            className="italic text-primary/85 inline-block"
                                        >
                                            your senses.
                                        </motion.span>
                                    </motion.h1>
                                </div>

                                {/* Sub */}
                                <motion.p
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 1, delay: 1.4 }}
                                    className="text-[12px] md:text-[15px] text-white/30 font-light max-w-sm md:max-w-md mx-auto leading-[1.9] tracking-wide mb-8 md:mb-14"
                                >
                                    Premium spa & wellness in Kathu, Phuket. Guided thermal immersion —
                                    Finnish sauna, ice bath cold plunge, and traditional Thai massage
                                    designed to wash away the weight of the modern world.
                                </motion.p>

                                {/* CTA Buttons */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: 1.9 }}
                                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                                >
                                    <Link href="/guest">
                                        <motion.button
                                            whileHover={{ scale: 1.03, boxShadow: "0 25px 50px rgba(196, 169, 106, 0.25)" }}
                                            whileTap={{ scale: 0.97 }}
                                            className="px-12 py-5 md:px-16 md:py-6 bg-primary text-background text-[10px] md:text-[11px] uppercase tracking-[0.4em] font-semibold hover:bg-primary/90 transition-all duration-500 relative overflow-hidden group"
                                        >
                                            <span className="relative z-10">Member Area</span>
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                        </motion.button>
                                    </Link>
                                    <motion.a
                                        href="tel:+66848469393"
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        className="px-8 py-4 md:px-10 md:py-5 border border-white/[0.12] text-white/40 text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-light hover:text-white/80 hover:border-white/30 hover:bg-white/[0.03] transition-all duration-500 flex items-center gap-2 backdrop-blur-sm"
                                    >
                                        <Phone className="w-3 h-3" />
                                        Book Now
                                    </motion.a>
                                </motion.div>
                            </div>
                        </motion.main>

                        {/* Scroll indicator */}
                        <AnimatePresence>
                            {showScroll && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5, delay: 3 }}
                                    className="flex-shrink-0 pb-8 md:pb-12 flex flex-col items-center gap-3"
                                >
                                    <motion.div
                                        animate={{ y: [0, 8, 0] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        <ChevronDown className="w-4 h-4 text-white/15" />
                                    </motion.div>
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
                            )}
                        </AnimatePresence>
                    </motion.div>
                </section>

                {/* ═════════════════════════════════════════
                     DIVIDER — Animated golden line
                ═══════════════════════════════════════════ */}
                <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, ease }}
                    className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
                />

                {/* ═══════════════════════════════════════════
                     SERVICES SECTION — 3D cards with glow
                ═══════════════════════════════════════════ */}
                <section className="relative py-24 md:py-36 px-6 overflow-hidden" aria-label="Our Services">
                    {/* Background glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[150px] pointer-events-none" />

                    <div className="max-w-6xl mx-auto relative">
                        {/* Section Header */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 1, ease }}
                            className="text-center mb-20"
                        >
                            <motion.span
                                initial={{ opacity: 0, letterSpacing: "0.1em" }}
                                whileInView={{ opacity: 1, letterSpacing: "0.5em" }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.5, ease }}
                                className="text-[9px] uppercase text-primary/50 font-light block mb-5"
                            >
                                Signature Experiences
                            </motion.span>
                            <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif font-light text-white/90 leading-tight mb-5">
                                Spa & Wellness{" "}
                                <motion.span
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 1, delay: 0.3, ease }}
                                    className="italic text-primary/70"
                                >
                                    Rituals
                                </motion.span>
                            </h2>
                            <motion.p
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, delay: 0.5 }}
                                className="text-[13px] text-white/25 font-light max-w-lg mx-auto leading-[1.9]"
                            >
                                From traditional Thai massage to guided thermal immersion through fire and ice —
                                every ritual at Yarey is designed for deep nervous system restoration.
                            </motion.p>
                        </motion.div>

                        {/* Service Grid — 3D magnetic cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                            {SERVICES.map((s, i) => (
                                <ServiceCard key={s.title} service={s} index={i} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* ═══════════════════════════════════════════
                     STATS RIBBON — Animated counters
                ═══════════════════════════════════════════ */}
                <motion.section
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1 }}
                    className="relative py-16 md:py-20 px-6 border-y border-white/[0.04] bg-gradient-to-r from-transparent via-white/[0.01] to-transparent"
                >
                    <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
                        {[
                            { value: "4.9", label: "Google Rating", suffix: " ★" },
                            { value: "206", label: "Guest Reviews", suffix: "+" },
                            { value: "90", label: "Sauna °C", suffix: "°" },
                            { value: "5", label: "Ice Bath °C", suffix: "°" },
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: i * 0.1 }}
                            >
                                <div className="text-3xl md:text-4xl font-serif font-light text-primary/80 mb-2">
                                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                                </div>
                                <div className="text-[9px] md:text-[10px] tracking-[0.3em] uppercase text-white/20 font-light">{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* ═══════════════════════════════════════════
                     ABOUT / LOCATION SECTION
                ═══════════════════════════════════════════ */}
                <section className="relative py-20 md:py-32 px-6" aria-label="About & Location">
                    <FloatingParticles />
                    <div className="max-w-5xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-16 md:gap-20">
                            {/* About */}
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.8, ease }}
                            >
                                <motion.span
                                    initial={{ opacity: 0, letterSpacing: "0.1em" }}
                                    whileInView={{ opacity: 1, letterSpacing: "0.5em" }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 1.5, ease }}
                                    className="text-[9px] uppercase text-primary/40 font-light block mb-4"
                                >
                                    About Yarey
                                </motion.span>
                                <h2 className="text-2xl md:text-4xl font-serif font-light text-white/85 leading-snug mb-6">
                                    A sanctuary of{" "}
                                    <span className="italic text-primary/70">thermal intelligence</span>
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
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    className="mt-8 inline-flex items-center gap-3 px-5 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm"
                                >
                                    <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <motion.div
                                                key={n}
                                                initial={{ opacity: 0, scale: 0 }}
                                                whileInView={{ opacity: 1, scale: 1 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: 0.5 + n * 0.1, type: "spring", stiffness: 400 }}
                                            >
                                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                            </motion.div>
                                        ))}
                                    </div>
                                    <span className="text-[11px] text-white/50 font-light">
                                        <strong className="text-white/80 font-semibold">4.9</strong> · 206 reviews on Google
                                    </span>
                                </motion.div>
                            </motion.div>

                            {/* Location */}
                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.8, ease }}
                            >
                                <motion.span
                                    initial={{ opacity: 0, letterSpacing: "0.1em" }}
                                    whileInView={{ opacity: 1, letterSpacing: "0.5em" }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 1.5, ease }}
                                    className="text-[9px] uppercase text-primary/40 font-light block mb-4"
                                >
                                    Visit Us
                                </motion.span>
                                <h2 className="text-2xl md:text-4xl font-serif font-light text-white/85 leading-snug mb-6">
                                    Find <span className="italic text-primary/70">your way</span>
                                </h2>

                                {/* Map link card */}
                                <motion.a
                                    href="https://www.google.com/maps/place/?q=place_id:ChIJGaxSUq8xUDARNagpVsKhIGk"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    className="block rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/20 transition-all duration-500 overflow-hidden mb-8 backdrop-blur-sm shadow-lg shadow-black/20"
                                    aria-label="Open Yarey Spa on Google Maps"
                                >
                                    <div className="p-6">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <MapPin className="w-4 h-4 text-primary/60" />
                                            </div>
                                            <div>
                                                <div className="text-[13px] text-white/70 font-medium mb-1">Yarey Spa & Wellness</div>
                                                <address className="text-[11px] text-white/30 font-light leading-relaxed not-italic">
                                                    96 Vichitsongkram Rd, Areca Resort & Spa<br />
                                                    Kathu District, Phuket 83120, Thailand
                                                </address>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-t border-white/[0.04] px-6 py-3.5 flex items-center justify-center gap-2 group">
                                        <span className="text-[9px] uppercase tracking-[0.3em] text-primary/50 font-light group-hover:text-primary/80 transition-colors">Open in Google Maps</span>
                                        <motion.span
                                            animate={{ x: [0, 4, 0] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                            className="text-primary/50"
                                        >→</motion.span>
                                    </div>
                                </motion.a>

                                {/* Contact details */}
                                <div className="space-y-4">
                                    <motion.a
                                        href="tel:+66848469393"
                                        whileHover={{ x: 4 }}
                                        className="flex items-center gap-4 group"
                                    >
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.03] border border-white/[0.06] group-hover:border-primary/20 group-hover:bg-primary/5 transition-all duration-500">
                                            <Phone className="w-4 h-4 text-primary/40 group-hover:text-primary/70 transition-colors" />
                                        </div>
                                        <div>
                                            <div className="text-[13px] text-white/60 font-light group-hover:text-white/80 transition-colors">+66 84 846 9393</div>
                                            <div className="text-[9px] text-white/20 font-light">Call or WhatsApp</div>
                                        </div>
                                    </motion.a>
                                    <motion.div
                                        whileHover={{ x: 4 }}
                                        className="flex items-center gap-4"
                                    >
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.03] border border-white/[0.06]">
                                            <Clock className="w-4 h-4 text-primary/40" />
                                        </div>
                                        <div>
                                            <div className="text-[13px] text-white/60 font-light">Open daily 10:30 – 22:30</div>
                                            <div className="text-[9px] text-white/20 font-light">Walk-ins welcome</div>
                                        </div>
                                    </motion.div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* ═══════════════════════════════════════════
                     FOOTER
                ═══════════════════════════════════════════ */}
                <footer className="relative py-10 px-6 border-t border-white/[0.04]" aria-label="Site footer">
                    <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4 md:gap-6 text-white/15">
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
