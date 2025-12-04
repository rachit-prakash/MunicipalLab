"use client"

import React from "react"

type ConsentState = "accepted" | "declined" | null

function setConsentCookie(value: Exclude<ConsentState, null>) {
	// 1 year
	const maxAge = 60 * 60 * 24 * 365
	const parts = [
		`cookie-consent=${value}`,
		"Path=/",
		`Max-Age=${maxAge}`,
		"SameSite=Lax",
	]
	// add Secure on https
	if (typeof window !== "undefined" && window.location.protocol === "https:") {
		parts.push("Secure")
	}
	document.cookie = parts.join("; ")
}

function getExistingConsent(): ConsentState {
	if (typeof window === "undefined") return null
	try {
		const ls = window.localStorage.getItem("cookie-consent") as ConsentState
		if (ls === "accepted" || ls === "declined") return ls
	} catch {}
	try {
		const match = document.cookie
			.split(";")
			.map((c) => c.trim())
			.find((c) => c.startsWith("cookie-consent="))
		if (!match) return null
		const val = match.split("=")[1]
		if (val === "accepted" || val === "declined") return val
	} catch {}
	return null
}

export default function CookieConsent(): React.JSX.Element | null {
	const [consent, setConsent] = React.useState<ConsentState>(null)
	const [hasSession, setHasSession] = React.useState<boolean | null>(null)

	React.useEffect(() => {
		setConsent(getExistingConsent())
	}, [])

	React.useEffect(() => {
		let cancelled = false
		async function checkSession() {
			try {
				const res = await fetch("/api/auth/session", { cache: "no-store" })
				const data = await res.json().catch(() => null)
				if (!cancelled) {
					setHasSession(!!data?.user)
				}
			} catch {
				if (!cancelled) {
					setHasSession(false)
				}
			}
		}
		void checkSession()
		return () => {
			cancelled = true
		}
	}, [])

	// Show banner if:
	// 1. User has a session (NextAuth sets cookies after login), OR
	// 2. User is on sign-in page (demo mode requires cookies)
	const isSignInPage =
		typeof window !== "undefined" && window.location.pathname === "/auth/signin"

	// Only show banner if user has a session or is on sign-in page
	// Unauthenticated users on other pages don't need consent until they log in
	if (hasSession === null) return null // Wait for session check
	if ((hasSession === false && !isSignInPage) || consent) return null

	const handleChoice = (value: Exclude<ConsentState, null>) => {
		try {
			window.localStorage.setItem("cookie-consent", value)
		} catch {}
		try {
			setConsentCookie(value)
		} catch {}
		setConsent(value)
	}

	return (
		<div
			role="dialog"
			aria-live="polite"
			className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70"
		>
			<div className="mx-auto flex max-w-5xl items-center justify-between gap-4 p-4">
				<p className="text-sm text-gray-700">
					We use essential cookies to enable core functionality and analytics to
					improve the product. You can accept or decline non-essential cookies.
				</p>
				<div className="flex items-center gap-2">
					<button
						type="button"
						className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50"
						onClick={() => handleChoice("declined")}
						aria-label="Decline non-essential cookies"
					>
						Decline
					</button>
					<button
						type="button"
						className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800"
						onClick={() => handleChoice("accepted")}
						aria-label="Accept cookies"
					>
						Accept
					</button>
				</div>
			</div>
		</div>
	)
}


