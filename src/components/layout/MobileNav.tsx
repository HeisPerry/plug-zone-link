import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Package, MessageSquare, Bell, Menu, X } from "lucide-react";
import { NavLinks } from "./Sidebar";
import { useUnreadCount } from "@/hooks/useMessages";
import { useUnreadNotifications } from "@/hooks/useNotifications";

const TABS = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/ads", label: "Ads", icon: Package },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/notifications", label: "Alerts", icon: Bell },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { data: unread = 0 } = useUnreadCount();
  const { data: unreadNotifs = 0 } = useUnreadNotifications();

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background md:hidden" aria-label="Main">
        {TABS.map(({ to, label, icon: Icon }) => {
          const dot = (to === "/messages" && unread > 0) || (to === "/notifications" && unreadNotifs > 0);
          return (
            <Link
              key={to}
              to={to}
              className="relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground data-[status=active]:text-primary"
            >
              <Icon size={20} />
              {label}
              {dot && <span className="absolute right-[calc(50%-18px)] top-2 h-2 w-2 rounded-full bg-primary" />}
            </Link>
          );
        })}
        <button
          onClick={() => setOpen(true)}
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground"
        >
          <Menu size={20} />
          Menu
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-foreground/40" />
          <div
            className="absolute inset-y-0 right-0 flex w-72 max-w-[85%] flex-col border-l bg-background px-3 py-5 transition-transform"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between px-3">
              <span className="font-heading text-lg font-bold">Menu</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="flex h-11 w-11 items-center justify-center">
                <X size={20} />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
