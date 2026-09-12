import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { GeoLocation } from "@/lib/geo";

async function lookupIp(ip: string): Promise<GeoLocation> {
  const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
  if (!response.ok) {
    throw new Error("Could not look up this IP address.");
  }
  const payload = (await response.json()) as {
    success?: boolean;
    country?: string;
    ip?: string;
    message?: string;
  };
  if (payload.success === false || !payload.country || !payload.ip) {
    throw new Error(payload.message || "Could not determine the country from this IP address.");
  }
  return { country: payload.country, ip: payload.ip };
}

export const lookupCountryForIp = createServerFn({ method: "POST" })
  .validator(z.object({ ip: z.string().min(3).max(64) }))
  .handler(async ({ data }): Promise<GeoLocation> => lookupIp(data.ip.trim()));
