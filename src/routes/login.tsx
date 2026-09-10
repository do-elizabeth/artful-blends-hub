import { createFileRoute } from "@tanstack/react-router";

import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Hearth studio" },
      { name: "description", content: "Sign in to your Hearth studio and pick up your image work where you left it." },
      { property: "og:title", content: "Sign in — Hearth studio" },
      { property: "og:description", content: "Sign in to your Hearth studio and pick up your image work where you left it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-paper text-ink antialiased">
      <SiteHeader />
      <main className="pt-6">
        <AuthForm mode="login" />
      </main>
    </div>
  ),
});
