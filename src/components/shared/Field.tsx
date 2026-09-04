import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  counter,
}: {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  hint?: string | undefined;
  counter?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="label">
          {label}
        </label>
        {counter && <span className="text-xs text-muted-foreground">{counter}</span>}
      </div>
      {children}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="helper">{hint}</p> : null}
    </div>
  );
}
