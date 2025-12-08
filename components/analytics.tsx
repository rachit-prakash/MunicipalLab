"use client"

import { useEffect, useState } from "react"
import Script from "next/script"

type AnalyticsProvider = "plausible" | "fathom" | "google" | "posthog" | "none"

interface AnalyticsConfig {
	provider: AnalyticsProvider
	plausible?: {
		domain: string
		// Optional: Custom domain if self-hosting
		apiHost?: string
	}
	fathom?: {
		siteId: string
	}
	google?: {
		measurementId: string
	}
	posthog?: {
		apiKey: string
		apiHost?: string
	}
}

// Configure your analytics provider here
const ANALYTICS_CONFIG: AnalyticsConfig = {
	// Change this to your preferred provider
	provider: "plausible", // Options: "plausible" | "fathom" | "google" | "posthog" | "none"

	// Plausible configuration (recommended for privacy)
	plausible: {
		domain: "legaside.com", // Change to your actual domain if different
		// apiHost: "https://plausible.io", // Optional: for self-hosting
	},

	// Fathom configuration
	fathom: {
		siteId: "YOUR_FATHOM_SITE_ID",
	},

	// Google Analytics 4 configuration
	google: {
		measurementId: "G-XXXXXXXXXX",
	},

	// PostHog configuration
	posthog: {
		apiKey: "phc_XXXXXXXXXXXX",
		apiHost: "https://app.posthog.com", // or your self-hosted URL
	},
}

function getConsentCookie(): "accepted" | "declined" | null {
	if (typeof window === "undefined") return null
	try {
		// Check localStorage first (faster)
		const ls = window.localStorage.getItem("cookie-consent")
		if (ls === "accepted" || ls === "declined") return ls as "accepted" | "declined"
	} catch {}
	try {
		// Fallback to cookie
		const match = document.cookie
			.split(";")
			.map((c) => c.trim())
			.find((c) => c.startsWith("cookie-consent="))
		if (!match) return null
		const val = match.split("=")[1]
		if (val === "accepted" || val === "declined") return val as "accepted" | "declined"
	} catch {}
	return null
}

export function Analytics() {
	const [consent, setConsent] = useState<"accepted" | "declined" | null>(null)
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
		setConsent(getConsentCookie())

		// Listen for consent changes (when user accepts/declines from banner)
		const checkConsent = () => {
			setConsent(getConsentCookie())
		}

		// Poll for consent changes every second
		const interval = setInterval(checkConsent, 1000)
		return () => clearInterval(interval)
	}, [])

	// Don't render anything until mounted (prevents hydration issues)
	if (!mounted) return null

	// Don't load analytics if user hasn't accepted or explicitly declined
	if (consent !== "accepted") return null

	// No analytics configured
	if (ANALYTICS_CONFIG.provider === "none") return null

	return (
		<>
			{/* Plausible Analytics */}
			{ANALYTICS_CONFIG.provider === "plausible" && ANALYTICS_CONFIG.plausible && (
				<Script
					defer
					data-domain={ANALYTICS_CONFIG.plausible.domain}
					src={`${ANALYTICS_CONFIG.plausible.apiHost || "https://plausible.io"}/js/script.js`}
				/>
			)}

			{/* Fathom Analytics */}
			{ANALYTICS_CONFIG.provider === "fathom" && ANALYTICS_CONFIG.fathom && (
				<Script
					src="https://cdn.usefathom.com/script.js"
					data-site={ANALYTICS_CONFIG.fathom.siteId}
					defer
				/>
			)}

			{/* Google Analytics 4 */}
			{ANALYTICS_CONFIG.provider === "google" && ANALYTICS_CONFIG.google && (
				<>
					<Script
						src={`https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_CONFIG.google.measurementId}`}
						strategy="afterInteractive"
					/>
					<Script id="google-analytics" strategy="afterInteractive">
						{`
							window.dataLayer = window.dataLayer || [];
							function gtag(){dataLayer.push(arguments);}
							gtag('js', new Date());
							gtag('config', '${ANALYTICS_CONFIG.google.measurementId}', {
								page_path: window.location.pathname,
								anonymize_ip: true, // Privacy-friendly
							});
						`}
					</Script>
				</>
			)}

			{/* PostHog */}
			{ANALYTICS_CONFIG.provider === "posthog" && ANALYTICS_CONFIG.posthog && (
				<Script id="posthog" strategy="afterInteractive">
					{`
						!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
						posthog.init('${ANALYTICS_CONFIG.posthog.apiKey}', {
							api_host: '${ANALYTICS_CONFIG.posthog.apiHost}',
							person_profiles: 'identified_only',
							capture_pageview: true,
							capture_pageleave: true
						})
					`}
				</Script>
			)}
		</>
	)
}
