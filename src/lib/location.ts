import { parseClientInfo } from "@/lib/client-info";
import { lookupCountryForIp } from "@/lib/lookup-location";
import { lookupCountryFromIp, type GeoLocation } from "@/lib/geo";
import { supabase } from "@/lib/supabase";

export async function resolveCurrentLocation(): Promise<GeoLocation> {
  try {
    return await lookupCountryFromIp();
  } catch {
    // Fall through to a public-IP lookup, then resolve country on the server.
  }

  const response = await fetch("https://api64.ipify.org?format=json");
  if (!response.ok) {
    throw new Error("Could not determine country from IP.");
  }
  const data = (await response.json()) as { ip?: string };
  if (!data.ip) {
    throw new Error("Could not determine country from IP.");
  }
  return lookupCountryForIp({ data: { ip: data.ip } });
}

export async function saveCurrentLocation(userId: string) {
  if (!supabase) return null;

  try {
    const geo = await resolveCurrentLocation();
    const clientInfo = parseClientInfo();
    const { error } = await supabase
      .from("profiles")
      .update({
        country: geo.country,
        last_ip: geo.ip,
        browser: clientInfo.browser,
        device: clientInfo.device,
      })
      .eq("id", userId);
    if (error) throw error;
    return geo;
  } catch {
    return null;
  }
}
