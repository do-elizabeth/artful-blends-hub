const configured = (import.meta.env.VITE_ADMIN_EMAIL ?? "").trim().toLowerCase();

export function isConfiguredAdmin(email: string | null | undefined) {
  return Boolean(configured && email?.trim().toLowerCase() === configured);
}
