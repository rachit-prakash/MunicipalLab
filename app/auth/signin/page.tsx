"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LogIn, Sparkles } from "lucide-react"
import { signIn } from "next-auth/react"
import { Spinner } from "@/components/ui/spinner"

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
            router.replace("/gmail")
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
    const callbackUrl = searchParams.get("callbackUrl") || "/gmail"
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
      await fetch("/api/demo/enable", { method: "POST" })
      // Navigate straight to the inbox; API routes will read the demo cookie
      router.push("/gmail")
    } catch {
      setError("Unable to enable demo mode.")
    } finally {
      setEnablingDemo(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-sky-50 via-ink-50 to-indigo-50">
      {/* soft background accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-300/20 blur-3xl" />
      </div>

      <div className="relative mx-4 w-full max-w-md">
        {/* glowing ring wrapper */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-sky-400/40 via-blue-500/40 to-indigo-600/40 blur-xl" />
        <Card className="relative overflow-hidden border-ink-200/60 bg-white/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl text-ink-900">Welcome to Legaside</CardTitle>
            <CardDescription className="text-center">
              Sign in to connect your Gmail and get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGoogle}
              variant="secondary"
              className={cn(
                "relative w-full h-11 rounded-full text-base font-semibold text-white",
              )}
            >
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-700" />
              <span className="pointer-events-none absolute -inset-1 rounded-full bg-blue-500/20 blur-sm" />
              <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-blue-400/30" />
              <span className="relative inline-flex items-center gap-2">
                <LogIn className="h-5 w-5 text-white" />
                Continue with Google
              </span>
            </Button>
            <div className="text-center text-xs text-ink-500">or</div>
            <Button
              onClick={handleDemo}
              variant="ghost"
              disabled={enablingDemo}
              className="group relative w-full h-11 rounded-full text-base font-semibold text-ink-900 bg-transparent overflow-hidden"
            >
              {/* gradient border */}
              <span className="absolute inset-0 rounded-full bg-gradient-to-r from-sky-400 to-indigo-600 opacity-70" />
              {/* inner surface */}
              <span className="absolute inset-[1px] rounded-full bg-white/85 backdrop-blur-sm ring-1 ring-ink-200/40 transition-colors group-hover:bg-white" />
              <span className="relative inline-flex items-center justify-center gap-2">
                {enablingDemo ? (
                  <>
                    <Spinner className="size-5 text-ink-600" />
                    Starting demo…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 text-ink-700" />
                    Try demo (no Google required)
                  </>
                )}
              </span>
            </Button>

            {checking ? (
              <p className="text-center text-sm text-ink-500">Checking session…</p>
            ) : null}
            {friendlyError ? <p className="text-center text-sm text-danger">{friendlyError}</p> : null}
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
        <div className="min-h-screen flex items-center justify-center">
          <Spinner className="size-6 text-ink-600" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  )
}


