import type { ReactNode } from "react";

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed px-6 py-12 text-left sm:px-10">
      <h3 className="text-lg">{title}</h3>
      {body && <p className="mt-1 max-w-md text-[15px] text-muted-foreground">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-[15px] text-muted-foreground">{message ?? "Something went wrong loading this page."}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-secondary mt-4">
          Try again
        </button>
      )}
    </div>
  );
}
