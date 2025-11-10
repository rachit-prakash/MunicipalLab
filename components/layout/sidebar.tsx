"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, LayoutGrid, Mail, Settings, BookOpen } from "lucide-react"

export function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
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
    { href: "/threads", label: "Threads", icon: Mail, description: "Browse and triage conversations" },
    { href: "/gmail", label: "Inbox", icon: Mail, description: "View your Gmail inbox" },
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, description: "KPIs and trends at a glance" },
  ]

  const adminItems = [
    { href: "/admin/topics", label: "Topics", icon: BookOpen, description: "Define and organize topics" },
    { href: "/admin/templates", label: "Templates", icon: Settings, description: "Manage response templates" },
  ]

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-border bg-background transition-all duration-300 overflow-y-auto overflow-x-hidden",
          isCollapsed ? "w-20" : "w-64",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo and toggle */}
          <div className="px-6 py-5 flex items-center justify-between flex-shrink-0">
            {!isCollapsed && <h1 className="text-lg font-semibold text-ink-900">Legaside</h1>}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 hover:bg-subtle rounded transition-colors"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-ink-600" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-ink-600" />
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
                      "flex items-center gap-3 rounded px-4 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive(item.href)
                        ? "bg-subtle text-ink-900 border border-border shadow-sm"
                        : "text-ink-600 hover:bg-subtle hover:text-ink-900",
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{item.label}</span>
                        {item.description && (
                          <span className="text-xs text-ink-500 truncate">{item.description}</span>
                        )}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Admin section */}
            <div className="mt-8">
              {!isCollapsed && <p className="px-4 py-2 text-xs font-semibold uppercase text-ink-400">Admin</p>}
              <div className="space-y-1">
                {adminItems.map((item) => {
                  const Icon = item.icon
                  return (
                  <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded px-4 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive(item.href)
                          ? "bg-subtle text-ink-900 border border-border shadow-sm"
                          : "text-ink-600 hover:bg-subtle hover:text-ink-900",
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!isCollapsed && (
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate">{item.label}</span>
                          {item.description && (
                            <span className="text-xs text-ink-500 truncate">{item.description}</span>
                          )}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          </nav>
        </div>
      </aside>

      <div className="fixed inset-0 pointer-events-none" style={{ marginLeft: isCollapsed ? "80px" : "256px" }} />
    </>
  )
}
