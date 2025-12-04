"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export function DemoBanner() {
  const [active, setActive] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setActive(hasDemoCookie())
    const id = window.setInterval(() => {
      setActive(hasDemoCookie())
    }, 5000)
    return () => window.clearInterval(id)
  }, [])

  if (!active) {
    return null
  }

  const disableDemo = async () => {
    try {
      await fetch("/api/demo/disable", { method: "POST" })
      setMessage("Demo mode disabled. Refresh to sync live data.")
      setActive(false)
    } catch (error: any) {
      setMessage(error?.message ?? "Failed to disable demo mode")
    }
  }

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-amber-100 border-b border-amber-200 px-4 py-2 text-sm text-amber-900 flex items-center justify-between gap-3">
      <span>Demo mode is active. Data is synthetic until you connect Gmail.</span>
      <div className="flex items-center gap-2">
        {message ? <span className="text-xs text-amber-800">{message}</span> : null}
        <Button variant="ghost" size="sm" onClick={disableDemo} className="text-amber-900">
          Disable demo
        </Button>
      </div>
    </div>
  )
}

function hasDemoCookie() {
  return typeof document !== "undefined" && document.cookie.includes("demo=1")
}

