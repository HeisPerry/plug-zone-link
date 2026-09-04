import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export function AuthLayout({ children, headline, points }: { children: ReactNode; headline: string; points: string[] }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="flex flex-col justify-between bg-muted px-6 py-8 sm:px-10 lg:px-16 lg:py-12">
        <Link to="/" className="font-heading text-xl font-bold">
          PlugZone
        </Link>
        <div className="py-10 lg:py-0">
          <h1 className="max-w-md text-[32px] sm:text-[40px] lg:text-[44px]">{headline}</h1>
          <ul className="mt-8 space-y-3 text-[15px] text-muted-foreground">
            {points.map((p) => (
              <li key={p} className="flex gap-3">
                <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden text-sm text-muted-foreground lg:block">Free to join. No listing fees.</p>
      </aside>
      <section className="flex items-start justify-center px-6 py-10 sm:px-10 lg:items-center lg:px-16">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </div>
  );
}
