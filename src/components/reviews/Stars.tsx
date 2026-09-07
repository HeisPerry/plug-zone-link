import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          aria-hidden="true"
          className={i <= Math.round(value) ? "fill-warning text-warning" : "text-muted-foreground/40"}
        />
      ))}
    </span>
  );
}

export function StarPicker({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
          disabled={disabled}
          onClick={() => onChange(i)}
          className="rounded-full p-1 transition hover:scale-110 disabled:opacity-50"
        >
          <Star size={26} className={i <= value ? "fill-warning text-warning" : "text-muted-foreground/40"} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
