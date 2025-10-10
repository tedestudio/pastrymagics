"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isHome = pathname === "/";

  return (
    <header
      className={`z-20 w-full top-0 left-0 right-0 p-2 ${
        isHome ? "absolute" : "relative"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 bg-background/80 px-6 backdrop-blur-3xl rounded-xl">
          <img src="/logo.png" alt="Pastry Magiccs" className="h-12 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center justify-center gap-6 text-[var(--foreground)] text-sm bg-background/80 h-10 px-6 backdrop-blur-3xl rounded-xl border border-[var(--muted)]">
          <Link
            href="/order"
            className="opacity-80 hover:opacity-100 transition-opacity"
          >
            Order
          </Link>
          <Link
            href="/customise"
            className="opacity-80 hover:opacity-100 transition-opacity"
          >
            Customise
          </Link>
          <Link
            href="#menu"
            className="opacity-80 hover:opacity-100 transition-opacity"
          >
            Menu
          </Link>
          <Link
            href="/order-history"
            className="opacity-80 hover:opacity-100 transition-opacity"
          >
            Order History
          </Link>
          <Link
            href="#contact"
            className="opacity-80 hover:opacity-100 transition-opacity"
          >
            Contact
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-md border border-[var(--muted)] bg-background"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="md:hidden px-4 pb-4">
          <div className="rounded-xl border border-[var(--muted)] bg-background/90 backdrop-blur">
            <div className="flex flex-col p-3 gap-2 text-sm">
              <Link
                href="/order"
                className="px-3 py-2 rounded-md hover:bg-[var(--muted)]/60"
                onClick={() => setOpen(false)}
              >
                Order
              </Link>
              <Link
                href="/customise"
                className="px-3 py-2 rounded-md hover:bg-[var(--muted)]/60"
                onClick={() => setOpen(false)}
              >
                Customise
              </Link>
              <Link
                href="#menu"
                className="px-3 py-2 rounded-md hover:bg-[var(--muted)]/60"
                onClick={() => setOpen(false)}
              >
                Menu
              </Link>
              <Link
                href="#contact"
                className="px-3 py-2 rounded-md hover:bg-[var(--muted)]/60"
                onClick={() => setOpen(false)}
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
