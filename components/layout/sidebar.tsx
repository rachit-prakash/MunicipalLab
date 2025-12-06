"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, LayoutGrid, Mail, Settings, MessageCircle } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export function Sidebar({
  mobileOpen,
  onMobileOpenChange,
}: {
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false
    }
    try {
      return window.localStorage.getItem("sidebar_collapsed") === "true"
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem("sidebar_collapsed", String(isCollapsed))
    } catch {
      // ignore persistence errors
    }
    try {
      const width = isCollapsed ? "80px" : "256px"
      document.documentElement.style.setProperty("--app-sidebar-width", width)
    } catch {
      // ignore
    }
  }, [isCollapsed])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, description: "KPIs and trends at a glance" },
    { href: "/threads", label: "Inbox", icon: Mail, description: "Browse conversations" },
    { href: "/chatbot", label: "Chatbot", icon: MessageCircle, description: "Ask about your data" },
    { href: "/settings", label: "Settings", icon: Settings, description: "Timezone & GDPR tools" },
  ]


  return (
    <>
      {/* Mobile off-canvas */}
      <div className="md:hidden">
        <Sheet open={!!mobileOpen} onOpenChange={onMobileOpenChange}>
          <SheetContent side="left" className="p-0 w-72 [&>button]:hidden">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="flex h-full flex-col">
              <div className="px-6 py-5 flex items-center justify-between flex-shrink-0">
                <Link href="/dashboard" className="flex items-center gap-2">
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
              </div>
              <nav className="flex-1 overflow-y-auto px-3 py-6">
                <div className="space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-[var(--radius)] px-4 py-2.5 text-sm font-medium transition-all duration-200",
                          isActive(item.href)
                            ? "bg-accent text-primary shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                        onClick={() => onMobileOpenChange?.(false)}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate">{item.label}</span>
                          {item.description && (
                            <span className={cn("text-xs truncate", isActive(item.href) ? "text-primary/70" : "text-muted-foreground")}>{item.description}</span>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
                
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-border bg-background overflow-y-auto overflow-x-hidden hidden md:block",
          isCollapsed ? "w-20" : "w-64",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo and toggle */}
          <div className="px-6 py-5 flex items-center justify-between flex-shrink-0">
            {!isCollapsed && (
              <Link href="/dashboard" className="flex items-center gap-2">
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
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 hover:bg-muted rounded-[var(--radius)] transition-colors ml-auto"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-6">
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-[var(--radius)] px-4 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive(item.href)
                        ? "bg-accent text-primary shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{item.label}</span>
                        {item.description && (
                          <span className={cn("text-xs truncate", isActive(item.href) ? "text-primary/70" : "text-muted-foreground")}>{item.description}</span>
                        )}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>

            
          </nav>
        </div>
      </aside>
    </>
  )
}
