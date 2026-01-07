import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Topics",
}

export default function AdminTopicsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <>{children}</>
}



