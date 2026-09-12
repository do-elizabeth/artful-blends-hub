import { Link } from "@tanstack/react-router";

import { isConfiguredAdmin } from "@/lib/admin";
import { useAuth } from "@/lib/auth-context";

export function SiteHeader() {
  const { user, profile, signOut, withdraw } = useAuth();

  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-7">
      <Link to="/" className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-xl bg-clay font-display text-base font-medium text-panel">
          h
        </span>
        <span className="font-display text-lg font-medium tracking-tight">Hearth</span>
      </Link>
      <nav className="hidden items-center gap-8 text-sm text-muted sm:flex">
        <Link
          to="/"
          className="transition-colors hover:text-ink"
          activeProps={{ className: "text-ink" }}
          activeOptions={{ exact: true }}
        >
          Studio
        </Link>
        <Link
          to="/gallery"
          className="transition-colors hover:text-ink"
          activeProps={{ className: "text-ink" }}
        >
          Gallery
        </Link>
        {(profile?.is_admin || isConfiguredAdmin(user?.email)) && (
          <Link
            to="/admin"
            className="transition-colors hover:text-ink"
            activeProps={{ className: "text-ink" }}
          >
            Admin
          </Link>
        )}
        {user ? (
          <>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Withdraw from Hearth? Your account will be closed and you will be signed out.",
                  )
                ) {
                  void withdraw();
                }
              }}
              className="transition-colors hover:text-ink"
            >
              Withdraw
            </button>
            <button type="button" onClick={() => void signOut()} className="transition-colors hover:text-ink">
              Sign out
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="transition-colors hover:text-ink"
            activeProps={{ className: "text-ink" }}
          >
            Sign in
          </Link>
        )}
      </nav>
      {user ? (
        <span className="max-w-[10rem] truncate rounded-full bg-ink/90 px-4 py-2 text-sm font-medium text-panel">
          {profile?.full_name || user.email}
        </span>
      ) : (
        <Link
          to="/register"
          className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-panel ring-1 ring-ink/10 transition-transform hover:-translate-y-0.5"
        >
          Open account
        </Link>
      )}
    </header>
  );
}
