import { createFileRoute } from "@tanstack/react-router";

import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create an account — Hearth studio" },
      { name: "description", content: "Open a Hearth account to keep your generated images together in one calm gallery." },
      { property: "og:title", content: "Create an account — Hearth studio" },
      { property: "og:description", content: "Open a Hearth account to keep your generated images together in one calm gallery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-paper text-ink antialiased">
      <SiteHeader />
      <main className="pt-6">
        <AuthForm mode="register" />
      </main>
    </div>
  ),
});
