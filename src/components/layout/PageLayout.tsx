import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { useNotificationRealtime } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  // One realtime subscription for the whole signed-in app: live badge counts + browser push.
  useNotificationRealtime();
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="pb-20 md:ml-60 md:pb-0">{children}</main>
      <MobileNav />
    </div>
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
        <h1 className="text-2xl sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Page({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn("mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-10", wide ? "max-w-6xl" : "max-w-4xl", className)}>{children}</div>;
}

export function PublicHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="/" className="font-heading text-xl font-bold">
          PlugZone
        </a>
        {right}
      </div>
    </header>
  );
}
