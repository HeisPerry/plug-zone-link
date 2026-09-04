import { Link } from "@tanstack/react-router";
import { LayoutGrid, MessageSquare, Plus, ShoppingBag, Wallet } from "lucide-react";
import { useUnreadCount } from "@/hooks/useMessages";
import { useOngoingOrdersCount } from "@/hooks/useOrders";

const TABS = [
  { to: "/dashboard", label: "Market", icon: LayoutGrid },
  { to: "/orders", label: "Orders", icon: ShoppingBag },
  { to: "/ads/new", label: "Post", icon: Plus },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/wallet", label: "Wallet", icon: Wallet },
] as const;

export function MobileNav() {
  const { data: unread = 0 } = useUnreadCount();
  const { data: ongoing = 0 } = useOngoingOrdersCount();

  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 flex border-t pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Main">
      {TABS.map(({ to, label, icon: Icon }) => {
        const dot = (to === "/messages" && unread > 0) || (to === "/orders" && ongoing > 0);
        if (to === "/ads/new") {
          return (
            <Link key={to} to={to} className="flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold" aria-label="Post an Ad">
              <span className="brand-gradient -mt-5 flex h-12 w-12 items-center justify-center rounded-full text-primary-foreground shadow-glow">
                <Icon size={22} strokeWidth={2.5} className="text-background" />
              </span>
            </Link>
          );
        }
        return (
          <Link
            key={to}
            to={to}
            className="relative flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-muted-foreground data-[status=active]:text-primary"
          >
            <Icon size={21} />
            {label}
            {dot && <span className="absolute right-[calc(50%-16px)] top-2.5 h-2 w-2 rounded-full bg-primary" />}
          </Link>
        );
      })}
    </nav>
  );
}
