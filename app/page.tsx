"use client"

import Link from "next/link"
import { EB_Garamond, Figtree } from "next/font/google"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"

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

export default function Home() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "15%"])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  return (
    <>
      <div className={figtree.className}>
        <main className="landing">
          {/* Hero Section */}
          <section ref={heroRef} className="hero-section">
            <motion.div style={{ y, opacity }} className="hero-inner">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="eyebrow"
              >
                For legislators who live in their inbox
              </motion.div>

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
                className="cta-group"
              >
                <Link href="/auth/signin" className="btn btn-primary">
                  Sign up with Google
                </Link>
                <Link href="/auth/signin?demo=1" className="btn btn-secondary">
                  Try demo mode
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="hero-note"
              >
                Built for the pace of governance
              </motion.div>
            </motion.div>

            {/* Decorative SVG curves */}
            <div className="hero-decoration">
              <svg className="curve-left" viewBox="0 0 600 400" fill="none">
                <motion.path
                  d="M 0 100 Q 150 50, 300 150 T 600 200"
                  stroke="#034F46"
                  strokeWidth="1.5"
                  fill="none"
                  opacity="0.15"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.15 }}
                  transition={{ duration: 2.5, ease: "easeInOut", delay: 0.9 }}
                />
              </svg>
              <svg className="curve-right" viewBox="0 0 600 400" fill="none">
                <motion.path
                  d="M 0 200 Q 200 50, 400 180 T 600 150"
                  stroke="#034F46"
                  strokeWidth="1.5"
                  fill="none"
                  opacity="0.15"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.15 }}
                  transition={{ duration: 2.5, ease: "easeInOut", delay: 1.1 }}
                />
              </svg>
            </div>

            {/* Hero visual */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="hero-visual"
            >
              <div className="mockup">
                <div className="mockup-header">
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                </div>
                <div className="mockup-content">
                  <div className="line wide" />
                  <div className="line" />
                  <div className="line medium" />
                  <div className="block" />
                </div>
              </div>
            </motion.div>
          </section>

          {/* Trust strip */}
          <section className="trust-section">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true, margin: "-80px" }}
            >
              <h3 className="trust-heading">Trusted by teams who serve real people</h3>
              <div className="trust-grid">
                {["District offices", "Policy groups", "Constituent services", "Community boards"].map((item, idx) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.08, duration: 0.5 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="trust-badge"
                  >
                    {item}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </section>

          {/* Problem/Solution split */}
          <section className="split-section">
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
                  Gmail wasn't built for <em>governance</em>.
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
                <div className="card-chaos">
                  <span className="badge badge-red">chaos</span>
                  <div className="lines">
                    <div className="line wide shimmer" />
                    <div className="line shimmer" />
                    <div className="line shimmer" />
                  </div>
                </div>
                <div className="card-calm">
                  <span className="badge badge-green">calm</span>
                  <div className="lines">
                    <div className="line wide" />
                    <div className="line short" />
                    <div className="line short" />
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Features */}
          <section className="features-section">
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
          <section className="how-section">
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
          <section className="proof-section">
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
                  <p className="quote-text">"{item.quote}"</p>
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
          background: radial-gradient(ellipse 140% 80% at 50% 0%, #ffffff 0%, #fffef0 50%, #fffef0 100%);
          overflow-x: hidden;
        }

        /* Hero Section */
        .hero-section {
          position: relative;
          text-align: center;
          padding: clamp(80px, 12vw, 160px) 24px clamp(60px, 10vw, 120px);
          max-width: 1400px;
          margin: 0 auto;
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
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
          overflow: hidden;
        }

        .curve-left {
          position: absolute;
          top: 10%;
          left: -10%;
          width: 50%;
          height: auto;
        }

        .curve-right {
          position: absolute;
          bottom: 20%;
          right: -10%;
          width: 50%;
          height: auto;
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
          background: repeating-linear-gradient(45deg, #f8f4e8, #f8f4e8 14px, #f1ebdc 14px, #f1ebdc 28px);
          border-radius: 16px;
          margin-top: 20px;
        }

        /* Trust Section */
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
          gap: 20px;
        }

        .card-chaos,
        .card-calm {
          padding: 24px;
          border-radius: 20px;
          background: #ffffff;
          border: 1px solid rgba(3, 79, 70, 0.1);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.06);
          position: relative;
        }

        .badge {
          position: absolute;
          top: 16px;
          right: 16px;
          padding: 7px 13px;
          border-radius: 999px;
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-weight: 700;
        }

        .badge-red {
          background: #d94a38;
          color: #fff;
        }

        .badge-green {
          background: #034f46;
          color: #fff;
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

          .curve-left,
          .curve-right {
            display: none;
          }
        }
      `}</style>
    </>
  )
}
