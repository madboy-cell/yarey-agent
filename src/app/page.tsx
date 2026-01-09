"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { Container } from "@/components/layout/container"
import { VibeMeter } from "@/components/feature/vibe-meter"
import {
  ArrowRight,
  ArrowUpRight,
  Activity,
  BrainCircuit,
  Droplets,
  MapPin,
  Sparkles,
  FlaskConical,
  Wind,
  Thermometer,
  Layers,
  Leaf,
  Waves,
  Mountain,
  CloudFog,
  Minus
} from "lucide-react"
import { useRef, useEffect, useState } from "react"

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  })

  return (
    <div ref={containerRef} className="bg-background text-foreground relative min-h-screen selection:bg-primary/30 selection:text-white overflow-x-hidden">

      {/* Navigation - Quantum Light Edition */}
      <nav className="fixed top-0 w-full z-50 transition-all duration-500 bg-background/80 backdrop-blur-md border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-6 h-28 flex items-center justify-between">

          {/* Logo */}
          <div className="flex flex-col items-center group cursor-pointer select-none relative">
            {/* Mystical Glow behind logo */}
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

            <span className="font-serif text-3xl tracking-[0.15em] text-foreground group-hover:text-glow transition-all duration-500 relative z-10">
              YAREY <span className="text-primary">WELLNESS</span>
            </span>
            <div className="flex items-center gap-3 opacity-60 mt-1 group-hover:opacity-100 transition-opacity duration-500 relative z-10">
              <span className="h-[1px] w-8 bg-primary"></span>
              <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-bold">Sanctuary System</span>
              <span className="h-[1px] w-8 bg-primary"></span>
            </div>
          </div>

          {/* Links */}
          <div className="hidden md:flex items-center gap-12 text-[10px] font-bold tracking-[0.25em] uppercase text-primary/70">
            <Link href="/biomarker" className="hover:text-primary hover:text-glow transition-all duration-300 relative group">
              Biomarker
              <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-primary group-hover:w-full transition-all duration-300"></span>
            </Link>
            <a href="#protocols" className="hover:text-primary hover:text-glow transition-all duration-300 relative group">
              Rituals
              <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-primary group-hover:w-full transition-all duration-300"></span>
            </a>
            <a href="#lab" className="hover:text-primary hover:text-glow transition-all duration-300 relative group">
              The Altar
              <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-primary group-hover:w-full transition-all duration-300"></span>
            </a>
            <a href="#expansion" className="hover:text-primary hover:text-glow transition-all duration-300 flex items-center gap-2 group">
              <Sparkles className="w-3 h-3 text-primary animate-pulse" /> Ascend
            </a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-6">
            <VibeMeter />
            <Link href="/booking">
              <button className="px-8 py-3 rounded-sm border border-primary/30 hover:border-primary bg-secondary/30 hover:bg-primary hover:text-background transition-all duration-500 text-[10px] font-bold tracking-[0.25em] uppercase shadow-[0_0_15px_rgba(209,192,155,0.05)] hover:shadow-[0_0_25px_rgba(209,192,155,0.4)]">
                Book Ritual
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-6 overflow-hidden min-h-[92vh] flex flex-col justify-center">
        {/* Decorative Elements */}
        <div className="absolute top-[20%] right-[10%] w-px h-32 bg-gradient-to-b from-transparent via-primary/30 to-transparent"></div>
        <div className="absolute bottom-[20%] left-[10%] w-px h-32 bg-gradient-to-b from-transparent via-primary/30 to-transparent"></div>

        <div className="max-w-7xl mx-auto w-full relative z-10">

          <div className="grid lg:grid-cols-12 gap-20 items-center">
            <div className="lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isLoaded ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 1.5 }}
                className="mb-8 inline-block"
              >
                <div className="flex items-center gap-4">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  <p className="font-serif italic text-primary text-xl tracking-wider">Welcome to the Sanctuary</p>
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={isLoaded ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 1.2, delay: 0.2 }}
                className="font-serif text-6xl md:text-8xl lg:text-9xl text-foreground leading-[0.95] mb-12 drop-shadow-2xl"
              >
                Magical. <br />
                <span className="text-primary italic relative">
                  Grounded.
                  <span className="absolute -z-10 bottom-2 left-0 w-full h-3 bg-primary/10 -rotate-1 skew-x-12 blur-sm"></span>
                </span> <br />
                <span className="text-[0.3em] tracking-[0.5em] uppercase align-middle ml-2 opacity-60 font-sans block mt-6 border-l border-primary/20 pl-4">Inviting • Natural • Kind</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={isLoaded ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 1, delay: 0.4 }}
                className="text-foreground/70 text-lg md:text-xl font-light leading-loose max-w-lg mb-16 font-sans border-l-2 border-primary/20 pl-8"
              >
                A deep forest sanctuary for energetic restoration. We weave somatic release, botanical science, and ancient wisdom to realign your frequency.
              </motion.p>

              {/* Biomarker Dashboard - Mystical Edition */}
              <motion.div
                id="biomarker"
                initial={{ opacity: 0, y: 20 }}
                animate={isLoaded ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 1, delay: 0.6 }}
                className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-lg"
              >
                <div className="p-8 rounded-sm border border-primary/10 bg-secondary/30 backdrop-blur-sm hover:bg-secondary/50 transition-all duration-500 group cursor-crosshair relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-3 text-primary mb-3">
                    <Activity className="w-4 h-4" />
                    <span className="text-[9px] uppercase tracking-[0.2em] font-bold">Aura</span>
                  </div>
                  <span className="text-xl font-serif tracking-wide text-foreground group-hover:text-glow transition-all">Radiant</span>
                </div>

                <div className="p-8 rounded-sm border border-primary/10 bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-all duration-500 group cursor-crosshair relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
                    <Mountain className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex items-center gap-3 text-accent mb-3">
                    <Leaf className="w-4 h-4" />
                    <span className="text-[9px] uppercase tracking-[0.2em] font-bold">Root</span>
                  </div>
                  <span className="text-xl font-serif tracking-wide text-foreground group-hover:text-accent transition-all">Grounded</span>
                </div>

                <div className="p-8 rounded-sm border border-primary/10 bg-secondary/30 backdrop-blur-sm hover:bg-secondary/50 transition-all duration-500 group cursor-crosshair hidden md:block relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
                    <Wind className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-3 text-primary/80 mb-3">
                    <Waves className="w-4 h-4 animate-pulse" />
                    <span className="text-[9px] uppercase tracking-[0.2em] font-bold">Ether</span>
                  </div>
                  <span className="text-xl font-serif tracking-wide text-foreground group-hover:text-glow transition-all">Flowing</span>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 50, rotate: 5 }}
              animate={isLoaded ? { opacity: 1, x: 0, rotate: 0 } : {}}
              transition={{ duration: 1.5, delay: 0.5, ease: "circOut" }}
              className="lg:col-span-5 relative lg:h-[700px] h-[500px]"
            >
              <div className="relative w-full h-full p-8">
                {/* Ornamental Frames */}
                <div className="absolute inset-0 border-[1px] border-primary/20 m-4 z-20 pointer-events-none"></div>
                <div className="absolute inset-0 border-[1px] border-primary/10 m-2 z-20 pointer-events-none"></div>

                {/* Main Image Container */}
                <div className="absolute inset-8 rounded-sm overflow-hidden shadow-[0_20px_100px_rgba(0,0,0,0.7)] bg-background">
                  <Image
                    src="/spa-interior.png"
                    alt="Sanctuary Interior"
                    fill
                    className="object-cover opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all duration-[3s] scale-110 hover:scale-100"
                  />
                  {/* Mystical Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-secondary/50 mix-blend-overlay pointer-events-none"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60 pointer-events-none"></div>
                </div>

                {/* Floating Decor */}
                <div className="absolute -top-4 -right-4 w-32 h-32 border border-primary/20 rounded-full animate-[spin_10s_linear_infinite] opacity-30"></div>
                <div className="absolute -bottom-4 -left-4 w-40 h-40 border border-primary/20 rounded-full animate-[spin_15s_linear_infinite_reverse] opacity-20"></div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Mystical Fog at bottom */}
        <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-background to-transparent pointer-events-none z-10"></div>
      </section>

      {/* The Lab (Altar) Section */}
      <section id="lab" className="py-32 px-6 bg-secondary/20 border-y border-primary/5 relative overflow-hidden">
        {/* Background Particles */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-24 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="order-2 lg:order-1 relative"
          >
            <div className="aspect-square bg-background/50 backdrop-blur-md rounded-full border border-primary/20 p-12 flex items-center justify-center relative shadow-[0_0_50px_rgba(4,42,64,0.5)]">
              {/* Rotating Rings */}
              <div className="absolute inset-0 border border-dashed border-primary/30 rounded-full animate-[spin_20s_linear_infinite]"></div>
              <div className="absolute inset-4 border border-dotted border-primary/20 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>

              <Image
                src="/lab-equipment.png"
                alt="Altar Elements"
                fill
                className="rounded-full object-cover p-12 opacity-90"
              />

              {/* Floating Label */}
              <div className="absolute -bottom-6 -right-6 glass-card p-6 rounded-sm shadow-2xl max-w-[220px] border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#D1C09B]"></span>
                  <span className="text-[9px] font-bold uppercase opacity-80 tracking-[0.2em] text-primary">Sacred Tools</span>
                </div>
                <span className="text-sm font-serif italic text-foreground leading-tight block">Crystalline Rotary Evaporator <br />R-300</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="order-1 lg:order-2"
          >
            <div className="flex items-center gap-3 mb-6">
              <FlaskConical className="w-5 h-5 text-primary" />
              <span className="text-[10px] font-bold tracking-[0.4em] text-primary uppercase">The Altar</span>
            </div>

            <h2 className="text-5xl lg:text-7xl font-serif text-foreground mb-8 leading-none">
              Alchemy of <br />
              <span className="text-primary italic">Nature.</span>
            </h2>

            <p className="text-foreground/70 text-lg font-light leading-relaxed mb-10 max-w-lg border-l border-primary/20 pl-6">
              Our extraction altar combines high-precision technology with sacred intention. We distill potent botanical essences to create elixirs that resonate with your cellular frequency.
            </p>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-serif text-primary mb-2">Bio-Active</h3>
                <p className="text-sm text-foreground/60 leading-relaxed font-sans">
                  Maximum potency extraction retains the vibration of the living plant.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-serif text-primary mb-2">Resonance</h3>
                <p className="text-sm text-foreground/60 leading-relaxed font-sans">
                  Frequencies tuned to restore harmonic balance in the body.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Protocols (Rituals) Section */}
      <section id="protocols" className="py-32 px-6 relative bg-background">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-3 mb-4 opacity-70">
              <span className="w-8 h-[1px] bg-primary"></span>
              <span className="text-[10px] font-bold tracking-[0.4em] text-primary uppercase">Offerings</span>
              <span className="w-8 h-[1px] bg-primary"></span>
            </div>
            <h2 className="text-5xl md:text-7xl font-serif text-foreground mb-6">Sacred Rituals</h2>
            <p className="text-foreground/60 max-w-2xl mx-auto font-light leading-loose">
              Curated journeys designed to shift your state from sympathetic stress to parasympathetic flow.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "The Botanical Deep",
                desc: "Full body massage with warm herbal compresses and bio-identical oils.",
                icon: Leaf,
                color: "text-primary",
                border: "border-primary/20"
              },
              {
                title: "The Contrast Loop",
                desc: "Guided thermal cycle: Sauna (Heat), Plunge (Cold), Rest (Integration).",
                icon: Thermometer,
                color: "text-accent",
                border: "border-accent/20"
              },
              {
                title: "Create Your Flow",
                desc: "Customized module combining breathwork, movement, and stillness.",
                icon: Layers,
                color: "text-foreground",
                border: "border-foreground/20"
              }
            ].map((protocol, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.2 }}
                className={`p-10 rounded-sm bg-secondary/20 border ${protocol.border} hover:bg-secondary/40 transition-all duration-500 group relative overflow-hidden`}
              >
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-30 transition-opacity transform group-hover:rotate-12 duration-700">
                  <protocol.icon className="w-24 h-24" />
                </div>

                <div className={`w-12 h-12 rounded-full border border-current flex items-center justify-center mb-8 ${protocol.color} opacity-80`}>
                  <protocol.icon className="w-5 h-5" />
                </div>

                <h3 className="text-2xl font-serif text-foreground mb-4 group-hover:text-glow transition-all">{protocol.title}</h3>
                <p className="text-foreground/60 text-sm leading-relaxed mb-8 font-light">
                  {protocol.desc}
                </p>

                <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase opacity-60 group-hover:opacity-100 group-hover:text-primary transition-all">
                  <span>Begin Journey</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-primary/10 bg-[#061414]">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
          <div className="mb-8">
            <span className="font-serif text-3xl tracking-[0.15em] text-foreground">
              YAREY <span className="text-primary">WELLNESS</span>
            </span>
          </div>

          <div className="flex gap-8 mb-12 text-[10px] uppercase tracking-[0.2em] text-foreground/50">
            <a href="#" className="hover:text-primary transition-colors">Sanctuary</a>
            <a href="#" className="hover:text-primary transition-colors">Philosophy</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </div>

          <p className="text-foreground/30 text-xs font-light tracking-wide">
            © 2026 Yarey Wellness System. All rights reserved. <br /> Sanctuarized in Phuket, Thailand.
          </p>
        </div>
      </footer>
    </div>
  )
}
