import type React from "react"
import type { Metadata, Viewport } from "next"
import { Figtree, EB_Garamond } from "next/font/google"
import "./globals.css"
import CookieConsent from "@/components/ui/cookie-consent"
import { DemoBanner } from "@/components/ui/demo-banner"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"

// Primary sans-serif font (body text, UI elements)
const figtree = Figtree({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600"], 
  display: "swap",
  variable: "--font-figtree"
})

// Display serif font (headings, marketing content)
const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-garamond"
})

export const metadata: Metadata = {
  title: {
    default: "Legaside - Your Inbox, Reimagined",
    template: "%s | Legaside",
  },
  description: "Software that keeps your inbox calm, your priorities clear, and your constituents answered. Built for legislative teams who need clarity, speed, and follow-through without wrestling filters all day.",
  keywords: [
    "legislative inbox",
    "government email management",
    "constituent communication",
    "legislative software",
    "inbox organization",
    "policy management",
    "government productivity",
    "legislative teams",
    "email prioritization",
    "constituent services",
  ],
  authors: [{ name: "Legaside" }],
  creator: "Legaside",
  publisher: "Legaside",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://legaside.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Legaside",
    title: "Legaside - Your Inbox, Reimagined",
    description: "Software that keeps your inbox calm, your priorities clear, and your constituents answered. Built for legislative teams.",
    images: [
      {
        url: "/logo-icon.png",
        width: 1200,
        height: 630,
        alt: "Legaside - Legislative Inbox Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Legaside - Your Inbox, Reimagined",
    description: "Software that keeps your inbox calm, your priorities clear, and your constituents answered.",
    images: ["/logo-icon.png"],
    creator: "@legaside",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/logo-icon.png", sizes: "any" },
    ],
    apple: [
      { url: "/logo-icon.png", sizes: "180x180" },
    ],
  },
  manifest: "/manifest.json",
  generator: "Next.js",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
  themeColor: "#034f46",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${figtree.variable} ${garamond.variable}`}>
      <body suppressHydrationWarning className={`${figtree.className} antialiased`} data-gramm="false">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <DemoBanner />
          <CookieConsent />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
