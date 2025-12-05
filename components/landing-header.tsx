"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"

export function LandingHeader() {
  const { scrollY } = useScroll()

  // Transform values for the morphing effect
  const width = useTransform(scrollY, [0, 100], ["100%", "90%"])
  const maxWidth = useTransform(scrollY, [0, 100], ["100%", "1000px"])
  const top = useTransform(scrollY, [0, 100], ["0px", "20px"])
  const borderRadius = useTransform(scrollY, [0, 100], ["0px", "24px"])
  const backgroundColor = useTransform(
    scrollY,
    [0, 100],
    ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.85)"]
  )
  const backdropBlur = useTransform(scrollY, [0, 100], ["blur(0px)", "blur(12px)"])
  const borderColor = useTransform(
    scrollY,
    [0, 100],
    ["rgba(0, 0, 0, 0)", "rgba(3, 79, 70, 0.1)"]
  )
  const boxShadow = useTransform(
    scrollY,
    [0, 100],
    ["0px 0px 0px rgba(0,0,0,0)", "0px 10px 40px -10px rgba(0,0,0,0.08)"]
  )

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  const navItems = [
    { label: "The Problem", id: "split-section" },
    { label: "Features", id: "features-section" },
    { label: "How it works", id: "how-section" },
    { label: "Proof", id: "proof-section" },
  ]

  return (
    <>
      <motion.header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          height: "80px",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: "32px",
          paddingRight: "32px",
          backgroundColor: "transparent",
        }}
      >
        {/* Inner container that morphs */}
        <motion.div
          style={{
            position: "absolute",
            top,
            left: "50%",
            x: "-50%",
            width,
            maxWidth,
            height: "100%",
            borderRadius,
            backgroundColor,
            backdropFilter: backdropBlur,
            WebkitBackdropFilter: backdropBlur,
            borderColor,
            boxShadow,
            borderWidth: 1,
            borderStyle: "solid",
            zIndex: -1,
          }}
        />

        {/* Logo Left - just icon */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
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
            gap: "32px",
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
                fontSize: "14px",
                fontWeight: 500,
                color: "#6b6b64",
                textDecoration: "none",
                transition: "color 0.2s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#1a1a1a")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#6b6b64")}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* CTA Right */}
        <Link href="/auth/signin" style={{ textDecoration: "none" }}>
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#034f46",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "15px",
              padding: "12px 24px",
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(3, 79, 70, 0.25)",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
            }}
          >
            Try Legaside
          </motion.button>
        </Link>
      </motion.header>

      {/* Hide nav on mobile */}
      <style jsx global>{`
        @media (max-width: 768px) {
          header nav {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}
