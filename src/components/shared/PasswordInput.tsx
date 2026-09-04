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
      <input type={type} className={`input pr-11 ${className}`} {...props} />
      <button
        id={toggleId}
        type="button"
        aria-pressed={visible}
        aria-label={`${visible ? "Hide" : "Show"} ${toggleLabel}`}
        title={`${visible ? "Hide" : "Show"} ${toggleLabel}`}
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:text-foreground"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
