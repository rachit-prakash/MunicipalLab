"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"
import { Figtree } from "next/font/google"

const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" })

export function LandingHeader() {
  const { scrollY } = useScroll()

  // Transform values for a refined morphing effect
  const width = useTransform(scrollY, [0, 200], ["100%", "85%"])
  const top = useTransform(scrollY, [0, 200], ["0px", "16px"])
  const borderRadius = useTransform(scrollY, [0, 200], ["0px", "24px"])
  // Warm, cream-tinted glass with subtle blur
  const backgroundColor = useTransform(
    scrollY,
    [0, 200],
    ["rgba(255, 254, 240, 0)", "rgba(255, 254, 240, 0.85)"]
  )
  const backdropBlur = useTransform(scrollY, [0, 200], ["blur(0px)", "blur(16px)"])
  const borderColor = useTransform(
    scrollY,
    [0, 200],
    ["rgba(3, 79, 70, 0)", "rgba(3, 79, 70, 0.12)"]
  )
  const boxShadow = useTransform(
    scrollY,
    [0, 200],
    ["0 0 0 0 rgba(0,0,0,0)", "0 8px 32px -8px rgba(3, 79, 70, 0.1)"]
  )

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const navItems = [
    { label: "The Problem", id: "split-section" },
    { label: "Features", id: "features-section" },
    { label: "How it works", id: "how-section" },
    { label: "Proof", id: "proof-section" },
  ]

  return (
    <>
      {/* Fixed outer container */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        {/* Morphing header container */}
        <motion.header
          className={figtree.className}
          style={{
            position: "relative",
            top,
            width,
            maxWidth: "100%",
            height: "80px",
            borderRadius,
            backgroundColor,
            backdropFilter: backdropBlur,
            WebkitBackdropFilter: backdropBlur,
            borderColor,
            boxShadow,
            borderWidth: 1,
            borderStyle: "solid",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: "32px",
            paddingRight: "32px",
            pointerEvents: "auto",
          }}
        >
          {/* Logo Left - just icon */}
          <Link
            href="/"
            onClick={scrollToTop}
            style={{
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            <Image
              src="/logo-icon.png"
              alt="Legaside Logo"
              width={36}
              height={36}
              style={{ height: "36px", width: "36px", objectFit: "contain" }}
            />
          </Link>

          {/* Navigation Center */}
          <nav
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "8px",
              listStyle: "none",
              margin: 0,
              padding: 0,
            }}
          >
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => scrollToSection(e, item.id)}
                style={{
                  fontSize: "15px",
                  fontWeight: 500,
                  color: "#6b6b64",
                  textDecoration: "none",
                  transition: "all 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
                  whiteSpace: "nowrap",
                  padding: "8px 16px",
                  borderRadius: "12px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#034f46"
                  e.currentTarget.style.backgroundColor = "rgba(3, 79, 70, 0.06)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#6b6b64"
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* CTA Right */}
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
        </motion.header>
      </div>

      {/* Hide nav on mobile */}
      <style jsx global>{`
        @media (max-width: 768px) {
          header nav {
            display: none !important;
          }
        }

        @keyframes wiggle {
          0%, 100% {
            transform: translateY(0);
          }
          25% {
            transform: translateY(-3px);
          }
          75% {
            transform: translateY(3px);
          }
        }

        .wiggle-letter {
          display: inline-block;
        }

        .wiggle-button:hover .wiggle-letter {
          animation: wiggle 0.5s ease-in-out infinite;
        }
      `}</style>
    </>
  )
}
