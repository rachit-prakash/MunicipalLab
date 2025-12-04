"use client"

import { useState, Suspense, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { useRouter } from "next/navigation"

export function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()

  // Automatically sync user's timezone
  useEffect(() => {
    const syncTimezone = async () => {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        // We store in localStorage to avoid spamming the API on every reload
        // if the timezone hasn't changed.
        // However, to ensure we capture changes (travel), checking on session start is good.
        // Since the API checks DB, we can also just fire and forget.
        // Optimizing: Check a session storage flag to do it only once per session
        if (sessionStorage.getItem('timezone_synced') === timezone) {
          return
        }

        const res = await fetch('/api/user/timezone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timezone }),
        })

        if (res.ok) {
          sessionStorage.setItem('timezone_synced', timezone)
          // If updated, we might want to refresh the page data if it's the first load?
          // But SSR data might already be stale if we just updated the DB.
          // If the response says { updated: true }, we should router.refresh()
          const data = await res.json()
          if (data.updated) {
            router.refresh()
          }
        }
      } catch (e) {
        console.error("Failed to sync timezone", e)
      }
    }

    syncTimezone()
  }, [router])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar 
        mobileOpen={mobileOpen} 
        onMobileOpenChange={setMobileOpen} 
      />
      <div className="flex-1 flex flex-col ml-0 md:ml-[var(--app-sidebar-width,256px)]">
        <Suspense fallback={<div className="h-16 border-b border-border bg-background" />}>
          <Header onMenuClick={() => setMobileOpen(true)} />
        </Suspense>
        <main className="mt-16 flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
