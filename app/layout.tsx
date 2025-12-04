import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import ChatbotButton from "@/components/chatbot/chatbot-button"
import ChatbotDrawer from "@/components/chatbot/chat-drawer"
import { ChatbotPuller } from "@/components/chatbot/chatbot-puller"
import CookieConsent from "@/components/ui/cookie-consent"
import { DemoBanner } from "@/components/ui/demo-banner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "Legaside",
    template: "Legaside • %s",
  },
  description: "Legislative inbox copilot",
  generator: "v0.app",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.className} antialiased`} data-gramm="false">
        {children}
        <DemoBanner />
        <CookieConsent />
        <ChatbotDrawer />
        <ChatbotButton />
        <ChatbotPuller />
      </body>
    </html>
  )
}
