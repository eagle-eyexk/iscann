import type { CookieInfo, Finding } from "./types";

export function analyzeCookies(setCookieHeaders: string[]): {
  cookies: CookieInfo[];
  findings: Finding[];
} {
  const cookies: CookieInfo[] = [];
  const findings: Finding[] = [];

  for (const raw of setCookieHeaders) {
    const parts = raw.split(";").map((s) => s.trim());
    const first = parts[0] ?? "";
    const eqIdx = first.indexOf("=");
    if (eqIdx <= 0) continue;
    const name = first.slice(0, eqIdx);
    const lower = parts.map((p) => p.toLowerCase());
    const secure = lower.includes("secure");
    const httpOnly = lower.includes("httponly");
    const sameSiteAttr = parts.find((p) => p.toLowerCase().startsWith("samesite="));
    const sameSite = sameSiteAttr ? sameSiteAttr.split("=")[1] ?? null : null;

    cookies.push({ name, secure, httpOnly, sameSite });

    if (!secure) {
      findings.push({
        id: `cookie-secure-${name}`,
        title: `Cookie "${name}" missing Secure flag`,
        category: "Cookies",
        severity: "medium",
        description: `The cookie "${name}" can be sent over plain HTTP, which exposes it to network sniffing.`,
        evidence: raw.slice(0, 200),
        recommendation: "Add the Secure attribute so the cookie is only sent over HTTPS.",
      });
    }
    if (!httpOnly) {
      findings.push({
        id: `cookie-httponly-${name}`,
        title: `Cookie "${name}" missing HttpOnly flag`,
        category: "Cookies",
        severity: "medium",
        description: `The cookie "${name}" is accessible from JavaScript, increasing impact of XSS.`,
        evidence: raw.slice(0, 200),
        recommendation: "Add the HttpOnly attribute for cookies not needed in JS (especially session cookies).",
      });
    }
    if (!sameSite) {
      findings.push({
        id: `cookie-samesite-${name}`,
        title: `Cookie "${name}" missing SameSite attribute`,
        category: "Cookies",
        severity: "low",
        description: `The cookie "${name}" has no SameSite policy, increasing CSRF risk.`,
        evidence: raw.slice(0, 200),
        recommendation: "Set SameSite=Lax or Strict (Strict for sensitive cookies).",
      });
    }
  }

  return { cookies, findings };
}

export function parseSetCookies(rawHeaderValue: string | string[] | undefined): string[] {
  if (!rawHeaderValue) return [];
  if (Array.isArray(rawHeaderValue)) return rawHeaderValue;
  // Set-Cookie commas inside Expires make a naive split unsafe; do best effort split.
  return rawHeaderValue.split(/, (?=[^ ;,]+=)/);
}
