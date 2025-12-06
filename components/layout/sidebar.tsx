"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutGrid, Mail, Settings, MessageCircle } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export function Sidebar({
  mobileOpen,
  onMobileOpenChange,
}: {
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}) {
  const pathname = usePathname()
  const [isHovered, setIsHovered] = useState(false)

  // Update the CSS variable for the main content margin
  useEffect(() => {
    try {
      const width = isHovered ? "140px" : "48px"
      document.documentElement.style.setProperty("--app-sidebar-width", width)
    } catch {
      // ignore
    }
  }, [isHovered])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
    { href: "/threads", label: "Inbox", icon: Mail },
    { href: "/chatbot", label: "Chatbot", icon: MessageCircle },
    { href: "/settings", label: "Settings", icon: Settings },
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
                        <span className="truncate">{item.label}</span>
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
          "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r border-border bg-background overflow-hidden hidden md:block transition-[width] duration-300 ease-in-out",
          isHovered ? "w-[140px]" : "w-12",
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          {/* Navigation */}
          <nav className="flex-1 px-2 py-3">
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-[var(--radius)] font-medium transition-all duration-200 text-sm",
                      isHovered ? "gap-2 px-2 py-1.5" : "px-1.5 py-1.5",
                      isActive(item.href)
                        ? "bg-accent text-primary shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    title={!isHovered ? item.label : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span 
                      className={cn(
                        "transition-all duration-300 ease-in-out whitespace-nowrap",
                        isHovered ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
                      )}
                    >
                      {item.label}
                    </span>
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
