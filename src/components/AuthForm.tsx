import { Link } from "@tanstack/react-router";
import { useState } from "react";

type Props = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: Props) {
  const isRegister = mode === "register";
  const [done, setDone] = useState(false);

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
            ? "A few details and your workspace is ready. Nothing is stored anywhere yet."
            : "Pick up right where you left the light."}
        </p>

        <form
          className="mt-7 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setDone(true);
          }}
        >
          {isRegister && (
            <label className="block">
              <span className="text-xs font-medium text-muted">Name</span>
              <input
                type="text"
                required
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
              placeholder="At least 6 characters"
              className="mt-1.5 w-full rounded-2xl border border-line bg-paper/50 px-4 py-3 text-[15px] text-ink placeholder:text-muted/70 outline-none focus:border-clay/50 focus:ring-2 focus:ring-clay/20"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-full bg-clay py-3 text-sm font-medium text-panel ring-1 ring-clay/20 transition-transform hover:-translate-y-0.5"
          >
            {isRegister ? "Create account" : "Sign in"}
          </button>
        </form>

        {done && (
          <p className="mt-4 rounded-2xl bg-sage/15 px-4 py-3 text-center text-xs font-medium text-sage">
            This is a preview form — no account is saved yet.
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
