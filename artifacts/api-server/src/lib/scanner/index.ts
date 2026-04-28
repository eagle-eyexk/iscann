import psl from "psl";
import { fetchSite } from "./fetch";
import { analyzeHeaders } from "./headers";
import { analyzeCookies, parseSetCookies } from "./cookies";
import { inspectTls } from "./tls";
import { inspectDns } from "./dns";
import { probeExposedFiles } from "./exposed";
import { analyzeContent, fingerprintTech, checkRobots } from "./content";
import { scoreFindings } from "./scoring";
import { summarizeScanWithAi } from "./ai";
import type { Finding } from "./types";
import type { ScanReport } from "@workspace/api-zod";

export function normalizeUrl(input: string): string {
  let s = input.trim();
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s}`;
  }
  // throw if invalid
  const u = new URL(s);
  return u.toString();
}

export function isPublicHost(host: string): boolean {
  // Block obvious internal hosts
  const lower = host.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".local") || lower.endsWith(".localhost")) {
    return false;
  }
  if (/^(127\.|10\.|0\.)/.test(lower)) return false;
  if (/^192\.168\./.test(lower)) return false;
  if (/^169\.254\./.test(lower)) return false;
  // 172.16/12 -> 172.16-172.31
  const m = lower.match(/^172\.(\d{1,3})\./);
  if (m) {
    const octet = parseInt(m[1] ?? "0", 10);
    if (octet >= 16 && octet <= 31) return false;
  }
  if (/^::1$|^fc|^fd/.test(lower)) return false;
  return true;
}

export async function runScanFor(url: string): Promise<ScanReport & { _counts: ReturnType<typeof import("./scoring").countSeverities> }> {
  const startedAt = Date.now();
  const normalized = normalizeUrl(url);
  const u = new URL(normalized);
  const host = u.hostname;

  if (!isPublicHost(host)) {
    throw Object.assign(new Error("Refusing to scan non-public host."), { code: "PRIVATE_HOST" });
  }

  // Step 1: HTTP fetch
  const fetched = await fetchSite(normalized);
  const finalUrl = fetched.finalUrl;
  const finalU = new URL(finalUrl);
  const finalHost = finalU.hostname;

  const findings: Finding[] = [...fetched.findings];

  // Step 2: header analysis
  const { checks: headerChecks, findings: headerFindings } = analyzeHeaders(fetched.rawHeaders);
  findings.push(...headerFindings);

  // Step 3: cookies
  const cookieRaw = fetched.setCookieRaw.length
    ? fetched.setCookieRaw
    : parseSetCookies(fetched.rawHeaders["set-cookie"]);
  const { cookies, findings: cookieFindings } = analyzeCookies(cookieRaw);
  findings.push(...cookieFindings);

  // Step 4-7 in parallel: TLS, DNS, exposed files, robots
  const baseForProbes = `${finalU.protocol}//${finalU.host}`;
  const [tlsRes, dnsRes, exposedRes, robotsRes] = await Promise.all([
    inspectTls(finalHost),
    inspectDns(finalHost),
    probeExposedFiles(baseForProbes),
    checkRobots(baseForProbes),
  ]);
  findings.push(...tlsRes.findings, ...dnsRes.findings, ...exposedRes.findings, ...robotsRes.findings);

  // Step 8: content + tech fingerprint
  const { content, findings: contentFindings } = analyzeContent(fetched.body, finalUrl);
  const tech = fingerprintTech(fetched.body, fetched.rawHeaders);
  findings.push(...contentFindings);

  // Score
  const { score, grade } = scoreFindings(findings);

  // AI summary
  const ai = await summarizeScanWithAi({
    url: normalized,
    host: finalHost,
    score,
    grade,
    findings,
  });

  const durationMs = Date.now() - startedAt;
  const counts = (await import("./scoring")).countSeverities(findings);

  const report: ScanReport = {
    id: 0, // filled by caller after insert
    url: normalized,
    finalUrl,
    host: finalHost,
    scannedAt: new Date(),
    durationMs,
    score,
    grade,
    statusCode: fetched.statusCode,
    redirectChain: fetched.redirectChain,
    headers: headerChecks,
    rawHeaders: fetched.rawHeaders,
    cookies,
    tls: tlsRes.tls,
    dns: dnsRes.dns,
    tech,
    exposedFiles: exposedRes.files,
    content,
    robots: robotsRes.robots,
    findings: dedupeAndSort(findings),
    aiSummary: ai.summary,
    aiRemediation: ai.remediation,
  };

  return Object.assign(report, { _counts: counts });
}

function dedupeAndSort(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  const unique: Finding[] = [];
  for (const f of findings) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    unique.push(f);
  }
  const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  return unique.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
}

// Re-export for convenience
export { default as psl } from "psl";
