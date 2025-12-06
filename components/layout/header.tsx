"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Search, PanelLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
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
  }, [query, pathname, searchParams, router])

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

  // Hide search bar on chatbot page
  const isOnChatbotPage = pathname === '/chatbot'

  return (
    <header className="fixed right-0 top-0 z-30 border-b border-border bg-background left-0 md:left-0">
      <div className="flex h-16 items-center justify-between px-2">
        <div className="flex items-center gap-3 flex-1">
          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-border"
            aria-label="Open menu"
            onClick={onMenuClick}
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          
          {/* Logo - now always visible on desktop, in top-left */}
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/logo-icon.png"
              alt="Legaside"
              width={32}
              height={32}
              className="h-8 w-8 block dark:hidden"
            />
            <Image
              src="/logo-icon-white.png"
              alt="Legaside"
              width={32}
              height={32}
              className="h-8 w-8 hidden dark:block"
            />
          </Link>
          {!isOnChatbotPage && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search subject, sender, text"
                className="pl-10 focus-visible:outline-ring"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Search"
              />
            </div>
          )}
        </div>
        <div className="ml-4 shrink-0 flex items-center gap-2">
          <ThemeToggle />
          {authChecked ? (
            profileName ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Open user menu"
                    className="inline-flex h-9 items-center gap-2 rounded-[var(--radius)] border border-border bg-background px-3 text-sm hover:bg-muted"
                  >
                    <span className="text-foreground/80">{profileName}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[12rem]">
                  <DropdownMenuItem asChild>
                    <Link href="/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                    className="text-destructive focus:text-destructive"
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                href="/auth/signin"
                className="inline-flex h-9 items-center justify-center rounded-[var(--radius)] border border-border px-3 text-sm hover:bg-muted"
              >
                Sign in
              </Link>
            )
          ) : null}
        </div>
      </div>
    </header>
  )
}
