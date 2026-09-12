export type GeoLocation = {
  country: string;
  ip: string;
};

function isPrivateIp(ip: string) {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("127.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Lookup failed (${response.status})`);
  }
  return (await response.json()) as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

async function lookupViaIpwho(ip?: string): Promise<GeoLocation> {
  const data = await fetchJson(ip ? `https://ipwho.is/${encodeURIComponent(ip)}` : "https://ipwho.is/");
  if (data["success"] === false) {
    throw new Error("ipwho lookup failed");
  }
  const country = readString(data, ["country"]);
  const foundIp = readString(data, ["ip"]);
  if (!country || !foundIp) throw new Error("ipwho lookup incomplete");
  return { country, ip: foundIp };
}

async function lookupViaIpapi(): Promise<GeoLocation> {
  const data = await fetchJson("https://ipapi.co/json/");
  if (data["error"]) throw new Error("ipapi lookup failed");
  const country = readString(data, ["country_name"]);
  const ip = readString(data, ["ip"]);
  if (!country || !ip) throw new Error("ipapi lookup incomplete");
  return { country, ip };
}

async function lookupViaFreeIpApi(): Promise<GeoLocation> {
  const data = await fetchJson("https://freeipapi.com/api/json");
  const country = readString(data, ["countryName"]);
  const ip = readString(data, ["ipAddress"]);
  if (!country || !ip) throw new Error("freeipapi lookup incomplete");
  return { country, ip };
}

async function publicIp(): Promise<string> {
  const data = await fetchJson("https://api.ipify.org?format=json");
  const ip = readString(data, ["ip"]);
  if (!ip) throw new Error("Could not read public IP");
  return ip;
}

export async function lookupCountryFromIp(): Promise<GeoLocation> {
  const attempts = [
    async () => lookupViaIpwho(),
    async () => {
      const ip = await publicIp();
      return lookupViaIpwho(ip);
    },
    async () => lookupViaIpapi(),
    async () => lookupViaFreeIpApi(),
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (result.country && result.ip && !isPrivateIp(result.ip)) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Could not determine country from IP.");
}
