import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseEnabled, supabase } from "@/lib/supabase";
import { useProgress } from "@/store/useProgress";

interface AuthValue {
  /** Whether Supabase is configured at all. */
  enabled: boolean;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

/** Remembered "continue without account" choice — gates the app to /auth until made. */
const GUEST_KEY = "praktika:guest-ok";

export function chooseGuestMode(): void {
  try {
    localStorage.setItem(GUEST_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasGuestChoice(): boolean {
  try {
    return localStorage.getItem(GUEST_KEY) === "1";
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseEnabled);
  const setUserId = useProgress((s) => s.setUserId);
  const syncFromRemote = useProgress((s) => s.syncFromRemote);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setUserId(user?.id ?? null);
    if (user) void syncFromRemote();
  }, [user?.id, setUserId, syncFromRemote]);

  const value: AuthValue = {
    enabled: isSupabaseEnabled,
    user,
    loading,
    signIn: async (email, password) => {
      if (!supabase) return { error: "Supabase не настроен" };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    signUp: async (email, password) => {
      if (!supabase) return { error: "Supabase не настроен" };
      const { error } = await supabase.auth.signUp({ email, password });
      return { error: error?.message ?? null };
    },
    resetPassword: async (email) => {
      if (!supabase) return { error: "Supabase не настроен" };
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      return { error: error?.message ?? null };
    },
    signOut: async () => {
      // Forget the guest choice so the sign-out lands on the auth screen.
      try {
        localStorage.removeItem(GUEST_KEY);
      } catch {
        /* ignore */
      }
      if (supabase) await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
