export type ParsedClientInfo = {
  browser: string;
  device: string;
};

export function parseClientInfo(userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""): ParsedClientInfo {
  return {
    browser: parseBrowser(userAgent),
    device: parseDevice(userAgent),
  };
}

function parseBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (/edg\//i.test(userAgent) || /edga\//i.test(userAgent) || /edgios\//i.test(userAgent)) return "Edge";
  if (/firefox\//i.test(userAgent)) return "Firefox";
  if (/opr\//i.test(userAgent) || /opera\//i.test(userAgent)) return "Opera";
  if (/samsungbrowser\//i.test(userAgent)) return "Samsung Internet";
  if (/crios\//i.test(userAgent) || /chrome\//i.test(userAgent)) return "Chrome";
  if (/version\/.+safari\//i.test(userAgent)) return "Safari";
  if (/safari\//i.test(userAgent)) return "Safari";

  return "Unknown";
}

function parseDevice(userAgent: string): string {
  if (/windows/i.test(userAgent)) return "Windows";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/macintosh|mac os x|mac/i.test(userAgent)) return "Mac";
  if (/android/i.test(userAgent)) return "Android";
  if (/linux/i.test(userAgent)) return "Linux";

  return "Unknown";
}
