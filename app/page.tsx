"use client"

import Link from "next/link"
import { EB_Garamond, Figtree } from "next/font/google"
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion"
import { useRef, useState, useEffect } from "react"
import { LandingHeader } from "@/components/landing-header"

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
    title: "Priority focus",
    body: "Constituent and stakeholder emails float to the top so you never miss the urgent ones.",
  },
  {
    title: "Order in the inbox",
    body: "Labels, threads, and follow-ups stay tidy without you wrestling filters all day.",
  },
  {
    title: "One home for everything",
    body: "Keep district updates, task notes, and replies together so the team moves in sync.",
  },
  {
    title: "Track every promise",
    body: "Set simple reminders on threads so commitments don't slip through the cracks.",
  },
]

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

  useEffect(() => {
    const startDelay = setTimeout(() => {
      runCycle()
    }, 1000)

    return () => clearTimeout(startDelay)
  }, [currentQueryIndex])

  const runCycle = () => {
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
        setTimeout(() => {
          setPhase("loading")
          setTimeout(() => {
            setPhase("result")
            // Show result for 3 seconds, then start deleting
            setTimeout(() => {
              startDeleting()
            }, 3000)
          }, 1500)
        }, 600)
      }
    }, 45)
  }

  const startDeleting = () => {
    setPhase("deleting")
    let i = currentQuery.text.length
    const deletingInterval = setInterval(() => {
      if (i >= 0) {
        setText(currentQuery.text.slice(0, i))
        i--
      } else {
        clearInterval(deletingInterval)
        // Move to next query
        setTimeout(() => {
          setCurrentQueryIndex((prev) => (prev + 1) % queries.length)
        }, 300)
      }
    }, 30)
  }

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
                <div className="label">The problem</div>
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

            <div className="features-grid">
              {features.map((item, idx) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.6 }}
                  viewport={{ once: true, margin: "-80px" }}
                  whileHover={{ y: -4, boxShadow: "0 20px 50px rgba(0,0,0,0.08)" }}
                  className="feature-card"
                >
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <div className="feature-visual" />
                </motion.div>
              ))}
            </div>
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
              <h2 className={garamond.className}>Three steps to a clear inbox.</h2>
            </motion.div>

            <ol className="steps-list">
              {[
                { title: "Connect Gmail", body: "Securely connect your inbox. No re-training your team." },
                { title: "Let the software sort", body: "Important threads get organized, flagged, and ready to act." },
                { title: "Respond faster", body: "See what matters first, follow up on time, and keep constituents in the loop." },
              ].map((step, idx) => (
                <motion.li
                  key={step.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.15, duration: 0.6 }}
                  viewport={{ once: true, margin: "-80px" }}
                  className="step-item"
                >
                  <div className="step-number">{idx + 1}</div>
                  <div className="step-content">
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </section>

          {/* Social proof */}
          <section id="proof-section" className="proof-section">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <div className="label">Proof</div>
              <h2 className={garamond.className}>Teams already feel the calm.</h2>
            </motion.div>

            <div className="quotes-grid">
              {socialProof.map((item, idx) => (
                <motion.blockquote
                  key={item.quote}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.6 }}
                  viewport={{ once: true, margin: "-80px" }}
                  whileHover={{ y: -4 }}
                  className="quote"
                >
                  <p className="quote-text">&ldquo;{item.quote}&rdquo;</p>
                  <div className="quote-author">
                    <div className="author-name">{item.name}</div>
                    <div className="author-role">{item.role}</div>
                  </div>
                </motion.blockquote>
              ))}
            </div>
          </section>

          {/* Final CTA */}
          <section className="final-cta-section">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
              className="cta-card"
            >
              <h2 className={garamond.className}>Ready for a calmer inbox?</h2>
              <p>Give your team software that respects urgency and keeps every promise visible.</p>
              <div className="cta-group">
                <Link href="/auth/signin" className="btn btn-primary">
                  Sign up with Google
                </Link>
                <Link href="/auth/signin?demo=1" className="btn btn-secondary">
                  Try demo mode
                </Link>
              </div>
            </motion.div>
          </section>
        </main>
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

        .landing {
          min-height: 100vh;
          background: radial-gradient(ellipse 140% 80% at 50% 0%, #ffffff 0%,rgb(251, 248, 216) 50%, #fffef0 100%);
          overflow-x: hidden;
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

        .hero-title .text-dark {
          color: #1a1a1a;
        }

        .hero-desc {
          font-size: clamp(18px, 2vw, 22px);
          line-height: 1.6;
          color: #1a1a1a;
          max-width: 760px;
          margin: 0 auto 36px;
          font-weight: 500;
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

        .floating-dot {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, #034f46, rgba(3, 79, 70, 0.4));
          box-shadow: 0 0 12px rgba(3, 79, 70, 0.3);
          pointer-events: none;
          will-change: transform, opacity;
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
          border-radius: 16px;
          margin-top: 20px;
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

        .split-left h2 {
          font-size: clamp(36px, 5vw, 56px);
          line-height: 1.1;
          margin: 0 0 20px;
          font-weight: 500;
        }

        .split-left h2 em {
          font-style: italic;
          color: #034f46;
        }

        .split-left p {
          font-size: clamp(17px, 1.8vw, 20px);
          line-height: 1.65;
          color: #4a4a42;
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

        .card-calm {
          background: linear-gradient(135deg, #ffffff 0%, #f0f9f8 100%);
          border: 2px solid rgba(3, 79, 70, 0.15);
          box-shadow: 0 20px 60px rgba(3, 79, 70, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9),
            inset 0 0 60px rgba(3, 79, 70, 0.03);
          position: relative;
        }

        .card-calm::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 0%, rgba(3, 79, 70, 0.03) 0%, transparent 70%);
          border-radius: 20px;
          pointer-events: none;
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

        .email-item.calm:hover {
          transform: translateX(4px);
          box-shadow: 0 6px 20px rgba(3, 79, 70, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9);
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

        .email-item.calm .email-line {
          color: #1a1a1a;
          font-weight: 600;
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
          padding: clamp(60px, 10vw, 140px) 24px;
          max-width: 1300px;
          margin: 0 auto;
        }

        .features-header {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 56px;
        }

        .features-header .label {
          font-size: 13px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #8d8d83;
          margin-bottom: 16px;
          font-weight: 600;
        }

        .features-header h2 {
          font-size: clamp(36px, 5vw, 52px);
          line-height: 1.1;
          margin: 0 0 18px;
          font-weight: 500;
        }

        .features-header .text-accent {
          color: #034f46;
          font-style: italic;
        }

        .features-header .lead {
          font-size: clamp(17px, 1.8vw, 20px);
          line-height: 1.65;
          color: #4a4a42;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
          gap: 20px;
        }

        .feature-card {
          background: #ffffff;
          border: 1px solid rgba(3, 79, 70, 0.1);
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 16px 44px rgba(0, 0, 0, 0.06);
          transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .feature-card h3 {
          font-size: 22px;
          margin: 0 0 12px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .feature-card p {
          font-size: 16px;
          line-height: 1.6;
          color: #6b6b64;
          margin: 0 0 20px;
        }

        .feature-visual {
          height: 100px;
          border-radius: 14px;
          background: repeating-linear-gradient(135deg, #f7f3e6, #f7f3e6 12px, #f0eadc 12px, #f0eadc 24px);
        }

        /* How Section */
        .how-section {
          padding: clamp(60px, 10vw, 140px) 24px;
          max-width: 1000px;
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
          margin: 0 0 48px;
          font-weight: 500;
        }

        .steps-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 16px;
          text-align: left;
        }

        .step-item {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 20px;
          align-items: flex-start;
          background: #ffffff;
          border: 1px solid rgba(3, 79, 70, 0.1);
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.05);
        }

        .step-number {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #034f46;
          color: #fff;
          display: grid;
          place-items: center;
          font-weight: 700;
          font-size: 18px;
          flex-shrink: 0;
        }

        .step-content h3 {
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 600;
        }

        .step-content p {
          margin: 0;
          color: #6b6b64;
          line-height: 1.6;
          font-size: 16px;
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
          background: linear-gradient(135deg, rgba(3, 79, 70, 0.08) 0%, rgba(3, 79, 70, 0.02) 100%);
          border: 1px solid rgba(3, 79, 70, 0.14);
          border-radius: 24px;
          padding: clamp(40px, 6vw, 60px) clamp(28px, 5vw, 48px);
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.06);
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

        .search-icon {
          color: #8d8d83;
          display: flex;
          align-items: center;
        }

        .search-text {
          font-size: 18px;
          color: #1a1a1a;
          font-weight: 500;
          flex: 1;
          text-align: left;
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

        .result-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #6b6b64;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 16px;
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

        .result-item.urgent {
          background: #fff5f5;
          border-color: rgba(217, 74, 56, 0.1);
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
