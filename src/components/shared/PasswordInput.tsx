import { useState, useId } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Accessible label describing the field, e.g. "Password" or "Confirm password". */
  toggleLabel?: string;
}

/**
 * Password input with an inline Show/Hide toggle.
 * Toggle sits inside the right edge; clicking it flips the input type
 * between "password" and "text" and updates the icon + ARIA state.
 */
export function PasswordInput({ toggleLabel = "Password", className = "", ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const toggleId = useId();
  const type = visible ? "text" : "password";

  return (
    <div className="relative">
      <input type={type} className={`input pr-[4.5rem] ${className}`} {...props} />
      <button
        id={toggleId}
        type="button"
        aria-pressed={visible}
        aria-label={`${visible ? "Hide" : "Show"} ${toggleLabel}`}
        title={`${visible ? "Hide" : "Show"} ${toggleLabel}`}
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center gap-1.5 px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:text-foreground"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        <span aria-hidden="true">{visible ? "Hide" : "Show"}</span>
      </button>
    </div>
  );
}
