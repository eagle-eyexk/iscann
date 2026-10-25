import * as http from "node:http";
import * as https from "node:https";
import { isIP } from "node:net";
import psl from "psl";
import type { Finding } from "./types";
import { isPublicHost, resolvePublicAddress } from "./network";

export interface FetchResult {
  finalUrl: string;
  statusCode: number;
  redirectChain: string[];
  rawHeaders: Record<string, string>;
  setCookieRaw: string[];
  body: string;
  findings: Finding[];
}

export interface PublicFetchResult {
  statusCode: number;
  headers: Record<string, string>;
  setCookieRaw: string[];
  body: string;
}

const MAX_REDIRECTS = 6;
const TIMEOUT_MS = 15000;
const MAX_BODY = 1024 * 1024;

function assertSafePublicUrl(target: URL): void {
  if (
    !["http:", "https:"].includes(target.protocol) ||
    target.username ||
    target.password ||
    !isPublicHost(target.hostname)
  ) {
    throw Object.assign(new Error("Only public http(s) website addresses are supported."), {
      code: "PRIVATE_HOST",
    });
  }

  const expectedPort = target.protocol === "https:" ? "443" : "80";
  if (target.port && target.port !== expectedPort) {
    throw new Error("Only standard HTTP and HTTPS ports are supported.");
  }
}

function siteKey(host: string): string {
  const normalized = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (isIP(normalized)) return normalized;
  return psl.get(normalized) ?? normalized;
}

export async function fetchPublicUrl(
  input: string,
  timeoutMs = TIMEOUT_MS,
  maxBodyBytes = MAX_BODY,
  method: "GET" | "HEAD" = "GET",
): Promise<PublicFetchResult> {
  const target = new URL(input);
  assertSafePublicUrl(target);
  const address = await resolvePublicAddress(target.hostname);
  const hostname = target.hostname.replace(/^\[|\]$/g, "");
  const port = target.port
    ? Number(target.port)
    : target.protocol === "https:"
      ? 443
      : 80;
  const path = `${target.pathname}${target.search}`;
  const headers = {
    Host: target.host,
    "User-Agent": "iScann/1.0 (authorized passive assessment)",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "identity",
    Connection: "close",
  };

  return new Promise<PublicFetchResult>((resolve, reject) => {
    let settled = false;
    const finishWithError = (error: Error): void => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const onResponse = (response: http.IncomingMessage): void => {
      const responseHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(response.headers)) {
        if (key === "set-cookie" || value == null) continue;
        responseHeaders[key] = Array.isArray(value) ? value.join(", ") : String(value);
      }
      const setCookieRaw = response.headers["set-cookie"] ?? [];
      const chunks: Buffer[] = [];
      let size = 0;

      response.on("data", (chunk: Buffer | string) => {
        if (size >= maxBodyBytes) return;
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        const part = bytes.subarray(0, Math.max(0, maxBodyBytes - size));
        if (part.length > 0) {
          chunks.push(part);
          size += part.length;
        }
      });
      response.on("error", finishWithError);
      response.on("end", () => {
        if (settled) return;
        settled = true;
        resolve({
          statusCode: response.statusCode ?? 0,
          headers: responseHeaders,
          setCookieRaw,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
    };

    const options: https.RequestOptions = {
      hostname: address.address,
      family: address.family,
      port,
      method,
      path,
      headers,
      timeout: timeoutMs,
    };

    const request =
      target.protocol === "https:"
        ? https.request(
            {
              ...options,
              servername: isIP(hostname) ? undefined : hostname,
            },
            onResponse,
          )
        : http.request(options, onResponse);

    request.on("error", finishWithError);
    request.on("timeout", () => request.destroy(new Error("Target request timed out.")));
    request.end();
  });
}

export async function fetchSite(initialUrl: string): Promise<FetchResult> {
  const findings: Finding[] = [];
  const redirectChain: string[] = [];
  const initial = new URL(initialUrl);
  assertSafePublicUrl(initial);
  const authorizedSite = siteKey(initial.hostname);
  let currentUrl = initial.toString();
  let lastResponse: PublicFetchResult | null = null;

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const target = new URL(currentUrl);
    assertSafePublicUrl(target);
    if (siteKey(target.hostname) !== authorizedSite) {
      throw Object.assign(new Error("Redirect leaves the registered website's domain."), {
        code: "OUT_OF_SCOPE_REDIRECT",
      });
    }

    lastResponse = await fetchPublicUrl(currentUrl);
    redirectChain.push(currentUrl);

    if (lastResponse.statusCode >= 300 && lastResponse.statusCode < 400) {
      const location = lastResponse.headers.location;
      if (!location || i === MAX_REDIRECTS) break;
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }
    break;
  }

  if (!lastResponse) throw new Error("No response received from server.");

  if (initial.protocol === "http:" && new URL(currentUrl).protocol === "http:") {
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

  return {
    finalUrl: currentUrl,
    statusCode: lastResponse.statusCode,
    redirectChain,
    rawHeaders: lastResponse.headers,
    setCookieRaw: lastResponse.setCookieRaw,
    body: lastResponse.body,
    findings,
  };
}
