import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Inbox",
}

export default function ThreadsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <>{children}</>
}



