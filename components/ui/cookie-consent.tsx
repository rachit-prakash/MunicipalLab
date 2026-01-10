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
	} catch { }
	try {
		const match = document.cookie
			.split(";")
			.map((c) => c.trim())
			.find((c) => c.startsWith("cookie-consent="))
		if (!match) return null
		const val = match.split("=")[1]
		if (val === "accepted" || val === "declined") return val
	} catch { }
	return null
}

export default function CookieConsent(): React.JSX.Element | null {
	const [consent, setConsent] = React.useState<ConsentState>(null)
	const [mounted, setMounted] = React.useState(false)

	React.useEffect(() => {
		// Small delay to ensure proper hydration and prevent flash
		const timer = setTimeout(() => {
			setMounted(true)
			setConsent(getExistingConsent())
		}, 100)
		return () => clearTimeout(timer)
	}, [])

	// Don't render until mounted (prevents hydration flash)
	// Show banner for all visitors who haven't made a consent choice yet
	if (!mounted) return null
	if (consent) return null // Already made a choice

	const handleChoice = (value: Exclude<ConsentState, null>) => {
		try {
			window.localStorage.setItem("cookie-consent", value)
		} catch { }
		try {
			setConsentCookie(value)
		} catch { }
		setConsent(value)
	}

	return (
		<div
			role="dialog"
			aria-live="polite"
			className="fixed bottom-4 right-4 z-50 w-full max-w-md animate-in slide-in-from-bottom-5 fade-in duration-500"
		>
			<div className="mx-4 sm:mx-0 rounded-xl border border-border bg-card/95 backdrop-blur-lg shadow-xl supports-[backdrop-filter]:bg-card/90 p-4">
				<div className="flex flex-col gap-4">
					<div className="space-y-1.5">
						<h3 className="text-sm font-semibold text-foreground">
							Cookie Preferences
						</h3>
						<p className="text-sm text-muted-foreground leading-relaxed">
							We use essential cookies to enable core functionality and analytics to
							improve the product.
						</p>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted transition-colors duration-200"
							onClick={() => handleChoice("declined")}
							aria-label="Decline non-essential cookies"
						>
							Decline
						</button>
						<button
							type="button"
							className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors duration-200"
							onClick={() => handleChoice("accepted")}
							aria-label="Accept cookies"
						>
							Accept
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}


