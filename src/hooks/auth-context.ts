import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

// Kept in its own module so live code updates to useAuth.tsx never recreate the
// context object (which would orphan components still holding the old one).
export const AuthContext = createContext<AuthContextValue | null>(null);
