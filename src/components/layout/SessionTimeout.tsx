import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { SESSION_TIMEOUT_MS, SESSION_WARNING_MS } from "@/lib/constants";
import { Modal } from "@/components/shared/Modal";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;

export function SessionTimeout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const lastActivity = useRef(Date.now());
  const signingOut = useRef(false);

  useEffect(() => {
    if (!user) {
      setWarning(false);
      return;
    }
    lastActivity.current = Date.now();
    signingOut.current = false;

    const bump = () => {
      if (!warning) lastActivity.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const tick = setInterval(async () => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= SESSION_TIMEOUT_MS && !signingOut.current) {
        signingOut.current = true;
        setWarning(false);
        await signOut();
        navigate({ to: "/login", replace: true });
      } else if (idle >= SESSION_WARNING_MS) {
        setWarning(true);
        setSecondsLeft(Math.ceil((SESSION_TIMEOUT_MS - idle) / 1000));
      }
    }, 1000);

    return () => {
      clearInterval(tick);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, bump));
    };
  }, [user, warning, signOut, navigate]);

  if (!user) return null;

  return (
    <Modal open={warning} onClose={() => {}} title="Still there?">
      <p className="text-[15px] text-muted-foreground">
        You'll be signed out in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")} because of inactivity.
      </p>
      <div className="mt-6 flex gap-2">
        <button
          className="btn btn-primary"
          onClick={() => {
            lastActivity.current = Date.now();
            setWarning(false);
          }}
        >
          Stay signed in
        </button>
        <button
          className="btn btn-secondary"
          onClick={async () => {
            await signOut();
            navigate({ to: "/login", replace: true });
          }}
        >
          Sign out now
        </button>
      </div>
    </Modal>
  );
}
