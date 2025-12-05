import type React from "react"
import type { Metadata } from "next"
import { DashboardLayoutClient } from "@/app/dashboard/dashboard-layout-client"

export const metadata: Metadata = {
  title: "Chatbot",
}

export default function ChatbotLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <DashboardLayoutClient>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {children}
      </div>
    </DashboardLayoutClient>
  )
}


