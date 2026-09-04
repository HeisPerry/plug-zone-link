import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CalendarCheck,
  ChevronDown,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Package,
  Plus,
  Settings,
  ShoppingBag,
  Smartphone,
  Sun,
  User,
  Users,
  Wallet,
  X,
  
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useUnreadCount } from "@/hooks/useMessages";
import { useUnreadNotifications } from "@/hooks/useNotifications";
import { useOngoingOrdersCount } from "@/hooks/useOrders";
import { useWallet } from "@/hooks/useWallet";
import { Avatar } from "@/components/shared/Avatar";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
const LOGO_URL = "/plugzone-mark.png";

const PRIMARY_LINKS = [
  { to: "/dashboard", label: "Marketplace" },
  { to: "/orders", label: "Orders" },
  { to: "/wallet", label: "Wallet" },
] as const;

const MENU_LINKS = [
  { to: "/ads", label: "My Ads", icon: Package },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/friends", label: "Friends", icon: Users },
  { to: "/checkin", label: "Daily Check-In", icon: CalendarCheck },
  { to: "/data-airtime", label: "Data & Airtime", icon: Smartphone },
  { to: "/support", label: "Support Center", icon: LifeBuoy },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Count({ n, className }: { n: number; className?: string }) {
  if (n <= 0) return null;
  return (
    <span className={cn("flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground", className)}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function Logo({ to = "/dashboard", size = "md" }: { to?: "/" | "/dashboard"; size?: "sm" | "md" | "lg" }) {
  return (
    <Link to={to} className="inline-flex min-w-0 shrink items-center gap-2" aria-label="PlugZone — Buy. Sell. Connect.">
      <img
        src={LOGO_URL}
        alt=""
        width={703}
        height={625}
        className={cn("w-auto shrink-0 object-contain", size === "sm" ? "h-8" : size === "lg" ? "h-14 sm:h-20" : "h-8 sm:h-11")}
      />
      <span
        className={cn(
          "truncate font-heading font-extrabold tracking-tight",
          size === "sm" ? "text-lg" : size === "lg" ? "text-3xl sm:text-4xl" : "text-[17px] sm:text-2xl",
        )}
      >
        PlugZone
      </span>
    </Link>
  );
}


export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button type="button" onClick={toggle} className={cn("icon-btn", className)} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

function WalletPill() {
  const { data } = useWallet();
  return (
    <div className="group relative hidden sm:block">
      <Link
        to="/wallet"
        className="flex items-center rounded-full border border-primary/30 bg-primary-soft text-[15px] font-bold text-primary transition-colors hover:border-primary/60"
      >
        <span className="flex items-center gap-2 pl-4 pr-3">
          <Wallet size={18} />
          {data ? formatPrice(data.balance, data.currency) : "—"}
        </span>
        <span className="flex h-10 w-10 items-center justify-center border-l border-primary/25" aria-label="Fund wallet">
          <Plus size={18} />
        </span>
      </Link>
      <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100">
        Fund your wallet
      </span>
    </div>
  );
}

function AccountMenu() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: unread = 0 } = useUnreadCount();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!profile) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full p-1 pr-2 transition-colors hover:bg-muted"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <Avatar name={profile.display_name} username={profile.username} src={profile.avatar_url} size={36} />
        <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className="panel rise-in absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden p-2 shadow-float">
          <Link to="/user/$username" params={{ username: profile.username }} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted">
            <Avatar name={profile.display_name} username={profile.username} src={profile.avatar_url} size={40} />
            <span className="min-w-0">
              <span className="block truncate font-semibold">{profile.display_name}</span>
              <span className="block truncate text-sm text-muted-foreground">@{profile.username}</span>
            </span>
          </Link>
          <div className="my-2 border-t" />
          {MENU_LINKS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} className="nav-link min-h-10 text-[14.5px]" role="menuitem">
              <Icon size={17} />
              <span className="flex-1">{label}</span>
              {to === "/messages" && <Count n={unread} />}
            </Link>
          ))}
          <Link to="/user/$username" params={{ username: profile.username }} onClick={() => setOpen(false)} className="nav-link min-h-10 text-[14.5px]" role="menuitem">
            <User size={17} />
            <span>My Profile</span>
          </Link>
          <div className="my-2 border-t" />
          <button
            role="menuitem"
            className="nav-link min-h-10 w-full text-left text-[14.5px] text-muted-foreground"
            onClick={async () => {
              setOpen(false);
              await signOut();
              navigate({ to: "/login", replace: true });
            }}
          >
            <LogOut size={17} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

const SHEET_LINKS = [
  { to: "/ads", label: "My Ads", sub: "Manage your listings", icon: Package },
  { to: "/messages", label: "Messages", sub: "Chat with buyers & sellers", icon: MessageSquare },
  { to: "/orders", label: "My Orders", sub: "Track buying & selling", icon: ShoppingBag },
  { to: "/friends", label: "Friends", sub: "Invite friends & earn", icon: Users, accent: true },
  { to: "/checkin", label: "Daily Check-In", sub: "Claim your daily reward", icon: CalendarCheck },
  { to: "/data-airtime", label: "Data & Airtime", sub: "Top up any network", icon: Smartphone },
  { to: "/settings", label: "Settings", sub: "Account preferences", icon: Settings },
  { to: "/support", label: "Support Center", sub: "Get help fast", icon: LifeBuoy },
] as const;

function SheetRow({
  to,
  label,
  sub,
  icon: Icon,
  accent,
  badge,
  onClose,
}: {
  to: string;
  label: string;
  sub: string;
  icon: typeof Package;
  accent?: boolean | undefined;
  badge?: number | undefined;
  onClose: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClose}
      className={cn(
        "flex min-h-[60px] items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors",
        accent ? "border-primary/30 bg-primary-soft" : "border-transparent hover:bg-muted",
      )}
    >
      <span
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
          accent ? "bg-primary/15 text-primary" : "bg-muted text-foreground",
        )}
      >
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate font-heading text-[15px] font-bold", accent && "text-primary")}>{label}</span>
        <span className={cn("block truncate text-[13px]", accent ? "text-primary/80" : "text-muted-foreground")}>{sub}</span>
      </span>
      {badge ? <Count n={badge} /> : null}
    </Link>
  );
}

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { data: unread = 0 } = useUnreadCount();
  const { data: ongoing = 0 } = useOngoingOrdersCount();
  const { data: wallet } = useWallet();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] lg:hidden" onClick={onClose} role="dialog" aria-modal="true" aria-label="Account menu">
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm" />
      <div
        className="rise-in absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-3xl bg-background shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 justify-center pb-1 pt-2.5">
          <span className="h-1.5 w-11 rounded-full bg-border" />
        </div>

        {profile && (
          <div className="flex shrink-0 items-center gap-3 border-b px-4 pb-4">
            <Avatar name={profile.display_name} username={profile.username} src={profile.avatar_url} size={52} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-heading text-lg font-extrabold">{profile.display_name}</span>
              <span className="block truncate text-[13px] text-muted-foreground">{user?.email ?? `@${profile.username}`}</span>
            </span>
            <button onClick={onClose} aria-label="Close menu" className="icon-btn shrink-0">
              <X size={20} />
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <Link
            to="/wallet"
            onClick={onClose}
            className="mb-2 flex min-h-[60px] items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary-soft px-4 py-3 text-primary"
          >
            <span className="flex min-w-0 items-center gap-2 font-semibold">
              <Wallet size={18} className="shrink-0" /> Wallet balance
            </span>
            <span className="shrink-0 font-heading font-bold">{wallet ? formatPrice(wallet.balance, wallet.currency) : "—"}</span>
          </Link>

          {SHEET_LINKS.map((l) => (
            <SheetRow
              key={l.to}
              to={l.to}
              label={l.label}
              sub={l.sub}
              icon={l.icon}
              accent={"accent" in l ? l.accent : undefined}
              badge={l.to === "/messages" ? unread : l.to === "/orders" ? ongoing : undefined}
              onClose={onClose}
            />
          ))}
        </div>

        <div className="shrink-0 border-t">
          <button
            type="button"
            onClick={toggle}
            className="flex min-h-14 w-full items-center justify-between px-5 text-left font-heading font-bold"
          >
            Theme
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        <div
          className="grid shrink-0 grid-cols-2 gap-2 border-t px-3 py-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          {profile ? (
            <Link
              to="/user/$username"
              params={{ username: profile.username }}
              onClick={onClose}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border bg-muted px-3 font-heading text-[15px] font-bold"
            >
              <User size={18} />
              Profile
            </Link>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-destructive-soft px-3 font-heading text-[15px] font-bold text-destructive"
            onClick={async () => {
              onClose();
              await signOut();
              navigate({ to: "/login", replace: true });
            }}
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}


export function TopNav() {
  const [drawer, setDrawer] = useState(false);
  const { data: unreadNotifs = 0 } = useUnreadNotifications();
  const { data: ongoing = 0 } = useOngoingOrdersCount();

  return (
    <header className="glass sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:h-[72px] sm:gap-3 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1 lg:flex-none">
          <Logo />
        </div>


        <nav className="ml-8 hidden items-center gap-1 lg:flex" aria-label="Primary">
          {PRIMARY_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} className="top-link">
              {label}
              {to === "/orders" && <Count n={ongoing} className="ml-2" />}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-3">
          <WalletPill />
          <Link to="/ads/new" className="btn btn-ink hidden md:inline-flex">
            <Plus size={18} />
            Post an Ad
          </Link>
          <Link to="/notifications" className="icon-btn relative" aria-label={`Notifications${unreadNotifs ? ` (${unreadNotifs} unread)` : ""}`}>
            <Bell size={21} />
            {unreadNotifs > 0 && <Count n={unreadNotifs} className="absolute -right-0.5 -top-0.5 h-[18px] min-w-[18px] px-1 text-[10px]" />}
          </Link>
          <ThemeToggle className="hidden sm:inline-flex" />
          <div className="hidden lg:block">
            <AccountMenu />
          </div>
          <button className="icon-btn lg:hidden" aria-label="Open menu" onClick={() => setDrawer(true)}>
            <Menu size={22} />
          </button>
        </div>
      </div>
      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} />
    </header>
  );
}
