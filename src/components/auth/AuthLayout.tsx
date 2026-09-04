import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Logo, ThemeToggle } from "@/components/layout/TopNav";

export function AuthLayout({ children, headline, points }: { children: ReactNode; headline: string; points: string[] }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="hero-surface flex flex-col justify-between border-b px-6 py-8 sm:px-10 lg:border-b-0 lg:border-r lg:px-16 lg:py-12">
        <Logo to="/" />
        <div className="py-10 lg:py-0">
          <span className="pill mb-6">Free to join · No listing fees</span>
          <h1 className="max-w-lg text-[36px] sm:text-[46px] lg:text-[56px]">{headline}</h1>
          <ul className="mt-8 space-y-3 text-[16px] text-muted-foreground">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Check size={14} strokeWidth={3} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden text-sm text-muted-foreground lg:block">Trusted by buyers and sellers across Nigeria.</p>
      </aside>
      <section className="relative flex flex-col px-6 py-10 sm:px-10 lg:px-16">
        <ThemeToggle className="absolute right-4 top-4" />
        <div className="flex flex-1 items-start justify-center lg:items-center">
          <div className="panel w-full max-w-md p-6 sm:p-8">{children}</div>
        </div>
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <p>© 2026 PlugZone. All rights reserved.</p>
          <nav aria-label="Legal" className="flex gap-6">
            <Link to="/terms" className="inline-flex min-h-11 items-center hover:text-foreground">
              Terms of Service
            </Link>
            <Link to="/privacy" className="inline-flex min-h-11 items-center hover:text-foreground">
              Privacy Policy
            </Link>
          </nav>
        </footer>
      </section>
    </div>
  );
}
