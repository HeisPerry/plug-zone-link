import { Link, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  MessageSquare,
  Bell,
  Users,
  CalendarCheck,
  Smartphone,
  User,
  Settings,
  LogOut,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadCount } from "@/hooks/useMessages";
import { useUnreadNotifications } from "@/hooks/useNotifications";

export const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ads", label: "My Ads", icon: Package },
  { to: "/orders", label: "Orders", icon: ShoppingBag },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/friends", label: "Friends", icon: Users },
  { to: "/checkin", label: "Check-In", icon: CalendarCheck },
  { to: "/data-airtime", label: "Buy Data/Airtime", icon: Smartphone },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: unread = 0 } = useUnreadCount();
  const { data: unreadNotifs = 0 } = useUnreadNotifications();

  return (
    <nav className="flex flex-1 flex-col gap-0.5">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <Link key={to} to={to} className="nav-link" onClick={onNavigate}>
          <Icon size={18} strokeWidth={2} />
          <span className="flex-1">{label}</span>
          {to === "/messages" && <CountBadge count={unread} />}
          {to === "/notifications" && <CountBadge count={unreadNotifs} />}
        </Link>
      ))}
      {profile && (
        <Link to="/user/$username" params={{ username: profile.username }} className="nav-link" onClick={onNavigate}>
          <User size={18} strokeWidth={2} />
          <span>Profile</span>
        </Link>
      )}
      <div className="mt-auto pt-4">
        <button
          className="nav-link w-full text-left text-muted-foreground"
          onClick={async () => {
            onNavigate?.();
            await signOut();
            navigate({ to: "/login", replace: true });
          }}
        >
          <LogOut size={18} strokeWidth={2} />
          <span>Sign Out</span>
        </button>
      </div>
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r bg-background px-3 py-5 md:flex">
      <Link to="/dashboard" className="mb-6 flex items-center gap-2 px-3 font-heading text-xl font-bold">
        <Zap size={22} className="text-primary" />
        PlugZone
      </Link>
      <NavLinks />
    </aside>
  );
}
