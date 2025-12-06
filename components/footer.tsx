'use client';

import Link from "next/link";
import { cn } from "@/lib/utils";

const footerLinks = [
  { label: "Product", href: "#product" },
  { label: "Security", href: "#security" },
  { label: "Tech", href: "#tech" },
];

const socials = [
  { label: "Email", href: "mailto:khan@municipallabs.com" }
];

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  return (
    <footer
      className={cn(
        "relative border-t border-[rgba(3,79,70,0.12)] dark:border-[rgba(6,168,147,0.2)] bg-gradient-to-b from-[#fffef0] to-[#fbf8d8] dark:from-slate-900 dark:to-slate-800 pb-12 pt-16",
        className
      )}
    >
      <div className="mx-auto grid w-[min(1100px,92vw)] gap-12 md:grid-cols-5">
        {/* Left side - Brand */}
        <div className="md:col-span-3 space-y-5">
          <div className="flex items-start gap-3">
            <div>
              <h3 className="text-lg font-bold uppercase tracking-[0.25em] text-[#034f46] dark:text-[#06a893] mb-1">
                Municipal Labs
              </h3>
              <p className="text-base font-medium text-[#4a4a42] dark:text-slate-300">
                Software cities can trust.
              </p>
            </div>
          </div>
          <p className="text-[15px] leading-relaxed text-[#4a4a42] dark:text-slate-400 max-w-md">
            Modern AI tooling built for regulated teams. Reach out for pilots,
            partnerships, and press inquiries.
          </p>
          
          {/* Social Links */}
          <div className="flex flex-wrap gap-3 pt-2">
            {socials.map((social) => (
              <Link
                key={social.label}
                href={social.href}
                className="group inline-flex items-center gap-1.5 rounded-full border-2 border-[#1a1a1a] dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-[#1a1a1a] dark:text-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all duration-200 hover:scale-105 hover:border-[#034f46] dark:hover:border-[#06a893] hover:shadow-[0_6px_20px_rgba(3,79,70,0.15)] dark:hover:shadow-[0_6px_20px_rgba(6,168,147,0.25)]"
                target={social.href.startsWith('http') ? "_blank" : undefined}
                rel={social.href.startsWith('http') ? "noopener noreferrer" : undefined}
              >
                <span>{social.label}</span>
                {social.href.startsWith('http') && (
                  <span className="inline-flex h-4 w-4 items-center justify-center text-[0.6rem] opacity-70 transition-opacity group-hover:opacity-100">
                    ↗
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Right side - Legal */}
        <div className="md:col-span-2 flex items-start justify-start md:justify-end">
          <div className="text-left md:text-right">
            <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-[0.25em] text-[#8d8d83] dark:text-slate-500">
              Legal &amp; Security
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="https://municipallabs.ai/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-[#4a4a42] dark:text-slate-400 transition-colors hover:text-[#034f46] dark:hover:text-[#06a893]"
              >
                <span>Terms of Service</span>
                <span className="inline-flex h-4 w-4 translate-x-0 items-center justify-center rounded border border-[rgba(3,79,70,0.2)] dark:border-[rgba(6,168,147,0.3)] bg-white dark:bg-slate-800 text-[0.6rem] opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100">
                  ↗
                </span>
              </Link>
              <Link
                href="https://municipallabs.ai/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-[#4a4a42] dark:text-slate-400 transition-colors hover:text-[#034f46] dark:hover:text-[#06a893]"
              >
                <span>Privacy Policy</span>
                <span className="inline-flex h-4 w-4 translate-x-0 items-center justify-center rounded border border-[rgba(3,79,70,0.2)] dark:border-[rgba(6,168,147,0.3)] bg-white dark:bg-slate-800 text-[0.6rem] opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100">
                  ↗
                </span>
              </Link>
              <Link
                href="https://municipallabs.ai/data-processing-agreement"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-[#4a4a42] dark:text-slate-400 transition-colors hover:text-[#034f46] dark:hover:text-[#06a893]"
              >
                <span>Data Processing Agreement</span>
                <span className="inline-flex h-4 w-4 translate-x-0 items-center justify-center rounded border border-[rgba(3,79,70,0.2)] dark:border-[rgba(6,168,147,0.3)] bg-white dark:bg-slate-800 text-[0.6rem] opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100">
                  ↗
                </span>
              </Link>
              <Link
                href="https://municipallabs.ai/incident-response-plan"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-[#4a4a42] dark:text-slate-400 transition-colors hover:text-[#034f46] dark:hover:text-[#06a893]"
              >
                <span>Incident Response Plan</span>
                <span className="inline-flex h-4 w-4 translate-x-0 items-center justify-center rounded border border-[rgba(3,79,70,0.2)] dark:border-[rgba(6,168,147,0.3)] bg-white dark:bg-slate-800 text-[0.6rem] opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100">
                  ↗
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="mx-auto mt-12 w-[min(1100px,92vw)] border-t border-[rgba(3,79,70,0.08)] dark:border-[rgba(6,168,147,0.15)] pt-8">
        <p className="text-sm text-[#8d8d83] dark:text-slate-500">
          © {new Date().getFullYear()} MunicipalLabs. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
