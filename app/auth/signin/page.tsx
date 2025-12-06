"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LogIn, Sparkles } from "lucide-react"
import { signIn } from "next-auth/react"
import { Spinner } from "@/components/ui/spinner"
import { EB_Garamond } from "next/font/google"
import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"

const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
})

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enablingDemo, setEnablingDemo] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" })
        const data = await res.json().catch(() => null)
        if (!cancelled) {
          if (data?.user) {
            router.replace("/dashboard")
            return
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [router])

  const handleGoogle = () => {
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
    signIn("google", { callbackUrl }).catch(() => {
      setError("Unable to start sign-in. Please try again.")
    })
  }

  const urlError = searchParams.get("error")
  const friendlyError =
    error ||
    (urlError
      ? "Google sign-in failed. Check OAuth client, redirect URI, and environment variables."
      : null)

  const handleDemo = async () => {
    try {
      setEnablingDemo(true)
      const res = await fetch("/api/demo/enable", { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 403) {
          setError("Cookie consent is required to enable demo mode. Please accept cookies and try again.")
        } else {
          setError("Unable to enable demo mode.")
        }
        return
      }
      // Navigate straight to the dashboard; API routes will read the demo cookie
      router.push("/dashboard")
    } catch {
      setError("Unable to enable demo mode.")
    } finally {
      setEnablingDemo(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-white via-[rgb(251,248,216)] to-[#fffef0] dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Decorative curved SVG paths */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] max-w-[1600px]" viewBox="0 0 1400 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 0 320 Q 200 180, 400 280 T 800 320 Q 1000 360, 1200 280"
            className="stroke-primary dark:stroke-primary"
            strokeWidth="1.5"
            fill="none"
            opacity="0.08"
          />
          <path
            d="M 200 520 Q 400 400, 600 500 T 1000 520 Q 1200 560, 1400 480"
            className="stroke-primary dark:stroke-primary"
            strokeWidth="1.5"
            fill="none"
            opacity="0.08"
          />
          <path
            d="M 100 400 Q 350 250, 600 420 Q 850 590, 1100 450 Q 1350 310, 1400 380"
            className="stroke-primary dark:stroke-primary"
            strokeWidth="2"
            fill="none"
            opacity="0.06"
          />
        </svg>
        {/* Floating dots */}
        <div className="absolute top-[25%] left-[25%] w-2 h-2 rounded-full bg-primary opacity-20 animate-pulse dark:opacity-30" />
        <div className="absolute top-[35%] right-[30%] w-2.5 h-2.5 rounded-full bg-primary opacity-15 animate-pulse dark:opacity-25" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-[40%] left-[15%] w-3 h-3 rounded-full bg-primary opacity-10 animate-pulse dark:opacity-20" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative mx-4 w-full max-w-md z-10">
        <Card className="relative overflow-hidden border-2 border-primary/15 dark:border-primary/30 bg-white dark:bg-slate-900 shadow-xl rounded-[20px] dark:shadow-primary/10">
          {/* Subtle gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none rounded-[20px]"
            style={{
              background: "radial-gradient(circle at 50% 0%, rgba(3, 79, 70, 0.03) 0%, transparent 70%)"
            }}
          />
          <CardHeader className="relative">
            <div className="flex justify-center mb-4">
              <Image
                src="/logo-icon.png"
                alt="Legaside Logo"
                width={64}
                height={64}
                className="rounded-xl block dark:hidden"
                priority
              />
              <Image
                src="/logo-icon-white.png"
                alt="Legaside Logo"
                width={64}
                height={64}
                className="rounded-xl hidden dark:block"
                priority
              />
            </div>
            <CardTitle className={cn("text-center text-3xl font-medium text-foreground", garamond.className)} style={{ letterSpacing: "-0.01em" }}>
              Welcome to Legaside
            </CardTitle>
            <CardDescription className="text-center text-base text-muted-foreground">
              Sign in to connect your Gmail and get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 relative">
            <Button
              onClick={handleGoogle}
              className="relative w-full h-12 rounded-full text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground border-none transition-all duration-300 hover:translate-y-[-3px] shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
            >
              <LogIn className="h-5 w-5 mr-2" />
              Continue with Google
            </Button>
            <div className="text-center text-sm font-medium text-muted-foreground">or</div>
            <Button
              onClick={handleDemo}
              variant="outline"
              disabled={enablingDemo}
              className="relative w-full h-12 rounded-full text-base font-semibold border-[1.5px] border-primary text-primary bg-transparent hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-300 hover:translate-y-[-2px]"
            >
              {enablingDemo ? (
                <>
                  <Spinner className="size-5 mr-2 text-primary" />
                  Starting demo…
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Try demo (no Google required)
                </>
              )}
            </Button>

            {checking ? (
              <p className="text-center text-sm text-muted-foreground">Checking session…</p>
            ) : null}
            {friendlyError ? <p className="text-center text-sm font-medium text-destructive">{friendlyError}</p> : null}

            <div className="pt-2 text-center text-xs text-muted-foreground">
              By continuing, you agree to Municipal Labs AI{" "}
              <a
                href="https://municipallabs.ai/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline transition-all text-primary hover:text-primary/80"
              >
                Terms of Service
              </a>
              {" "}and{" "}
              <a
                href="https://municipallabs.ai/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline transition-all text-primary hover:text-primary/80"
              >
                Privacy Policy
              </a>
              .
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-[rgb(251,248,216)] to-[#fffef0] dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <Spinner className="size-6 text-primary" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  )
}


