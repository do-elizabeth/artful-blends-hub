import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { isConfiguredAdmin } from "@/lib/admin";
import type { Profile } from "@/lib/database.types";
import { saveCurrentLocation } from "@/lib/location";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  withdraw: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) {
    console.error(error);
    return null;
  }
  return data;
}

function withAdminFlag(profile: Profile, email: string | undefined): Profile {
  return isConfiguredAdmin(email) ? { ...profile, is_admin: true } : profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = async (user: User | undefined) => {
    if (!user) {
      setProfile(null);
      return;
    }
    if (supabase) {
      await supabase.rpc("sync_admin_flag");
    }
    let next = await fetchProfile(user.id);
    if (!next) {
      setProfile(null);
      return;
    }
    if (next.withdrawn_at) {
      await supabase?.auth.signOut();
      setProfile(null);
      return;
    }
    next = withAdminFlag(next, user.email);
    setProfile(next);
    if (!supabase) return;

    void supabase.rpc("touch_presence", { online: true });
    void saveCurrentLocation(user.id).then(async () => {
      const refreshed = await fetchProfile(user.id);
      if (refreshed && !refreshed.withdrawn_at) {
        setProfile(withAdminFlag(refreshed, user.email));
      }
    });
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void loadProfile(data.session?.user).finally(() => {
        if (active) setLoading(false);
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadProfile(nextSession?.user);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user) return;
    const client = supabase;

    const beat = () => {
      void client.rpc("touch_presence", { online: true });
    };
    const goOffline = () => {
      void client.rpc("touch_presence", { online: false });
    };

    beat();
    const interval = window.setInterval(beat, 20000);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") goOffline();
      else beat();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", goOffline);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", goOffline);
      goOffline();
    };
  }, [session?.user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      profile,
      refreshProfile: async () => {
        await loadProfile(session?.user);
      },
      signOut: async () => {
        if (supabase && session?.user) {
          await supabase.rpc("touch_presence", { online: false });
        }
        await supabase?.auth.signOut();
        setProfile(null);
      },
      withdraw: async () => {
        if (!supabase || !session?.user) return;
        const { error } = await supabase.rpc("withdraw_account");
        if (error) throw error;
        await supabase.auth.signOut();
        setProfile(null);
      },
    }),
    [loading, session, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
