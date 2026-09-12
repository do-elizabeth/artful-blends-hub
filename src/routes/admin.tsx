import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import {
  detectMonitoredExtensions,
  type ExtensionDetectionResult,
} from "@/lib/browser-extensions";
import { loadCloudinarySettings, saveCloudinarySettings, type CloudinarySettings } from "@/lib/cloudinary";
import { isConfiguredAdmin } from "@/lib/admin";
import { useAuth } from "@/lib/auth-context";
import type { Profile } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Hearth studio" },
      { name: "description", content: "Review members, countries, activity, and join dates." },
    ],
  }),
  component: AdminPage,
});

const ONLINE_WINDOW_MS = 90_000;

function isUserOnline(user: Profile) {
  if (user.withdrawn_at || !user.last_seen_at) return false;
  const age = Date.now() - new Date(user.last_seen_at).getTime();
  return user.is_online && age < ONLINE_WINDOW_MS;
}

function AdminPage() {
  const { loading, profile, user } = useAuth();
  const isAdmin = Boolean(profile?.is_admin || isConfiguredAdmin(user?.email));
  const [users, setUsers] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cloudinary, setCloudinary] = useState<CloudinarySettings>({ cloudName: "", uploadPreset: "", folder: "" });
  const [cloudinaryMessage, setCloudinaryMessage] = useState<string | null>(null);
  const [extensionResults, setExtensionResults] = useState<ExtensionDetectionResult[]>([]);
  const [extensionsLoading, setExtensionsLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    void loadCloudinarySettings()
      .then(setCloudinary)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not load Cloudinary settings."));
  }, [isAdmin]);

  async function checkExtensions() {
    setExtensionsLoading(true);
    try {
      setExtensionResults(await detectMonitoredExtensions());
    } finally {
      setExtensionsLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin || !supabase) return;
    const client = supabase;
    let active = true;

    const load = () => {
      void client
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .then(({ data, error: loadError }) => {
          if (!active) return;
          if (loadError) {
            setError(loadError.message);
            return;
          }
          setUsers(data ?? []);
        });
    };

    load();
    const interval = window.setInterval(load, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((member) =>
      [member.full_name, member.email, member.country, member.last_ip, member.browser, member.device]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle)),
    );
  }, [query, users]);

  async function toggleActive(member: Profile) {
    if (!supabase || member.withdrawn_at) return;
    setBusyId(member.id);
    setError(null);
    const nextActive = !member.is_active;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_active: nextActive })
      .eq("id", member.id);
    if (updateError) {
      setError(updateError.message);
    } else {
      setUsers((prev) =>
        prev.map((item) => (item.id === member.id ? { ...item, is_active: nextActive } : item)),
      );
    }
    setBusyId(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <SiteHeader />
        <p className="px-6 text-sm text-muted">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-paper text-ink antialiased">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-6 pb-24">
          <h1 className="font-display text-3xl font-medium">Admin only</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Sign in with the administrator email to see members.
          </p>
          <Link to="/login" className="mt-6 inline-block rounded-full bg-clay px-5 py-2.5 text-sm font-medium text-panel">
            Sign in
          </Link>
        </main>
      </div>
    );
  }

  const onlineCount = users.filter(isUserOnline).length;
  const withdrawnCount = users.filter((member) => member.withdrawn_at).length;

  return (
    <div className="min-h-screen bg-paper text-ink antialiased">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">Admin · Members</p>
          <h1 className="mt-5 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Who’s at the table.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            {users.length} members · {onlineCount} online · {withdrawnCount} withdrawn
          </p>
        </section>

        <div className="mt-8">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, country, or IP"
            className="w-full max-w-md rounded-2xl border border-line bg-panel/70 px-4 py-3 text-sm outline-none focus:border-clay/50 focus:ring-2 focus:ring-clay/20"
          />
        </div>

        {error && (
          <p className="mt-4 rounded-2xl bg-clay/10 px-4 py-3 text-xs font-medium text-clay">{error}</p>
        )}

        <section className="mt-8 max-w-2xl rounded-[20px] bg-panel/70 p-6 ring-1 ring-black/5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">Admin · Cloudinary</p>
          <h2 className="mt-3 font-display text-xl font-medium">Folder upload settings</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Use an unsigned Cloudinary upload preset. These browser settings are used by the gallery download button.
          </p>
          <div className="mt-5 grid gap-3">
            <input
              value={cloudinary.cloudName}
              onChange={(event) => setCloudinary((current) => ({ ...current, cloudName: event.target.value }))}
              placeholder="Cloud name"
              className="rounded-2xl border border-line bg-paper/60 px-4 py-3 text-sm outline-none focus:border-clay/50 focus:ring-2 focus:ring-clay/20"
            />
            <input
              value={cloudinary.uploadPreset}
              onChange={(event) => setCloudinary((current) => ({ ...current, uploadPreset: event.target.value }))}
              placeholder="Unsigned upload preset"
              className="rounded-2xl border border-line bg-paper/60 px-4 py-3 text-sm outline-none focus:border-clay/50 focus:ring-2 focus:ring-clay/20"
            />
            <input
              value={cloudinary.folder}
              onChange={(event) => setCloudinary((current) => ({ ...current, folder: event.target.value }))}
              placeholder="Destination folder, e.g. users/alice"
              className="rounded-2xl border border-line bg-paper/60 px-4 py-3 text-sm outline-none focus:border-clay/50 focus:ring-2 focus:ring-clay/20"
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void saveCloudinarySettings(cloudinary)
                  .then(() => setCloudinaryMessage("Cloudinary settings saved."))
                  .catch((saveError) => setError(saveError instanceof Error ? saveError.message : "Could not save Cloudinary settings."));
              }}
              className="rounded-full bg-clay px-5 py-2.5 text-sm font-medium text-panel"
            >
              Save Cloudinary settings
            </button>
            {cloudinaryMessage && <span className="text-xs text-sage">{cloudinaryMessage}</span>}
          </div>
        </section>

        <section className="mt-8 max-w-3xl rounded-[20px] bg-panel/70 p-6 ring-1 ring-black/5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">Admin · Browser extensions</p>
              <h2 className="mt-3 font-display text-xl font-medium">Monitored extension report</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                A normal website cannot enumerate installed extensions. Detected means an extension explicitly answered the Hearth presence request; Unknown means the browser or extension did not expose that information.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void checkExtensions()}
              disabled={extensionsLoading}
              className="rounded-full bg-clay px-4 py-2.5 text-sm font-medium text-panel disabled:opacity-50"
            >
              {extensionsLoading ? "Checking…" : "Check extensions"}
            </button>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {extensionResults.length === 0 ? (
              <p className="text-sm text-muted">No check has been run.</p>
            ) : (
              extensionResults.map((extension) => (
                <div key={extension.id} className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-xs">
                  <code>{extension.id}</code>
                  <span className={extension.status === "detected" ? "font-medium text-sage" : "text-muted"}>
                    {extension.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="mt-6 overflow-x-auto rounded-[20px] bg-panel/70 ring-1 ring-black/5">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">BROWSER</th>
                <th className="px-4 py-3 font-medium">DEVICE</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Downloads</th>
                <th className="px-4 py-3 font-medium">Images</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-muted">
                    No members yet. Create an account to appear here.
                  </td>
                </tr>
              ) : (
                filtered.map((member) => {
                  const online = isUserOnline(member);
                  const downloads = member.downloads_count ?? 0;
                  return (
                    <tr key={member.id} className="border-b border-line/70 last:border-0">
                      <td className="px-4 py-4">
                        <p className="font-medium">{member.full_name || "Unnamed"}</p>
                        <p className="text-xs text-muted">{member.email}</p>
                      </td>
                      <td className="px-4 py-4">{member.country || "—"}</td>
                      <td className="px-4 py-4 font-mono text-xs">{member.last_ip || "—"}</td>
                      <td className="px-4 py-4 font-mono text-xs">{member.browser || "—"}</td>
                      <td className="px-4 py-4 font-mono text-xs">{member.device || "—"}</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          disabled={busyId === member.id || Boolean(member.withdrawn_at)}
                          onClick={() => void toggleActive(member)}
                          className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${
                            member.is_active ? "bg-sage/20 text-sage" : "bg-clay/15 text-clay"
                          }`}
                        >
                          {member.withdrawn_at
                            ? "Closed"
                            : member.is_active
                              ? "Active"
                              : "Deactivated"}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-clay">{downloads}</p>
                        <p className="text-xs text-muted">
                          {downloads === 1 ? "download" : "downloads"}
                        </p>
                      </td>
                      <td className="px-4 py-4">{member.generations_count}</td>
                      <td className="px-4 py-4 text-muted">
                        {format(new Date(member.created_at), "d MMM yyyy")}
                      </td>
                      <td className="px-4 py-4 text-muted">{member.is_admin ? "Admin" : "Member"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
