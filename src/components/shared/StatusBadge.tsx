import { cn } from "@/lib/utils";

const COLORS: Record<string, string> = {
  active: "text-success",
  accepted: "text-primary",
  completed: "text-success",
  pending: "text-warning",
  processing: "text-warning",
  paused: "text-muted-foreground",
  sold: "text-muted-foreground",
  cancelled: "text-destructive",
  failed: "text-destructive",
  disputed: "text-destructive",
  rejected: "text-destructive",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium capitalize", COLORS[status] ?? "text-muted-foreground", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function CategoryBadge({ children }: { children: string }) {
  return <span className="badge">{children}</span>;
}
