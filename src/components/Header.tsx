"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
  const path = usePathname();
  const active = path === href;
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-xl text-sm transition
                  ${active ? "bg-white/10" : "hover:bg-white/5 text-dsrpt-mute"}`}
    >
      {children}
    </Link>
  );
};

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/30 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          DSRPT
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink href="/quote">Quote</NavLink>
          <NavLink href="/policies">Policies</NavLink>
          <a
            href="https://risk.dsrpt.finance/quote"
            className="px-3 py-2 rounded-xl text-sm bg-dsrpt-brand hover:opacity-90"
          >
            Launch Risk App
          </a>
        </nav>
      </div>
    </header>
  );
}
