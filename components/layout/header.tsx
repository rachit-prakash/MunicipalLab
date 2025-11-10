"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { signOut } from "next-auth/react"

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialQuery = searchParams.get("q") ?? ""
  const [query, setQuery] = useState(initialQuery)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Keep input in sync when URL changes (e.g., navigating back/forward)
  useEffect(() => {
    const current = searchParams.get("q") ?? ""
    setQuery((prev) => (prev !== current ? current : prev))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Debounced URL update when on the threads page
  useEffect(() => {
    if (pathname !== "/threads") return
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      if (query) {
        params.set("q", query)
      } else {
        params.delete("q")
      }
      const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`
      router.replace(newUrl, { scroll: false })
    }, 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, pathname])

  // Fetch auth session to determine profile name
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" })
        const data = await res.json().catch(() => null)
        if (!cancelled) {
          const name: string | undefined = data?.user?.name
          setProfileName(name ?? null)
        }
      } catch {
        if (!cancelled) {
          setProfileName(null)
        }
      } finally {
        if (!cancelled) {
          setAuthChecked(true)
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      if (query) {
        params.set("q", query)
      } else {
        params.delete("q")
      }
      const url = `/threads${params.toString() ? `?${params.toString()}` : ""}`
      if (pathname === "/threads") {
        router.replace(url, { scroll: false })
      } else {
        router.push(url)
      }
    }
  }

  return (
    <header className="fixed right-0 top-0 z-30 border-b border-border bg-background" style={{ left: "var(--app-sidebar-width, 256px)" }}>
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex-1">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search subject, sender, text"
              className="pl-10 focus-visible:outline-ink-300"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Search"
            />
          </div>
        </div>
        <div className="ml-4 shrink-0">
          {authChecked ? (
            profileName ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-ink-900">{`Welcome ${profileName}!`}</span>
                <button
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                  className="relative inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-500 via-red-600 to-red-700" />
                  <span className="pointer-events-none absolute -inset-1 rounded-full bg-red-500/20 blur-sm" />
                  <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-red-400/30" />
                  <span className="relative">Sign out</span>
                </button>
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="relative inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-700" />
                <span className="pointer-events-none absolute -inset-1 rounded-full bg-blue-500/20 blur-sm" />
                <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-blue-400/30" />
                <span className="relative">Sign in</span>
              </Link>
            )
          ) : null}
        </div>
      </div>
    </header>
  )
}
