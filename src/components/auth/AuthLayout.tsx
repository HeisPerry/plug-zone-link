import type { ReactNode } from "react";
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
      <section className="relative flex items-start justify-center px-6 py-10 sm:px-10 lg:items-center lg:px-16">
        <ThemeToggle className="absolute right-4 top-4" />
        <div className="panel w-full max-w-md p-6 sm:p-8">{children}</div>
      </section>
    </div>
  );
}
