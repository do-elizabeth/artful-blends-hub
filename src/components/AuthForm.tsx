import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { saveCurrentLocation } from "@/lib/location";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Props = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: Props) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase is not connected yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.");
      return;
    }

    setBusy(true);
    try {
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
          },
        });
        if (signUpError) throw signUpError;

        if (!data.session) {
          const signedIn = await supabase.auth.signInWithPassword({ email, password });
          if (signedIn.error) {
            throw new Error(
              "Turn off Confirm email in Supabase: Authentication → Providers → Email, then try again.",
            );
          }
        }

        const userId = data.user?.id ?? (await supabase.auth.getUser()).data.user?.id;
        if (userId) {
          await supabase.from("profiles").upsert({
            id: userId,
            email,
            full_name: name,
          });
          await supabase.rpc("sync_admin_flag");
          try {
            await saveCurrentLocation(userId);
          } catch (geoError) {
            console.error(geoError);
          }
        }

        await navigate({ to: "/" });
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;

      if (data.user) {
        await supabase.rpc("sync_admin_flag");
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        if (profile?.withdrawn_at) {
          await supabase.auth.signOut();
          throw new Error("This account has been withdrawn from the site.");
        }
        if (profile && !profile.is_active) {
          await supabase.auth.signOut();
          throw new Error("This account has been deactivated. Contact an administrator.");
        }
        try {
          await saveCurrentLocation(data.user.id);
        } catch (geoError) {
          console.error(geoError);
        }
      }

      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-6 pb-24">
      <div className="rounded-[20px] bg-panel/70 p-8 ring-1 ring-black/5 backdrop-blur-xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">
          {isRegister ? "Open an account" : "Welcome back"}
        </p>
        <h1 className="mt-4 font-display text-2xl font-medium tracking-tight">
          {isRegister ? "Pull up a chair at the table." : "Sign in to your studio."}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {isRegister
            ? "A few details and your workspace is ready. Your country is detected from your IP."
            : "Pick up right where you left the light."}
        </p>

        <form className="mt-7 space-y-4" onSubmit={(e) => void onSubmit(e)}>
          {isRegister && (
            <label className="block">
              <span className="text-xs font-medium text-muted">Name</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mika Aoyama"
                className="mt-1.5 w-full rounded-2xl border border-line bg-paper/50 px-4 py-3 text-[15px] text-ink placeholder:text-muted/70 outline-none focus:border-clay/50 focus:ring-2 focus:ring-clay/20"
              />
            </label>
          )}

          <label className="block">
            <span className="text-xs font-medium text-muted">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@studio.com"
              className="mt-1.5 w-full rounded-2xl border border-line bg-paper/50 px-4 py-3 text-[15px] text-ink placeholder:text-muted/70 outline-none focus:border-clay/50 focus:ring-2 focus:ring-clay/20"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-muted">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="mt-1.5 w-full rounded-2xl border border-line bg-paper/50 px-4 py-3 text-[15px] text-ink placeholder:text-muted/70 outline-none focus:border-clay/50 focus:ring-2 focus:ring-clay/20"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-clay py-3 text-sm font-medium text-panel ring-1 ring-clay/20 transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-2xl bg-clay/10 px-4 py-3 text-center text-xs font-medium text-clay">
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          {isRegister ? "Already have an account? " : "New to Hearth? "}
          <Link
            to={isRegister ? "/login" : "/register"}
            className="font-medium text-clay hover:underline"
          >
            {isRegister ? "Sign in" : "Create one"}
          </Link>
        </p>
      </div>
    </div>
  );
}
