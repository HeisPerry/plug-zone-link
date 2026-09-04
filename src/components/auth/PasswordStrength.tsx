import { Check, Circle } from "lucide-react";
import { passwordRules } from "@/lib/validators";
import { cn } from "@/lib/utils";

export function PasswordStrength({ password }: { password: string }) {
  return (
    <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {passwordRules.map((r) => {
        const ok = r.test(password);
        return (
          <li key={r.id} className={cn("flex items-center gap-2 text-[13px]", ok ? "text-success" : "text-muted-foreground")}>
            {ok ? <Check size={14} /> : <Circle size={14} />}
            {r.label}
          </li>
        );
      })}
    </ul>
  );
}
