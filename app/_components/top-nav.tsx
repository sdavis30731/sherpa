"use client";

/**
 * Top navigation bar — the SherpaKeys wordmark + anchor links to the
 * homepage's pillar sections.
 *
 * SHRP-058 redesign: the desktop links are now in-page anchors that jump
 * to the homepage's spine (Headaches → Secured → Organized → Open source
 * → Pricing). Visitors who land on /security or /signup still get the
 * same nav — anchor links with leading `/` resolve correctly back to /.
 * Mobile collapses behind a hamburger.
 */

import * as React from "react";
import Link from "next/link";
import { KeyRound, Menu, X } from "lucide-react";

const NAV_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/#headaches", label: "Headaches" },
  { href: "/#secured", label: "Secured" },
  { href: "/#organized", label: "Organized" },
  { href: "/#opensource", label: "Open source" },
  { href: "/#pricing", label: "Pricing" },
];

export function TopNav() {
  const [open, setOpen] = React.useState(false);

  // Close on Escape.
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav className="relative flex items-center justify-between py-4 sm:py-5">
      {/* Wordmark — gradient key icon + bigger text */}
      <Link
        href="/"
        className="group flex items-center gap-2.5 transition hover:opacity-90"
        onClick={() => setOpen(false)}
      >
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sherpa-500 to-sherpa-600 text-white shadow-md shadow-sherpa-500/30 ring-1 ring-sherpa-700/10 sm:h-10 sm:w-10">
          <KeyRound className="h-5 w-5" />
        </span>
        <span className="text-2xl font-bold tracking-tight sm:text-3xl">
          <span className="text-slate-900">Sherpa</span>
          <span className="text-sherpa-500">Keys</span>
        </span>
      </Link>

      {/* Desktop links — hidden until lg because there are more of them now */}
      <div className="hidden items-center gap-6 text-sm lg:flex">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="font-medium text-slate-600 transition hover:text-slate-900"
          >
            {link.label}
          </Link>
        ))}
        <span aria-hidden className="h-5 w-px bg-slate-200" />
        <Link
          href="/login"
          className="font-medium text-slate-600 transition hover:text-slate-900"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-4 py-2 font-semibold text-white shadow-sm shadow-sherpa-500/30 transition hover:shadow-md hover:shadow-sherpa-500/40"
        >
          Join waitlist
        </Link>
      </div>

      {/* Mobile hamburger */}
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile dropdown */}
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-40 mt-2 origin-top rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5 lg:hidden"
          role="menu"
        >
          <div className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <MobileNavLink
                key={link.href}
                href={link.href}
                onSelect={() => setOpen(false)}
              >
                {link.label}
              </MobileNavLink>
            ))}
            <div aria-hidden className="my-2 h-px bg-slate-100" />
            <MobileNavLink href="/login" onSelect={() => setOpen(false)}>
              Log in
            </MobileNavLink>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-sherpa-500/30"
            >
              Join waitlist
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

function MobileNavLink({
  href,
  children,
  onSelect,
}: {
  href: string;
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className="rounded-lg px-3 py-2.5 text-base font-medium text-slate-800 hover:bg-slate-50"
      role="menuitem"
    >
      {children}
    </Link>
  );
}
