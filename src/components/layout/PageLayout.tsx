import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { TopNav, Logo, ThemeToggle } from "./TopNav";
import { MobileNav } from "./MobileNav";
import { useNotificationRealtime } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  // One realtime subscription for the whole signed-in app: live badge counts + browser push.
  useNotificationRealtime();
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="pb-24 lg:pb-12">{children}</main>
      <MobileNav />
    </div>
  );
}

/** Full-bleed soft gradient band used at the top of every major page. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  action,
  children,
  compact,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="hero-surface border-b">
      <div className={cn("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", compact ? "py-8 sm:py-10" : "py-12 sm:py-16 lg:py-20")}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl rise-in">
            {eyebrow && <span className="pill mb-5">{eyebrow}</span>}
            <h1 className={cn(compact ? "text-[30px] sm:text-[38px]" : "text-[38px] sm:text-[52px] lg:text-[64px]")}>{title}</h1>
            {subtitle && <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-muted-foreground sm:text-[19px]">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div>
        <h1 className="text-[28px] sm:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Page({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn("mx-auto w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8", wide ? "max-w-7xl" : "max-w-4xl", className)}>{children}</div>;
}

export function PublicHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="glass sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo to="/" />
        <div className="flex items-center gap-2">
          {right}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-10 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <Logo to="/" />
        <nav className="flex flex-wrap gap-6">
          <Link to="/signup">Sign Up</Link>
          <Link to="/login">Login</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
