import type { Finding } from "./types";

export interface FetchResult {
  finalUrl: string;
  statusCode: number;
  redirectChain: string[];
  rawHeaders: Record<string, string>;
  setCookieRaw: string[];
  body: string;
  findings: Finding[];
}

const MAX_REDIRECTS = 6;
const TIMEOUT_MS = 15000;
const MAX_BODY = 1024 * 1024; // 1MB

export async function fetchSite(initialUrl: string): Promise<FetchResult> {
  const findings: Finding[] = [];
  const redirectChain: string[] = [];
  let currentUrl = initialUrl;
  let lastResponse: Response | null = null;

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(currentUrl, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": "WhiteHatScanner/1.0 (ethical;passive)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: ctrl.signal,
    });
    clearTimeout(t);

    redirectChain.push(currentUrl);
    lastResponse = res;

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) break;
      const next = new URL(loc, currentUrl).toString();
      // Detect HTTP -> HTTPS upgrade as good (no finding)
      if (currentUrl.startsWith("http://") && next.startsWith("https://")) {
        // good — implicit
      }
      currentUrl = next;
      continue;
    }
    break;
  }

  if (!lastResponse) {
    throw new Error("No response received from server");
  }

  // If user gave http:// and it stayed http:// the whole way → finding
  if (initialUrl.startsWith("http://") && lastResponse.url && !redirectChain.some((u) => u.startsWith("https://"))) {
    findings.push({
      id: "http-no-https",
      title: "Site does not redirect HTTP to HTTPS",
      category: "TLS",
      severity: "high",
      description:
        "Visiting the site over plain HTTP did not redirect to HTTPS. Traffic and credentials can be intercepted.",
      recommendation:
        "Configure a permanent redirect (301) from http:// to https:// at the web server or proxy.",
    });
  }

  const rawHeaders: Record<string, string> = {};
  const setCookieRaw: string[] = [];
  lastResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      setCookieRaw.push(value);
    } else {
      rawHeaders[key.toLowerCase()] = value;
    }
  });
  // Try to access getSetCookie if available (Node 20+)
  const maybe = (lastResponse.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof maybe === "function") {
    const list = maybe.call(lastResponse.headers);
    if (Array.isArray(list)) {
      setCookieRaw.length = 0;
      setCookieRaw.push(...list);
    }
  }

  let body = "";
  try {
    const reader = lastResponse.body?.getReader();
    if (reader) {
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          total += value.length;
          if (total > MAX_BODY) {
            chunks.push(value.subarray(0, Math.max(0, MAX_BODY - (total - value.length))));
            break;
          }
          chunks.push(value);
        }
      }
      const merged = new Uint8Array(total > MAX_BODY ? MAX_BODY : total);
      let off = 0;
      for (const c of chunks) {
        merged.set(c, off);
        off += c.length;
      }
      body = new TextDecoder("utf-8", { fatal: false }).decode(merged);
    }
  } catch {
    body = "";
  }

  return {
    finalUrl: currentUrl,
    statusCode: lastResponse.status,
    redirectChain,
    rawHeaders,
    setCookieRaw,
    body,
    findings,
  };
}
