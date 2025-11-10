import type React from "react"
import type { Metadata, Viewport } from "next"
import { Public_Sans } from "next/font/google"
import "./globals.css"
import ChatbotButton from "@/components/chatbot/chatbot-button"
import ChatbotDrawer from "@/components/chatbot/chat-drawer"

const publicSans = Public_Sans({ subsets: ["latin"] })

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
    <html lang="en">
      <body className={`${publicSans.className} antialiased`}>
        {children}
        <ChatbotDrawer />
        <ChatbotButton />
      </body>
    </html>
  )
}
