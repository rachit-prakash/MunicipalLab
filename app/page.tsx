"use client"

import Link from "next/link"
import Image from "next/image"
import { EB_Garamond, Figtree } from "next/font/google"
import { motion, useScroll, useTransform, AnimatePresence, useAnimationControls } from "framer-motion"
import { useRef, useState, useEffect, useCallback } from "react"
import { LandingHeader } from "@/components/landing-header"
import { Footer } from "@/components/footer"

const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
})
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" })

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
}

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 1, ease: "easeOut" } },
}

const stagger = { show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } }

const features = [
  {
    title: "Dashboard Overview",
    body: "Your inbox stats, priorities, and team activity at a glance.",
    image: "/Dashboard1.png",
  },
  {
    title: "District Pulse",
    body: "Track constituent sentiment and emerging district issues.",
    image: "/DistrictPulse1.png",
  },
  {
    title: "Smart Insights",
    body: "Data-driven insights about your district's top priorities.",
    image: "/DistrictPulse2.png",
  },
  {
    title: "AI Assistant",
    body: "Ask questions and get instant answers about your work.",
    image: "/Chatbot1.png",
  },
]

function FeaturesCarousel() {
  const controls = useAnimationControls()

  // Duplicate the features array to create seamless loop
  const duplicatedFeatures = [...features, ...features, ...features]

  useEffect(() => {
    // Start the animation with smoother settings
    controls.start({
      x: `-${100 * features.length}%`,
      transition: {
        duration: 60, // Slower = smoother
        ease: "linear",
        repeat: Infinity,
        repeatType: "loop",
      },
    })
  }, [controls])

  return (
    <div 
      className="carousel-container" 
      style={{ 
        overflow: 'hidden', 
        position: 'relative',
        pointerEvents: 'none', // Disable all interactions
      }}
    >
      <motion.div
        className="carousel-track"
        style={{ display: 'flex', flexWrap: 'nowrap', gap: '28px' }}
        animate={controls}
      >
        {duplicatedFeatures.map((feature, idx) => (
          <div key={idx} className="carousel-item" style={{ flexShrink: 0, width: '550px', minWidth: '550px' }}>
            <div className="carousel-card">
              <div className="carousel-image-wrapper">
                <Image
                  src={feature.image}
                  alt={feature.title}
                  width={800}
                  height={500}
                  style={{ objectFit: 'cover', pointerEvents: 'none' }}
                  priority={idx < 4}
                  draggable={false}
                />
              </div>
              <div className="carousel-caption">
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

const socialProof = [
  {
    quote: "It feels calmer. I can see what matters first.",
    name: "Chief of Staff",
    role: "State legislature",
  },
  {
    quote: "Follow-ups actually get done now. No more buried threads.",
    name: "Policy aide",
    role: "City council",
  },
  {
    quote: "I trust the inbox again. It's finally built for how we work.",
    name: "Legislator",
    role: "House district",
  },
]

const chaosEmails = [
  "RE: Newsletter - Best deals this week!",
  "FW: Team lunch moved to Thursday 🍕",
  "Your Amazon order has shipped",
  "Weekly digest from LinkedIn",
  "Webinar: Top 10 productivity hacks",
  "Sale Alert: 50% off everything!",
  "Reminder: Complete your profile",
  "Flash Sale ends in 2 hours!",
  "RE: RE: RE: FW: Quick question",
  "You have 47 new notifications",
  "Your subscription is expiring soon",
  "Don't miss out on these savings!",
  "New connection request on LinkedIn",
  "Your weekly summary is ready",
  "FW: FW: Funny cat video 😂",
]

const calmEmails = [
  "Urgent: Constituent needs help with zoning",
  "HELP: Housing crisis in District 5",
  "Follow-up: Budget meeting with Finance",
  "Priority: Town hall scheduling",
  "Action needed: Bill HB-2847 vote Friday",
  "Constituent: Water main break on Oak St",
  "Response needed: EPA inquiry",
  "Meeting: District 5 community board",
  "Flagged: Permit approval pending",
  "Important: School funding proposal",
]

function TypingEmail({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayText, setDisplayText] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    setDisplayText("")
    setIsTyping(false)
    
    const timeout = setTimeout(() => {
      setIsTyping(true)
      let i = 0
      const interval = setInterval(() => {
        if (i <= text.length) {
          setDisplayText(text.slice(0, i))
          i++
        } else {
          clearInterval(interval)
          setIsTyping(false)
        }
      }, 50) // Slower typing speed

      return () => clearInterval(interval)
    }, delay)

    return () => clearTimeout(timeout)
  }, [text, delay])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="email-line"
    >
      {displayText}
      {isTyping && <span className="cursor-blink">|</span>}
    </motion.div>
  )
}

function AnimatedEmailList({ emails, type }: { emails: string[]; type: "chaos" | "calm" }) {
  // Randomize starting point
  const getRandomStart = () => Math.floor(Math.random() * emails.length)
  const [visibleEmails, setVisibleEmails] = useState<{ text: string; id: number }[]>(() => {
    const start = getRandomStart()
    return [
      { text: emails[start], id: 0 },
      { text: emails[(start + 1) % emails.length], id: 1 },
      { text: emails[(start + 2) % emails.length], id: 2 },
    ]
  })
  const counterRef = useRef(3)
  const indexRef = useRef(2)

  useEffect(() => {
    const interval = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % emails.length
      const newEmail = { text: emails[indexRef.current], id: counterRef.current }
      counterRef.current += 1

      setVisibleEmails((prev) => [...prev, newEmail].slice(-3)) // Keep only last 3
    }, 4000) // Longer interval between new emails

    return () => clearInterval(interval)
  }, [emails])

  if (type === "chaos") {
    return (
      <div className="email-list chaos-list">
        <AnimatePresence mode="popLayout">
          {visibleEmails.map((email, index) => (
            <motion.div
              key={email.id}
              initial={{ opacity: 0, x: -30, rotate: -5, scale: 0.9 }}
              animate={{
                opacity: 1,
                x: 0,
                rotate: [0, -1, 1, -0.5, 0],
                scale: 1,
                y: [0, -2, 0, -1, 0],
              }}
              exit={{ opacity: 0, x: 30, rotate: 5, scale: 0.9 }}
              transition={{
                duration: 0.5,
                rotate: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                y: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
              }}
              className="email-item chaos"
              style={{ zIndex: visibleEmails.length - index }}
            >
              <div className="email-dot" />
              <TypingEmail text={email.text} delay={index * 100} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="email-list calm-list">
      <AnimatePresence mode="popLayout">
        {visibleEmails.map((email, index) => (
          <motion.div
            key={email.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="email-item calm"
          >
            <div className="email-priority">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 2L9.5 6.5L14 8L9.5 9.5L8 14L6.5 9.5L2 8L6.5 6.5L8 2Z"
                  fill="#034f46"
                  opacity="0.8"
                />
              </svg>
            </div>
            <TypingEmail text={email.text} delay={index * 100} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

const queries = [
  {
    text: "What are my most urgent emails?",
    response: "Sure, here is your priority list",
    results: [
      { text: "Water main break on Oak St", tag: "Urgent", type: "urgent" },
      { text: "Budget meeting with Finance", tag: "Today", type: "normal" },
    ]
  },
  {
    text: "Show me constituent requests",
    response: "Here are recent constituent requests",
    results: [
      { text: "Housing complaint - District 5", tag: "Urgent", type: "urgent" },
    ]
  },
  {
    text: "What needs follow-up this week?",
    response: "These items need your attention",
    results: [
      { text: "EPA inquiry response due Friday", tag: "This Week", type: "normal" },
      { text: "Town hall scheduling confirmation", tag: "This Week", type: "normal" },
      { text: "Zoning appeal - Oak Street", tag: "Tomorrow", type: "urgent" },
    ]
  },
  {
    text: "Summarize policy updates",
    response: "Latest policy updates",
    results: [
      { text: "Bill HB-2847 vote scheduled", tag: "Important", type: "normal" },
      { text: "School funding proposal review", tag: "Tomorrow", type: "urgent" },
    ]
  },
]

function HeroSearchAnimation() {
  const [text, setText] = useState("")
  const [phase, setPhase] = useState("idle") // idle, typing, deleting, sending, loading, result
  const [currentQueryIndex, setCurrentQueryIndex] = useState(0)
  const currentQuery = queries[currentQueryIndex]

  // Use refs to store timeout/interval IDs for cleanup
  const intervalsRef = useRef<NodeJS.Timeout[]>([])
  const timeoutsRef = useRef<NodeJS.Timeout[]>([])

  // Clear all intervals and timeouts
  const clearAllTimers = useCallback(() => {
    intervalsRef.current.forEach(clearInterval)
    timeoutsRef.current.forEach(clearTimeout)
    intervalsRef.current = []
    timeoutsRef.current = []
  }, [])

  const startDeleting = useCallback(() => {
    setPhase("deleting")
    let i = currentQuery.text.length
    const deletingInterval = setInterval(() => {
      if (i >= 0) {
        setText(currentQuery.text.slice(0, i))
        i--
      } else {
        clearInterval(deletingInterval)
        // Move to next query
        const timeout = setTimeout(() => {
          setCurrentQueryIndex((prev) => (prev + 1) % queries.length)
        }, 300)
        timeoutsRef.current.push(timeout)
      }
    }, 30)
    intervalsRef.current.push(deletingInterval)
  }, [currentQuery.text])

  const runCycle = useCallback(() => {
    // Typing phase
    setPhase("typing")
    let i = 0
    const typingInterval = setInterval(() => {
      if (i <= currentQuery.text.length) {
        setText(currentQuery.text.slice(0, i))
        i++
      } else {
        clearInterval(typingInterval)
        setPhase("sending")
        const timeout1 = setTimeout(() => {
          setPhase("loading")
          const timeout2 = setTimeout(() => {
            setPhase("result")
            // Show result for 3 seconds, then start deleting
            const timeout3 = setTimeout(() => {
              startDeleting()
            }, 3000)
            timeoutsRef.current.push(timeout3)
          }, 1500)
          timeoutsRef.current.push(timeout2)
        }, 600)
        timeoutsRef.current.push(timeout1)
      }
    }, 45)
    intervalsRef.current.push(typingInterval)
  }, [currentQuery.text, startDeleting])

  useEffect(() => {
    const startDelay = setTimeout(() => {
      runCycle()
    }, 1000)
    timeoutsRef.current.push(startDelay)

    return () => {
      clearAllTimers()
    }
  }, [currentQueryIndex, clearAllTimers])

  return (
    <div className="hero-search-wrapper">
      <motion.div 
        className={`hero-search-bar ${phase === 'result' ? 'has-result' : ''}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <div className="search-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <div className="search-text">
          {text}
          {(phase === 'typing' || phase === 'deleting') && <span className="cursor-blink">|</span>}
        </div>

        <div className="search-action">
           {phase === 'loading' ? (
             <div className="spinner" />
           ) : (
             <motion.div 
               className={`send-button ${text.length > 0 ? 'active' : ''}`}
               animate={phase === 'sending' ? { scale: 0.8, opacity: 0.8 } : { scale: 1, opacity: 1 }}
               transition={{ duration: 0.2 }}
             >
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 <line x1="22" y1="2" x2="11" y2="13" />
                 <polygon points="22 2 15 22 11 13 2 9 22 2" />
               </svg>
             </motion.div>
           )}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {phase === 'result' && (
          <motion.div
            key={currentQueryIndex}
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="hero-search-result"
          >
            <div className="result-content">
              <motion.div 
                 className="result-header"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ delay: 0.3 }}
              >
                <span className="ai-sparkle">✨</span>
                <span>{currentQuery.response}</span>
              </motion.div>
              <div className="result-items">
                {currentQuery.results.map((result, idx) => (
                  <motion.div 
                    key={idx}
                    className={`result-item ${result.type === 'urgent' ? 'urgent' : ''}`}
                    initial={{ opacity: 0, x: -10, y: 5 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    transition={{ delay: 0.5 + (idx * 0.2) }}
                  >
                    <div className="result-item-row">
                      <span className={`dot ${result.type === 'urgent' ? 'red' : 'orange'}`}></span>
                      <span className="item-text">{result.text}</span>
                    </div>
                    <span className={`tag ${result.type === 'urgent' ? 'red' : 'orange'}`}>{result.tag}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Home() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "15%"])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  return (
    <>
      <LandingHeader />
      <div className={figtree.className}>
        <main className="landing">
          {/* Hero Section */}
          <section ref={heroRef} className="hero-section">
            <motion.div style={{ y, opacity }} className="hero-inner">
              

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className={`hero-title ${garamond.className}`}
              >
                <span className="text-light">Your inbox, </span>
                <span className="text-dark">reimagined</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35 }}
                className="hero-desc"
              >
                Software that keeps your inbox calm, your priorities clear, and your constituents answered. No noise, just the messages
                that matter.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <HeroSearchAnimation />
              </motion.div>
            </motion.div>

            {/* Decorative SVG curves with animated text */}
            <div className="hero-decoration">
              {/* Floating email keywords */}
              {[
                { text: "constituent emails", left: "8%", top: "15%", duration: 20, delay: 1 },
                { text: "policy updates", left: "72%", top: "18%", duration: 25, delay: 1.5 },
                { text: "follow-ups", left: "5%", top: "75%", duration: 22, delay: 2 },
                { text: "district messages", left: "78%", top: "70%", duration: 28, delay: 1.8 },
                { text: "urgent requests", left: "3%", top: "45%", duration: 24, delay: 2.2 },
                { text: "stakeholder notes", left: "82%", top: "42%", duration: 26, delay: 1.3 },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  className="floating-text"
                  style={{ left: item.left, top: item.top }}
                  initial={{ opacity: 0, x: 0, y: 0 }}
                  animate={{
                    opacity: [0, 0.35, 0.35, 0],
                    x: [0, 30, -15, 0],
                    y: [0, -40, 25, 0],
                  }}
                  transition={{
                    duration: item.duration,
                    delay: item.delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  {item.text}
                </motion.div>
              ))}

              {/* Animated dots/particles */}
              {[
                { left: "25%", top: "25%", size: 8, delay: 1.5 },
                { left: "68%", top: "35%", size: 6, delay: 2 },
                { left: "15%", top: "60%", size: 10, delay: 1.8 },
                { left: "75%", top: "65%", size: 7, delay: 2.3 },
                { left: "88%", top: "30%", size: 9, delay: 1.6 },
              ].map((dot, idx) => (
                <motion.div
                  key={`dot-${idx}`}
                  className="floating-dot"
                  style={{ left: dot.left, top: dot.top, width: dot.size, height: dot.size }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 0.5, 0.5, 0],
                    scale: [0, 1, 1, 0],
                    x: [0, 20, -10, 0],
                    y: [0, -30, 20, 0],
                  }}
                  transition={{
                    duration: 18,
                    delay: dot.delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              ))}

              {/* Curved SVG paths */}
              <svg className="curve-spiral" viewBox="0 0 1400 800" fill="none" xmlns="http://www.w3.org/2000/svg">
                <motion.path
                  d="M 0 320 Q 200 180, 400 280 T 800 320 Q 1000 360, 1200 280"
                  stroke="#034F46"
                  strokeWidth="1.5"
                  fill="none"
                  opacity="0.08"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.08 }}
                  transition={{ duration: 2.5, ease: "easeInOut", delay: 0.9 }}
                />
                <motion.path
                  d="M 200 520 Q 400 400, 600 500 T 1000 520 Q 1200 560, 1400 480"
                  stroke="#034F46"
                  strokeWidth="1.5"
                  fill="none"
                  opacity="0.08"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.08 }}
                  transition={{ duration: 2.5, ease: "easeInOut", delay: 1.2 }}
                />
                <motion.path
                  d="M 100 400 Q 350 250, 600 420 Q 850 590, 1100 450 Q 1350 310, 1400 380"
                  stroke="#034F46"
                  strokeWidth="2"
                  fill="none"
                  opacity="0.06"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.06 }}
                  transition={{ duration: 3, ease: "easeInOut", delay: 1.5 }}
                />
              </svg>
            </div>

            
          </section>

          {/* Problem/Solution split */}
          <section id="split-section" className="split-section">
            <div className="split-grid">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, margin: "-100px" }}
                className="split-left"
              >
                <div className="label">The mess that we are fixing</div>
                <h2 className={garamond.className}>
                  Gmail wasn&apos;t built for <em>governance</em>.
                </h2>
                <p>
                  Important constituent emails get buried under newsletters. Policy updates blend into noise. Follow-ups slip through the
                  cracks. You need a calmer inbox that respects urgency and accountability.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, margin: "-100px" }}
                className="split-right"
              >
                <motion.div
                  className="card-chaos"
                  initial={{ opacity: 0, y: 20, rotate: -2 }}
                  whileInView={{ opacity: 1, y: 0, rotate: -0.5 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  viewport={{ once: true }}
                  whileHover={{
                    scale: 1.02,
                    rotate: 0,
                    boxShadow: "0 24px 64px rgba(217, 74, 56, 0.2)",
                  }}
                >
                  <motion.span
                    className="badge badge-red"
                    initial={{ scale: 0, rotate: -180 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                    viewport={{ once: true }}
                  >
                    chaos
                  </motion.span>
                  <AnimatedEmailList emails={chaosEmails} type="chaos" />
                </motion.div>
                <motion.div
                  className="card-calm"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  viewport={{ once: true }}
                  whileHover={{
                    scale: 1.03,
                    y: -4,
                    boxShadow: "0 32px 80px rgba(3, 79, 70, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.9)",
                  }}
                >
                  <motion.span
                    className="badge badge-green"
                    initial={{ scale: 0, rotate: 180 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                    viewport={{ once: true }}
                  >
                    calm
                  </motion.span>
                  <AnimatedEmailList emails={calmEmails} type="calm" />
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* Features */}
          <section id="features-section" className="features-section">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true, margin: "-100px" }}
              className="features-header"
            >
              <div className="label">What you get</div>
              <h2 className={garamond.className}>
                A calmer, <span className="text-accent">accountable</span> inbox.
              </h2>
              <p className="lead">Legislative teams get clarity, speed, and follow-through without wrestling filters all day.</p>
            </motion.div>
          </section>

          {/* Full-width Carousel Section */}
          <section className="carousel-section-full">
            <FeaturesCarousel />
          </section>

          {/* How it works */}
          <section id="how-section" className="how-section">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <div className="label">How it works</div>
              <h2 className={garamond.className}>Three steps to a <span className="text-accent">clear</span> inbox.</h2>
            </motion.div>

            <div className="steps-grid">
              {[
                { 
                  title: "Connect Gmail", 
                  body: "Securely connect your inbox. No re-training your team.",
                  time: "Takes 2 min",
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m2 7 10 7 10-7" />
                    </svg>
                  )
                },
                { 
                  title: "Let the software sort", 
                  body: "Important threads get organized, flagged, and ready to act.",
                  time: "Automatic",
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  )
                },
                { 
                  title: "Respond faster", 
                  body: "See what matters first, follow up on time, and keep constituents in the loop.",
                  time: "Save hours daily",
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  )
                },
              ].map((step, idx) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.15, duration: 0.6 }}
                  viewport={{ once: true, margin: "-80px" }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="step-card"
                >
                  <div className="step-icon">{step.icon}</div>
                  <div className="step-number">{idx + 1}</div>
                  <div className="step-content">
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                    <div className="step-time">{step.time}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

         

          {/* Final CTA */}
          <section className="final-cta-section">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true, margin: "-100px" }}
              className="cta-card"
            >
              <motion.div
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.8,
                }}
              >
                <h2 className={garamond.className}>
                  Ready for a <span className="highlight-calmer">calmer</span> inbox?
                </h2>
                <p>Give your team software that respects urgency and keeps every promise visible.</p>
                <div className="cta-group">
                  <Link href="/auth/signin" style={{ textDecoration: "none" }}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="wiggle-button"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        background: "linear-gradient(135deg,rgb(240, 141, 255) 0%,rgb(240, 129, 255) 100%)",
                        color: "#1a1a1a",
                        fontWeight: 600,
                        fontSize: "15px",
                        padding: "13px 28px",
                        borderRadius: "999px",
                        border: "2px solid #000000",
                        cursor: "pointer",
                        boxShadow: "0 4px 16px rgba(217, 70, 239, 0.3)",
                        whiteSpace: "nowrap",
                        position: "relative",
                      }}
                    >
                      {/* Email Icon */}
                      <svg 
                        width="18" 
                        height="18" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m2 7 10 7 10-7" />
                      </svg>
                      <span style={{ display: "inline-flex" }}>
                        {"Try Legaside".split("").map((char, i) => (
                          <span
                            key={i}
                            className="wiggle-letter"
                            style={{
                              display: "inline-block",
                              animationDelay: `${i * 0.05}s`,
                            }}
                          >
                            {char === " " ? "\u00A0" : char}
                          </span>
                        ))}
                      </span>
                    </motion.button>
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          </section>
        </main>

        {/* Footer */}
        <Footer />
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          background: #fffef0;
          color: #1a1a1a;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        :global(.dark) body {
          background: #0f172a;
          color: #f8fafc;
        }

        .landing {
          min-height: 100vh;
          background: radial-gradient(ellipse 140% 80% at 50% 0%, #ffffff 0%,rgb(251, 248, 216) 50%, #fffef0 100%);
          overflow-x: hidden;
        }

        :global(.dark) .landing {
          background: radial-gradient(ellipse 140% 80% at 50% 0%, #0f172a 0%, #1e293b 50%, #0f172a 100%);
        }

        /* Hero Section */
        .hero-section {
          position: relative;
          text-align: center;
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .hero-inner {
          max-width: 920px;
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }

        .eyebrow {
          font-size: clamp(12px, 1.2vw, 15px);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #8d8d83;
          font-weight: 500;
          margin-bottom: 20px;
        }

        :global(.dark) .eyebrow {
          color: #9ca3af;
        }

        .hero-title {
          font-size: clamp(52px, 8vw, 96px);
          line-height: 1.05;
          margin: 0 0 28px;
          font-weight: 400;
          letter-spacing: -0.02em;
        }

        .hero-title .text-light {
          color: rgba(26, 26, 26, 0.35);
        }

        :global(.dark) .hero-title .text-light {
          color: rgba(248, 250, 252, 0.35);
        }

        .hero-title .text-dark {
          color: #1a1a1a;
        }

        :global(.dark) .hero-title .text-dark {
          color: #f8fafc;
        }

        .hero-desc {
          font-size: clamp(18px, 2vw, 22px);
          line-height: 1.6;
          color: #1a1a1a;
          max-width: 760px;
          margin: 0 auto 36px;
          font-weight: 500;
        }

        :global(.dark) .hero-desc {
          color: #e2e8f0;
        }

        .cta-group {
          display: flex;
          gap: 14px;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 16px 32px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 17px;
          text-decoration: none;
          transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
          cursor: pointer;
          border: none;
        }

        .btn-primary {
          background: #034f46;
          color: #ffffff;
          box-shadow: 0 12px 32px rgba(3, 79, 70, 0.2);
        }

        .btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 48px rgba(3, 79, 70, 0.28);
        }

        .btn-secondary {
          border: 1.5px solid #034f46;
          color: #034f46;
          background: transparent;
        }

        .btn-secondary:hover {
          background: rgba(3, 79, 70, 0.05);
          transform: translateY(-2px);
        }

        .hero-note {
          color: #8d8d83;
          font-size: 16px;
        }

        .hero-decoration {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
          overflow: visible;
        }

        .curve-spiral {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 140%;
          height: 140%;
          max-width: 1600px;
        }

        .floating-text {
          position: absolute;
          font-size: clamp(14px, 1.5vw, 18px);
          color: #034f46;
          font-weight: 600;
          letter-spacing: 0.08em;
          white-space: nowrap;
          pointer-events: none;
          user-select: none;
          will-change: transform, opacity;
        }

        :global(.dark) .floating-text {
          color: #06a893;
        }

        .floating-dot {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, #034f46, rgba(3, 79, 70, 0.4));
          box-shadow: 0 0 12px rgba(3, 79, 70, 0.3);
          pointer-events: none;
          will-change: transform, opacity;
        }

        :global(.dark) .floating-dot {
          background: radial-gradient(circle, #06a893, rgba(6, 168, 147, 0.4));
          box-shadow: 0 0 12px rgba(6, 168, 147, 0.3);
        }

        .hero-visual {
          margin-top: clamp(64px, 8vw, 100px);
          display: flex;
          justify-content: center;
        }

        .mockup {
          width: min(100%, 1000px);
          background: #ffffff;
          border: 1px solid rgba(3, 79, 70, 0.08);
          border-radius: 24px;
          box-shadow: 0 24px 72px rgba(0, 0, 0, 0.08);
          padding: 32px;
        }

        .mockup-header {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
        }

        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f0eadc, #d4cfc0);
        }

        .mockup-content .line {
          height: 12px;
          background: linear-gradient(90deg, #ece7da, #f7f3e6);
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .line.wide {
          width: 85%;
        }

        .line.medium {
          width: 60%;
        }

        .block {
          height: 180px;
          background: repeating-linear-gradient(45deg,rgb(248, 235, 196), #f8f4e8 14px, #f1ebdc 14px, #f1ebdc 28px);
          border-radius: 16px;image.png
        }

        /* Trust Section */s
        .trust-section {
          text-align: center;
          padding: clamp(60px, 8vw, 100px) 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .trust-heading {
          font-size: clamp(16px, 1.8vw, 20px);
          color: #6b6b64;
          margin-bottom: 28px;
          font-weight: 500;
        }

        .trust-grid {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .trust-badge {
          padding: 12px 20px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid rgba(3, 79, 70, 0.12);
          font-weight: 600;
          font-size: 15px;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.05);
          transition: all 0.25s ease;
        }

        .trust-badge:hover {
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.08);
        }

        /* Split Section */
        .split-section {
          padding: clamp(60px, 10vw, 140px) 24px;
          max-width: 1300px;
          margin: 0 auto;
        }

        .split-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr));
          gap: clamp(40px, 6vw, 80px);
          align-items: center;
        }

        .split-left .label {
          font-size: 13px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #8d8d83;
          margin-bottom: 16px;
          font-weight: 600;
        }

        :global(.dark) .split-left .label,
        :global(.dark) .label {
          color: #9ca3af;
        }

        .split-left h2 {
          font-size: clamp(36px, 5vw, 56px);
          line-height: 1.1;
          margin: 0 0 20px;
          font-weight: 500;
        }

        :global(.dark) .split-left h2,
        :global(.dark) h2 {
          color: #f8fafc;
        }

        .split-left h2 em {
          font-style: italic;
          color: #034f46;
        }

        :global(.dark) .split-left h2 em,
        :global(.dark) .text-accent {
          color: #06a893;
        }

        .split-left p {
          font-size: clamp(17px, 1.8vw, 20px);
          line-height: 1.65;
          color: #4a4a42;
        }

        :global(.dark) .split-left p,
        :global(.dark) p {
          color: #cbd5e1;
        }

        .split-right {
          display: grid;
          gap: 28px;
        }

        .card-chaos,
        .card-calm {
          padding: 32px;
          border-radius: 20px;
          background: #ffffff;
          position: relative;
          min-height: 240px;
          transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
          overflow: visible;
        }

        .card-chaos {
          background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 50%, #fff5f5 100%);
          border: 2px dashed rgba(217, 74, 56, 0.3);
          box-shadow: 0 8px 24px rgba(217, 74, 56, 0.15), 0 4px 8px rgba(0, 0, 0, 0.05),
            inset 0 0 100px rgba(217, 74, 56, 0.03);
          transform: rotate(-0.5deg);
          position: relative;
        }

        :global(.dark) .card-chaos {
          background: linear-gradient(135deg, #2d1a1a 0%, #3d2020 50%, #2d1a1a 100%);
          border: 2px dashed rgba(239, 68, 68, 0.4);
          box-shadow: 0 8px 24px rgba(239, 68, 68, 0.2), 0 4px 8px rgba(0, 0, 0, 0.3),
            inset 0 0 100px rgba(239, 68, 68, 0.05);
        }

        .card-chaos::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(217, 74, 56, 0.02) 10px,
              rgba(217, 74, 56, 0.02) 20px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 10px,
              rgba(217, 74, 56, 0.02) 10px,
              rgba(217, 74, 56, 0.02) 20px
            );
          border-radius: 20px;
          pointer-events: none;
        }

        :global(.dark) .card-chaos::before {
          background-image: repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(239, 68, 68, 0.05) 10px,
              rgba(239, 68, 68, 0.05) 20px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 10px,
              rgba(239, 68, 68, 0.05) 10px,
              rgba(239, 68, 68, 0.05) 20px
            );
        }

        .card-calm {
          background: linear-gradient(135deg, #ffffff 0%, #f0f9f8 100%);
          border: 2px solid rgba(3, 79, 70, 0.15);
          box-shadow: 0 20px 60px rgba(3, 79, 70, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9),
            inset 0 0 60px rgba(3, 79, 70, 0.03);
          position: relative;
        }

        :global(.dark) .card-calm {
          background: linear-gradient(135deg, #1e293b 0%, #1a3a35 100%);
          border: 2px solid rgba(6, 168, 147, 0.3);
          box-shadow: 0 20px 60px rgba(6, 168, 147, 0.15), inset 0 1px 0 rgba(6, 168, 147, 0.1),
            inset 0 0 60px rgba(6, 168, 147, 0.05);
        }

        .card-calm::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 0%, rgba(3, 79, 70, 0.03) 0%, transparent 70%);
          border-radius: 20px;
          pointer-events: none;
        }

        :global(.dark) .card-calm::before {
          background: radial-gradient(circle at 50% 0%, rgba(6, 168, 147, 0.1) 0%, transparent 70%);
        }

        .badge {
          position: absolute;
          top: 20px;
          right: 20px;
          padding: 8px 16px;
          border-radius: 999px;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 10;
        }

        .badge-red {
          background: #d94a38;
          color: #fff;
          animation: shake 3s ease-in-out infinite;
        }

        .badge-green {
          background: linear-gradient(135deg, #034f46 0%, #046157 100%);
          color: #fff;
          box-shadow: 0 6px 20px rgba(3, 79, 70, 0.3);
        }

        :global(.dark) .badge-green {
          background: linear-gradient(135deg, #06a893 0%, #059669 100%);
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0) rotate(0deg);
          }
          25% {
            transform: translateX(-2px) rotate(-2deg);
          }
          75% {
            transform: translateX(2px) rotate(2deg);
          }
        }

        .email-list {
          display: flex;
          flex-direction: column;
          min-height: 200px;
          position: relative;
          padding-top: 8px;
        }

        .chaos-list {
          gap: 8px;
        }

        .calm-list {
          gap: 14px;
        }

        .email-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .email-item.chaos {
          background: rgba(255, 255, 255, 0.95);
          border: 1.5px solid rgba(217, 74, 56, 0.35);
          border-left: 4px solid #d94a38;
          box-shadow: 0 4px 12px rgba(217, 74, 56, 0.12), 2px 4px 8px rgba(0, 0, 0, 0.06);
          transform: rotate(var(--rotation, 0deg));
        }

        :global(.dark) .email-item.chaos {
          background: rgba(45, 26, 26, 0.95);
          border: 1.5px solid rgba(239, 68, 68, 0.4);
          border-left: 4px solid #ef4444;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2), 2px 4px 8px rgba(0, 0, 0, 0.3);
        }

        .email-item.chaos:nth-child(1) {
          --rotation: -1deg;
        }

        .email-item.chaos:nth-child(2) {
          --rotation: 0.8deg;
        }

        .email-item.chaos:nth-child(3) {
          --rotation: -0.5deg;
        }

        .email-item.chaos:hover {
          transform: rotate(0deg) scale(1.02);
          z-index: 5;
        }

        .email-item.calm {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 249, 248, 0.98) 100%);
          border: 1px solid rgba(3, 79, 70, 0.18);
          border-left: 4px solid #034f46;
          box-shadow: 0 3px 12px rgba(3, 79, 70, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
        }

        :global(.dark) .email-item.calm {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(26, 58, 53, 0.98) 100%);
          border: 1px solid rgba(6, 168, 147, 0.3);
          border-left: 4px solid #06a893;
          box-shadow: 0 3px 12px rgba(6, 168, 147, 0.15), inset 0 1px 0 rgba(6, 168, 147, 0.1);
        }

        .email-item.calm:hover {
          transform: translateX(4px);
          box-shadow: 0 6px 20px rgba(3, 79, 70, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        :global(.dark) .email-item.calm:hover {
          box-shadow: 0 6px 20px rgba(6, 168, 147, 0.2), inset 0 1px 0 rgba(6, 168, 147, 0.15);
        }

        .email-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: currentColor;
          flex-shrink: 0;
          animation: chaotic-pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .email-item.chaos .email-dot {
          background: #d94a38;
          box-shadow: 0 0 8px rgba(217, 74, 56, 0.6);
        }

        .email-priority {
          flex-shrink: 0;
          animation: gentle-pulse 3s ease-in-out infinite;
        }

        @keyframes chaotic-pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          25% {
            opacity: 0.7;
            transform: scale(1.3);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
          75% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }

        @keyframes gentle-pulse {
          0%,
          100% {
            opacity: 0.8;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }

        .email-line {
          font-size: 15px;
          font-weight: 500;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }

        .email-item.chaos .email-line {
          color: #4a4a4a;
        }

        :global(.dark) .email-item.chaos .email-line {
          color: #cbd5e1;
        }

        .email-item.calm .email-line {
          color: #1a1a1a;
          font-weight: 600;
        }

        :global(.dark) .email-item.calm .email-line {
          color: #f8fafc;
        }

        .cursor-blink {
          display: inline-block;
          animation: blink 1s step-end infinite;
          color: #034f46;
          margin-left: 2px;
          font-weight: 700;
        }

        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }

        .lines {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .lines .line {
          height: 11px;
          background: linear-gradient(90deg, #ece7da, #f7f3e6);
          border-radius: 8px;
        }

        .lines .line.wide {
          width: 88%;
        }

        .lines .line.short {
          width: 52%;
        }

        .shimmer {
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }

        /* Features Section */
        .features-section {
          padding: clamp(40px, 5vw, 60px) 24px 0;
          max-width: 1400px;
          margin: 0 auto;
        }

        .features-header {
          text-align: center;
          max-width: 760px;
          margin: 0 auto;
        }

        .features-header .label {
          font-size: 13px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #8d8d83;
          margin-bottom: 12px;
          font-weight: 600;
        }

        .features-header h2 {
          font-size: clamp(32px, 4vw, 44px);
          line-height: 1.1;
          margin: 0 0 12px;
          font-weight: 500;
        }

        .features-header .text-accent {
          color: #034f46;
          font-style: italic;
        }

        .features-header .lead {
          font-size: clamp(16px, 1.6vw, 18px);
          line-height: 1.6;
          color: #4a4a42;
        }

        /* Full-width Carousel Section */
        .carousel-section-full {
          width: 100vw;
          position: relative;
          left: 50%;
          right: 50%;
          margin-left: -50vw;
          margin-right: -50vw;
          padding: clamp(30px, 4vw, 50px) 0 clamp(40px, 5vw, 60px);
          contain: content;
        }

        /* Carousel Styles */
        .carousel-container {
          position: relative;
          width: 100%;
          overflow: hidden;
          padding: 30px 0;
          user-select: none;
          min-height: 500px;
        }

        .carousel-track {
          display: flex;
          gap: 28px;
          will-change: transform;
          backface-visibility: hidden;
          -webkit-font-smoothing: antialiased;
          transform: translateZ(0);
          flex-wrap: nowrap;
        }

        .carousel-item {
          flex-shrink: 0;
          width: 550px;
          min-width: 550px;
        }

        .carousel-card {
          background: #ffffff;
          border: 3px solid #1a1a1a;
          border-radius: 16px;
          padding: 18px;
          transition: all 0.3s ease;
          height: 100%;
        }

        :global(.dark) .carousel-card {
          background: #1e293b;
          border-color: #475569;
        }

        .carousel-card:hover {
          transform: translateY(-2px);
          border-color: #034f46;
        }

        :global(.dark) .carousel-card:hover {
          border-color: #06a893;
        }

        .carousel-image-wrapper {
          width: 100%;
          height: 320px;
          background: #f7f3e6;
          border-radius: 10px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
          border: 2px solid #1a1a1a;
        }

        :global(.dark) .carousel-image-wrapper {
          background: #0f172a;
          border-color: #334155;
        }

        .carousel-image-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .carousel-caption {
          text-align: center;
        }

        .carousel-caption h3 {
          font-size: 19px;
          margin: 0 0 6px;
          font-weight: 600;
          color: #1a1a1a;
          letter-spacing: -0.01em;
        }

        :global(.dark) .carousel-caption h3 {
          color: #f8fafc;
        }

        .carousel-caption p {
          font-size: 13px;
          line-height: 1.4;
          color: #6b6b64;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        :global(.dark) .carousel-caption p {
          color: #94a3b8;
        }

        @media (max-width: 768px) {
          .carousel-item {
            width: 80vw;
            min-width: 300px;
          }

          .carousel-image-wrapper {
            height: 240px;
          }

          .carousel-caption h3 {
            font-size: 18px;
          }

          .carousel-caption p {
            font-size: 13px;
          }

          .carousel-card {
            padding: 16px;
          }

          .features-section {
            padding: 30px 20px 0;
          }

          .carousel-section-full {
            padding: 20px 0 30px;
          }
        }

        /* How Section */
        .how-section {
          padding: clamp(60px, 10vw, 140px) 24px;
          max-width: 1400px;
          margin: 0 auto;
          text-align: center;
        }

        .how-section .label {
          font-size: 13px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #8d8d83;
          margin-bottom: 16px;
          font-weight: 600;
        }

        .how-section h2 {
          font-size: clamp(36px, 5vw, 52px);
          line-height: 1.1;
          margin: 0 0 60px;
          font-weight: 500;
        }

        .how-section .text-accent {
          color: #034f46;
          font-style: italic;
        }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
          gap: 32px;
          text-align: left;
          max-width: 1200px;
          margin: 0 auto;
        }

        .step-card {
          position: relative;
          background: #ffffff;
          border: 2px solid #000000;
          border-radius: 20px;
          padding: 36px 28px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
          overflow: visible;
        }

        :global(.dark) .step-card {
          background: #1e293b;
          border: 2px solid rgba(6, 168, 147, 0.3);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .step-card:hover {
          box-shadow: 0 12px 40px rgba(240, 135, 255, 0.2), 0 6px 20px rgba(0, 0, 0, 0.12);
          border-color: rgb(240, 135, 255);
        }

        :global(.dark) .step-card:hover {
          box-shadow: 0 12px 40px rgba(6, 168, 147, 0.3), 0 6px 20px rgba(0, 0, 0, 0.3);
          border-color: #06a893;
        }

        .step-icon {
          position: absolute;
          top: -16px;
          left: 28px;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgb(240, 141, 255) 0%, rgb(240, 129, 255) 100%);
          border: 2px solid #000000;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1a1a1a;
          box-shadow: 0 4px 12px rgba(240, 135, 255, 0.3);
          transition: all 0.3s ease;
        }

        .step-card:hover .step-icon {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 6px 20px rgba(240, 135, 255, 0.5);
        }

        .step-number {
          position: absolute;
          top: -12px;
          right: 28px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #000000;
          color: #fff;
          display: grid;
          place-items: center;
          font-weight: 700;
          font-size: 16px;
          border: 2px solid #ffffff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .step-content {
          margin-top: 24px;
        }

        .step-content h3 {
          margin: 0 0 12px;
          font-size: 22px;
          font-weight: 700;
          color: #1a1a1a;
          letter-spacing: -0.02em;
        }

        :global(.dark) .step-content h3 {
          color: #f8fafc;
        }

        .step-content p {
          margin: 0 0 16px;
          color: #4a4a42;
          line-height: 1.65;
          font-size: 16px;
        }

        :global(.dark) .step-content p {
          color: #cbd5e1;
        }

        .step-time {
          display: inline-block;
          font-size: 13px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(240, 141, 255, 0.15) 0%, rgba(240, 129, 255, 0.15) 100%);
          color: rgb(180, 60, 200);
          border: 1px solid rgba(240, 135, 255, 0.3);
          letter-spacing: 0.02em;
        }

        :global(.dark) .step-time {
          background: linear-gradient(135deg, rgba(6, 168, 147, 0.2) 0%, rgba(6, 168, 147, 0.2) 100%);
          color: #06a893;
          border-color: rgba(6, 168, 147, 0.4);
        }

        @media (max-width: 768px) {
          .steps-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }

          .step-card {
            padding: 40px 24px 32px;
          }
        }

        /* Proof Section */
        .proof-section {
          padding: clamp(60px, 10vw, 140px) 24px;
          max-width: 1300px;
          margin: 0 auto;
          text-align: center;
        }

        .proof-section .label {
          font-size: 13px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #8d8d83;
          margin-bottom: 16px;
          font-weight: 600;
        }

        .proof-section h2 {
          font-size: clamp(36px, 5vw, 52px);
          line-height: 1.1;
          margin: 0 0 48px;
          font-weight: 500;
        }

        .quotes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
          gap: 20px;
        }

        .quote {
          background: #ffffff;
          border: 1px solid rgba(3, 79, 70, 0.1);
          border-radius: 18px;
          padding: 28px;
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.05);
          text-align: left;
          transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .quote-text {
          font-size: 18px;
          line-height: 1.65;
          margin: 0 0 20px;
          color: #1a1a1a;
        }

        .quote-author {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .author-name {
          font-weight: 600;
          font-size: 15px;
          color: #1a1a1a;
        }

        .author-role {
          font-size: 14px;
          color: #8d8d83;
        }

        /* Final CTA Section */
        .final-cta-section {
          padding: clamp(60px, 10vw, 120px) 24px clamp(80px, 12vw, 160px);
          max-width: 1000px;
          margin: 0 auto;
        }

        .cta-card {
          position: relative;
          background: transparent;
          border-radius: 24px;
          padding: clamp(40px, 6vw, 60px) clamp(28px, 5vw, 48px);
          text-align: center;
          overflow: visible;
        }

        .cta-card::before {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80%;
          height: 100%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.3) 40%, transparent 70%);
          filter: blur(60px);
          z-index: -1;
          pointer-events: none;
        }

        :global(.dark) .cta-card::before {
          background: radial-gradient(circle, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.5) 40%, transparent 70%);
        }

        .highlight-calmer {
          position: relative;
          color: #034f46;
          font-style: italic;
        }

        :global(.dark) .highlight-calmer {
          color: #06a893;
        }

        .cta-card h2 {
          font-size: clamp(32px, 4.5vw, 48px);
          margin: 0 0 16px;
          font-weight: 500;
        }

        .cta-card p {
          font-size: clamp(17px, 1.8vw, 20px);
          color: #4a4a42;
          margin-bottom: 32px;
          line-height: 1.6;
        }

        :global(.dark) .cta-card p {
          color: #cbd5e1;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .hero-section {
            padding: 60px 20px 80px;
          }

          .trust-section,
          .split-section,
          .features-section,
          .how-section,
          .proof-section {
            padding: 60px 20px;
          }

          .split-grid {
            gap: 48px;
          }

          .hero-decoration {
            display: none;
          }
        }

        /* Hero Search Animation */
        .hero-search-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
        }

        .hero-search-bar {
          background: #ffffff;
          border: 1px solid rgba(3, 79, 70, 0.15);
          border-radius: 16px;
          padding: 16px 20px;
          box-shadow: 0 12px 32px rgba(3, 79, 70, 0.08), 0 2px 6px rgba(3, 79, 70, 0.04);
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          height: 60px;
        }

        :global(.dark) .hero-search-bar {
          background: #1e293b;
          border-color: rgba(6, 168, 147, 0.25);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3), 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .search-icon {
          color: #8d8d83;
          display: flex;
          align-items: center;
        }

        :global(.dark) .search-icon {
          color: #94a3b8;
        }

        .search-text {
          font-size: 18px;
          color: #1a1a1a;
          font-weight: 500;
          flex: 1;
          text-align: left;
        }

        :global(.dark) .search-text {
          color: #f8fafc;
        }

        .hero-search-result {
          width: 100%;
          overflow: hidden;
        }

        .result-content {
          background: #ffffff;
          border: 1px solid rgba(3, 79, 70, 0.1);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 16px 48px rgba(3, 79, 70, 0.12), 0 4px 12px rgba(3, 79, 70, 0.06);
        }

        :global(.dark) .result-content {
          background: #1e293b;
          border-color: rgba(6, 168, 147, 0.2);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .result-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #6b6b64;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 16px;
        }

        :global(.dark) .result-header {
          color: #94a3b8;
        }

        .result-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .result-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-radius: 10px;
          background: #f8fcfb;
          border: 1px solid rgba(3, 79, 70, 0.06);
        }

        :global(.dark) .result-item {
          background: #0f172a;
          border-color: rgba(6, 168, 147, 0.15);
        }

        .result-item.urgent {
          background: #fff5f5;
          border-color: rgba(217, 74, 56, 0.1);
        }

        :global(.dark) .result-item.urgent {
          background: rgba(217, 74, 56, 0.1);
          border-color: rgba(217, 74, 56, 0.25);
        }

        .result-item-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .result-item .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .result-item .dot.red {
          background: #d94a38;
          box-shadow: 0 0 6px rgba(217, 74, 56, 0.4);
        }

        .result-item .dot.orange {
          background: #f59e0b;
        }

        .item-text {
          font-size: 15px;
          color: #1a1a1a;
          font-weight: 500;
        }

        :global(.dark) .item-text {
          color: #f8fafc;
        }

        .tag {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .tag.red {
          background: rgba(217, 74, 56, 0.1);
          color: #d94a38;
        }

        .tag.orange {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
        }
      `}</style>
    </>
  )
}
