"use client"

import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion"
import Link from "next/link"
import { Container } from "@/components/layout/container"
import { VibeMeter } from "@/components/feature/vibe-meter"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  Wind,
  Snowflake,
  Flame,
  FlaskConical,
  User,
  Clock,
  Droplet,
  Waves,
  Sun,
  Star,
  Leaf,
  Sparkles
} from "lucide-react"
import { useRef, useEffect, useState } from "react"

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const [isHoveringHero, setIsHoveringHero] = useState(false)

  // Spotlight effect logic (now a soft 'Glow' for light mode)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 80, damping: 25 })
  const springY = useSpring(mouseY, { stiffness: 80, damping: 25 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect()
        mouseX.set(e.clientX - rect.left)
        mouseY.set(e.clientY - rect.top)
      }
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [mouseX, mouseY])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  })

  // Hero internal motion
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.98])
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, -50])

  return (
    <div ref={containerRef} className="bg-background text-foreground selection:bg-primary/10 overflow-x-hidden aura-bg">

      {/* 0. Noise Texture (Global/Subtle) */}
      <div className="fixed inset-0 noise z-50 pointer-events-none opacity-[0.03]" />

      {/* Navigation - Elevated Minimalist */}
      <nav className="fixed top-0 w-full z-50 transition-all duration-700">
        <div className="absolute inset-0 bg-background/60 backdrop-blur-2xl border-b border-border/40"></div>
        <div className="max-w-7xl mx-auto px-8 h-24 flex items-center justify-between relative z-10">
          <Link href="/" className="text-xl font-medium tracking-[0.2em] flex items-center gap-3 font-serif text-foreground">
            <div className="w-8 h-8 rounded-full border border-primary/20 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-primary/60" />
            </div>
            YAREY
          </Link>

          <div className="hidden md:flex items-center gap-12 text-[10px] font-bold tracking-[0.4em] text-foreground/50 uppercase">
            <a href="#rituals" className="hover:text-primary transition-all hover:translate-y-[-1px]">The Rituals</a>
            <a href="#botanical" className="hover:text-primary transition-all hover:translate-y-[-1px]">Botanical</a>
            <a href="#menu" className="hover:text-primary transition-all hover:translate-y-[-1px]">Menu</a>
          </div>

          <div className="flex items-center gap-8">
            <VibeMeter />
            <Link href="/booking">
              <Button className="px-10 py-6 rounded-full bg-foreground text-background text-[10px] uppercase tracking-[0.3em] font-bold hover:scale-[1.02] shadow-xl shadow-foreground/5 transition-all">
                Reserve
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* 1. Ethereal Hero Section */}
      <section
        ref={heroRef}
        onMouseEnter={() => setIsHoveringHero(true)}
        onMouseLeave={() => setIsHoveringHero(false)}
        className="relative h-[95vh] flex flex-col items-center justify-center overflow-hidden pt-24"
      >
        {/* Soft Golden Glow Revelator */}
        <motion.div
          style={{
            left: springX,
            top: springY,
            opacity: isHoveringHero ? 0.6 : 0
          }}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] z-20 transition-opacity duration-1000"
        />

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
          className="relative z-30 text-center px-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="inline-flex items-center gap-3 mb-12 px-4 py-1.5 rounded-full bg-white/50 border border-border/50 backdrop-blur-sm shadow-sm"
          >
            <Sparkles className="w-3 h-3 text-primary/60" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">Phuket Sanctuary • Est. 2026</span>
          </motion.div>

          <h1 className="text-7xl md:text-[11rem] font-light text-foreground tracking-tighter leading-[0.82] font-serif mb-16">
            Return to <br />
            <motion.span
              initial={{ textShadow: "0 0 0px rgba(0,0,0,0)" }}
              animate={{ textShadow: "0 0 25px rgba(150,103,81,0.15)" }}
              transition={{ duration: 3, repeat: Infinity, repeatType: "mirror" }}
              className="italic text-primary/80 font-light"
            >
              your senses.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1.5 }}
            className="text-xl text-foreground/70 max-w-xl mx-auto mb-20 font-light leading-relaxed tracking-wide italic"
          >
            A curated dialogue between the elements. Designed to wash away the weight of the digital world through guided thermal immersion.
          </motion.p>

          <motion.div
            className="flex flex-col items-center gap-8"
          >
            <Link href="#rituals" className="group">
              <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center group-hover:bg-foreground group-hover:border-foreground transition-all duration-500">
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-background transition-colors rotate-90" />
              </div>
            </Link>
          </motion.div>
        </motion.div>

        {/* Vibrant Floating Particles */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <motion.div
            animate={{
              x: [0, 40, 0],
              y: [0, 60, 0],
              opacity: [0.4, 0.6, 0.4]
            }}
            transition={{ duration: 15, repeat: Infinity }}
            className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px]"
          />
          <motion.div
            animate={{
              x: [0, -70, 0],
              y: [0, -30, 0],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 18, repeat: Infinity }}
            className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary/30 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              x: [0, 20, 0],
              y: [0, -50, 0],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 12, repeat: Infinity }}
            className="absolute top-1/2 left-1/4 w-[350px] h-[350px] bg-accent/30 rounded-full blur-[100px]"
          />
        </div>
      </section>

      {/* 2. The Pure Transition */}
      <section className="py-48 bg-secondary/5 relative">
        <Container className="max-w-3xl text-center space-y-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-10"
          >
            <div className="w-px h-20 bg-primary/20 mx-auto" />
            <p className="text-3xl md:text-5xl font-light leading-snug text-foreground font-serif tracking-tight">
              "Real luxury isn't addition.<br />It's the removal of everything unnecessary."
            </p>
            <div className="flex justify-center gap-4 text-[10px] font-bold text-primary/30 uppercase tracking-[0.5em]">
              <span>Essentialism</span>
              <span className="opacity-40">•</span>
              <span>Clarity</span>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* 3. The Thermal Grid - Boutique Hotel Style */}
      <section id="rituals" className="py-40 px-6 bg-accent/5 border-y border-border/30 relative">
        <Container className="max-w-7xl">
          <div className="flex justify-between items-end mb-32 border-b border-border/40 pb-20">
            <div className="max-w-2xl space-y-8">
              <span className="text-[10px] font-bold tracking-[0.5em] uppercase text-primary mb-4 block">The Sequence</span>
              <h2 className="text-6xl md:text-8xl font-light text-foreground tracking-tighter font-serif leading-none">Fire &<br />Contrast.</h2>
              <p className="text-foreground/70 font-light text-xl leading-relaxed max-w-md">
                A structured ritual of thermal shock designed to regulate the autonomic nervous system.
              </p>
            </div>
            <div className="hidden lg:block pb-5">
              <div className="p-8 bg-muted rounded-[2.5rem] border border-border/50">
                <Clock className="w-6 h-6 text-primary/40 mb-4" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Est. Duration: 90 Mins</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

            {/* Image Reveal 1 (Sauna) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="md:col-span-8 group relative h-[750px] rounded-[4rem] overflow-hidden bg-muted"
            >
              <img
                src="https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=2070&auto=format&fit=crop"
                className="absolute inset-0 w-full h-full object-cover saturate-[0.5] group-hover:saturate-[0.8] transition-all duration-1000 scale-105 group-hover:scale-100"
                alt="Sauna"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent" />
              <div className="absolute bottom-16 left-16 right-16 flex justify-between items-end">
                <div className="space-y-4">
                  <Flame className="w-8 h-8 text-primary shadow-2xl" />
                  <h3 className="text-5xl font-serif text-foreground">90°C Cedar</h3>
                  <p className="text-foreground/70 text-lg font-light max-w-sm">Deep dry heat to encourage vascular dilation.</p>
                </div>
                <div className="hidden sm:block">
                  <div className="w-16 h-16 rounded-full border border-foreground/10 flex items-center justify-center">
                    <span className="text-[10px] font-bold">01</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Vertical Stack Cards */}
            <div className="md:col-span-4 flex flex-col gap-10">
              <motion.div
                className="flex-1 group relative rounded-[4rem] overflow-hidden min-h-[350px] bg-secondary/10"
              >
                <img
                  src="https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?q=80&w=2070&auto=format&fit=crop"
                  className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-multiply transition-transform duration-1000 group-hover:scale-110"
                  alt="Ice"
                />
                <div className="absolute top-12 left-12">
                  <Snowflake className="w-6 h-6 text-primary" />
                </div>
                <div className="absolute bottom-12 left-12 text-foreground">
                  <h4 className="text-3xl font-serif mb-2">5°C Clarity</h4>
                  <p className="text-[10px] font-bold tracking-widest uppercase opacity-40">Rapid Cooling Immersion</p>
                </div>
              </motion.div>

              <motion.div
                className="flex-1 bg-accent border border-border/60 rounded-[4rem] p-12 flex flex-col justify-between hover:bg-white transition-all shadow-sm hover:shadow-2xl hover:shadow-primary/5 cursor-pointer group"
              >
                <Waves className="w-10 h-10 text-primary/40 group-hover:scale-110 transition-transform" />
                <div className="space-y-4 pt-12">
                  <h4 className="text-3xl font-serif text-foreground">Magnesium Pool</h4>
                  <p className="text-muted-foreground font-light text-sm leading-relaxed">Mineral immersion designed for unburdening the muscular skeletal system.</p>
                </div>
              </motion.div>
            </div>
          </div>
        </Container>
      </section>

      {/* 4. The Essence Lab - Architecture of Scent */}
      <section id="botanical" className="py-48 bg-background relative z-10">
        <Container className="max-w-7xl">
          {/* Section Header */}
          <div className="max-w-4xl mb-32 text-center mx-auto">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/5 text-primary text-[10px] font-bold tracking-[0.4em] uppercase border border-primary/10 mb-8">The Botanic Lab</span>
            <h2 className="text-5xl md:text-[9rem] font-serif text-foreground tracking-tighter leading-[0.88] mb-8 lowercase">
              Invisible<br />
              <span className="italic">alchemy.</span>
            </h2>
            <p className="text-2xl text-foreground/70 font-light leading-relaxed max-w-2xl mx-auto">
              We distill the <span className="italic">soul</span> of Thai botanicals—capturing scent, flavor, and essence in crystal-clear waters that reveal nothing, yet deliver everything.
            </p>
          </div>

          {/* Essence Cards - Magical Presentation */}
          <div className="grid md:grid-cols-3 gap-12 mb-32">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="group"
            >
              <div className="aspect-square rounded-[4rem] overflow-hidden mb-8 bg-accent/10 relative shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?q=80&w=800&auto=format&fit=crop"
                  className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-all duration-1000 group-hover:scale-110"
                  alt="Invisible Lemongrass"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8">
                  <FlaskConical className="w-10 h-10 text-primary mb-4" />
                  <h3 className="text-3xl font-serif text-foreground mb-2">Invisible Lemongrass</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Welcome Elixir</p>
                </div>
              </div>
              <p className="text-foreground/70 font-light leading-relaxed italic">
                Water that tastes like <span className="text-primary font-medium">green lemongrass stalks</span> without a trace of color or bitterness. The first sip feels impossible—pure flavor extracted from the plant's invisible aromatic soul.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="group"
            >
              <div className="aspect-square rounded-[4rem] overflow-hidden mb-8 bg-secondary/10 relative shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1544161515-4af6b1d462c2?q=80&w=800&auto=format&fit=crop"
                  className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-all duration-1000 group-hover:scale-110"
                  alt="Phuket Rain"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8">
                  <Flame className="w-10 h-10 text-primary mb-4" />
                  <h3 className="text-3xl font-serif text-foreground mb-2">Phuket Rain</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Sauna Ritual</p>
                </div>
              </div>
              <p className="text-foreground/70 font-light leading-relaxed italic">
                The scent of a <span className="text-primary font-medium">wet tropical garden</span> after a monsoon storm. Kaffir lime leaves, Thai basil, and wild ginger—poured over hot stones to fill the cedar sauna with jungle memories.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="group"
            >
              <div className="aspect-square rounded-[4rem] overflow-hidden mb-8 bg-muted/30 relative shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=800&auto=format&fit=crop"
                  className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-all duration-1000 group-hover:scale-110"
                  alt="Thai Basil Recovery"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8">
                  <Droplet className="w-10 h-10 text-primary mb-4" />
                  <h3 className="text-3xl font-serif text-foreground mb-2">Recovery Mist</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Post-Ice Ritual</p>
                </div>
              </div>
              <p className="text-foreground/70 font-light leading-relaxed italic">
                A chilled hydrosol of <span className="text-primary font-medium">holy basil and cucumber</span>, applied as a facial mist immediately after ice immersion. The cooling extends deep into your skin, calming both surface and nervous system.
              </p>
            </motion.div>
          </div>

          {/* The Process - Simplified & Magical */}
          <div className="border-t border-border/30 pt-32 mb-32">
            <div className="grid md:grid-cols-2 gap-20 items-center">
              <div className="space-y-12">
                <h3 className="text-5xl md:text-7xl font-serif text-foreground tracking-tight leading-tight">
                  How we make<br />the invisible<br /><span className="italic text-primary">visible.</span>
                </h3>
                <div className="space-y-8">
                  {[
                    { number: "01", title: "Selection", desc: "Hand-picked Thai botanicals harvested at peak aromatic potency—usually dawn, when oils are most concentrated." },
                    { number: "02", title: "Cold Distillation", desc: "Low-temperature vacuum extraction preserves the delicate 'top notes' that would be destroyed by traditional steam methods." },
                    { number: "03", title: "Pure Essence", desc: "The result: crystal-clear hydrosols and distillates that taste, smell, and feel like the living plant." }
                  ].map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className="flex gap-6"
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-primary/20 flex items-center justify-center">
                        <span className="text-lg font-serif text-primary">{step.number}</span>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xl font-serif text-foreground">{step.title}</h4>
                        <p className="text-sm text-foreground/60 font-light leading-relaxed">{step.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <motion.div
                style={{ y: useTransform(scrollYProgress, [0.4, 0.8], [50, -50]) }}
                className="aspect-[4/5] rounded-[5rem] overflow-hidden shadow-2xl border border-white relative"
              >
                <img
                  src="https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=2080&auto=format&fit=crop"
                  className="w-full h-full object-cover saturate-[0.2] opacity-80"
                  alt="Lab"
                />
                <div className="absolute inset-0 bg-primary/5 mix-blend-overlay" />

                <div className="absolute bottom-12 left-12 right-12 bg-white/80 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/60">
                  <p className="text-xs text-foreground/70 font-light leading-relaxed italic">
                    "We use pharmaceutical-grade rotary evaporators to distill botanicals at temperatures so low, the molecular structure remains completely untouched. The result is an aromatic profile identical to the fresh plant."
                  </p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Guest Experience Callout */}
          <div className="grid md:grid-cols-2 gap-12 p-16 rounded-[5rem] bg-gradient-to-br from-accent/10 to-secondary/10 border border-border/30">
            <div className="space-y-8">
              <h3 className="text-4xl md:text-5xl font-serif text-foreground tracking-tight">
                Experience the lab<br />for yourself.
              </h3>
              <p className="text-foreground/70 font-light leading-relaxed">
                Book a private 90-minute lab experience where our botanical alchemist guides you through creating your own personalized hydrosol—from selecting fresh herbs in our garden to distilling your custom essence.
              </p>
              <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-primary/40">
                <span>Private Session</span>
                <span>•</span>
                <span>90 Minutes</span>
                <span>•</span>
                <span>฿4,500</span>
              </div>
              <Button className="px-12 py-8 bg-foreground text-background rounded-full text-[10px] uppercase tracking-[0.4em] font-bold shadow-2xl hover:scale-[1.02] transition-all">
                Book Lab Experience
              </Button>
            </div>

            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-white space-y-3">
                <Leaf className="w-8 h-8 text-primary" />
                <h4 className="text-lg font-serif text-foreground">What You'll Create</h4>
                <p className="text-sm text-foreground/60 font-light leading-relaxed">
                  Choose from our botanical library of 30+ Thai herbs and create a personalized drinking water, facial mist, or aromatherapy blend. Take home 500ml of your distillate in a custom glass bottle.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-white space-y-3">
                <FlaskConical className="w-8 h-8 text-primary" />
                <h4 className="text-lg font-serif text-foreground">Guided by Experts</h4>
                <p className="text-sm text-foreground/60 font-light leading-relaxed">
                  Our lab specialist will explain the alchemy of low-temperature extraction while you witness your chosen botanicals transform into pure, invisible essence.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 5. The Treatment List - High End Editorial */}
      <section id="menu" className="py-40 bg-secondary/10">
        <Container className="max-w-5xl">
          <div className="flex flex-col items-center mb-40 text-center space-y-8">
            <span className="text-[10px] font-bold tracking-[0.6em] text-foreground/50 uppercase">Selection</span>
            <h2 className="text-6xl md:text-9xl font-light font-serif tracking-tighter lowercase text-foreground">The therapies</h2>
            <div className="w-1 h-32 bg-gradient-to-b from-primary/40 to-transparent" />
          </div>

          <div className="space-y-2">
            {[
              { title: "Yarey Signature", price: "3,500", note: "Restorative Flow • 90min", desc: "A seamless synthesis of Thai stretches and manual muscular unknotting." },
              { title: "Meso-Botanical Facial", price: "3,200", note: "Molecular Clarity • 60min", desc: "Using cold-distilled hydrosols for total cellular hydration." },
              { title: "Thermal Guided Journey", price: "1,800", note: "Circuit • 120min", desc: "A guided cycle through our Fire & Ice zones with personalized infusions." }
            ].map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ x: 30 }}
                transition={{ duration: 0.8, ease: "circOut" }}
                className="group border-b border-border/70 py-16 flex flex-col md:flex-row md:items-center justify-between cursor-pointer transition-colors hover:border-foreground"
              >
                <div className="space-y-4 max-w-md">
                  <div className="flex gap-4 items-center">
                    <h3 className="text-3xl md:text-5xl font-serif text-foreground/80 group-hover:text-foreground transition-all uppercase tracking-tight">{item.title}</h3>
                  </div>
                  <p className="text-sm text-foreground/60 font-light group-hover:text-foreground/80 transition-colors leading-relaxed">{item.desc}</p>
                </div>
                <div className="text-right mt-6 md:mt-0">
                  <div className="text-[10px] uppercase tracking-[0.4em] text-foreground/60 font-bold mb-2">{item.note}</div>
                  <span className="text-3xl font-serif text-primary group-hover:text-primary transition-colors">฿{item.price}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* Final Resonance */}
      <section className="h-screen flex items-center justify-center bg-background relative overflow-hidden text-center">
        <div className="max-w-3xl px-6 relative z-20 space-y-20">
          <motion.h2
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2 }}
            className="text-7xl md:text-[12rem] font-serif text-foreground tracking-tighter leading-none lowercase"
          >
            Find your<br />stillness.
          </motion.h2>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Link href="/booking">
              <Button size="lg" className="px-20 py-10 bg-foreground text-background rounded-full font-bold uppercase tracking-[0.4em] text-[10px] hover:scale-105 transition-all shadow-2xl overflow-hidden group relative">
                <span className="relative z-10">Request Sanctuary Space</span>
                <div className="absolute inset-0 bg-primary translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer - Boutique Edition */}
      <footer className="py-24 bg-muted border-t border-border/30">
        <Container className="max-w-7xl grid grid-cols-1 md:grid-cols-4 gap-20">
          <div className="space-y-10">
            <Link href="/" className="text-2xl font-serif tracking-[0.2em] flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-primary" />
              YAREY
            </Link>
            <p className="text-[10px] text-foreground/50 leading-relaxed font-bold uppercase tracking-[0.3em]">
              Designed for sensory clarity in Phuket, Thailand. Silence is our language.
            </p>
          </div>

          <div className="space-y-6">
            <h5 className="text-[10px] font-bold uppercase tracking-[0.5em] text-foreground/40">Location</h5>
            <p className="text-xs text-foreground/60 leading-loose font-light">
              Coastal Resort Wing • Lower Garden<br />
              Phuket, 83000<br />
              TH +66 76 123 456
            </p>
          </div>

          <div className="space-y-6">
            <h5 className="text-[10px] font-bold uppercase tracking-[0.5em] text-foreground/40">Legal & Social</h5>
            <div className="flex flex-col gap-3 text-xs text-foreground/60 font-light">
              <a href="#" className="hover:text-primary transition-colors italic underline underline-offset-8 decoration-border">Instagram</a>
              <a href="#" className="hover:text-primary transition-colors">Privacy Principles</a>
              <Link href="/login" className="hover:text-primary transition-colors">Access Sanctuary</Link>
            </div>
          </div>

          <div className="md:text-right flex flex-col justify-between items-end">
            <VibeMeter />
            <p className="text-[9px] text-muted-foreground/30 uppercase tracking-[0.6em] mt-10">© 2026 Yarey Wellness</p>
          </div>
        </Container>
      </footer>

    </div>
  )
}
