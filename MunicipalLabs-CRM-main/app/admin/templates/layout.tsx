import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Templates",
}

export default function AdminTemplatesLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <>{children}</>
}



