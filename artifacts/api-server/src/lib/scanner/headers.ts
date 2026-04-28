import type { HeaderCheck, Finding, Severity } from "./types";

interface HeaderRule {
  name: string;
  severity: Severity;
  recommendation: string;
  validate?: (value: string) => { ok: boolean; reason?: string };
}

const RULES: HeaderRule[] = [
  {
    name: "strict-transport-security",
    severity: "high",
    recommendation:
      "Add Strict-Transport-Security with a long max-age (e.g. max-age=31536000; includeSubDomains) to force HTTPS.",
    validate: (v) => {
      const m = v.match(/max-age=(\d+)/i);
      if (!m) return { ok: false, reason: "Missing max-age directive." };
      const age = parseInt(m[1] ?? "0", 10);
      if (age < 15552000)
        return { ok: false, reason: `max-age=${age} is shorter than 6 months.` };
      return { ok: true };
    },
  },
  {
    name: "content-security-policy",
    severity: "high",
    recommendation:
      "Set a Content-Security-Policy that limits scripts and styles to trusted sources to mitigate XSS.",
  },
  {
    name: "x-frame-options",
    severity: "medium",
    recommendation:
      "Set X-Frame-Options: DENY (or use frame-ancestors in CSP) to prevent clickjacking.",
  },
  {
    name: "x-content-type-options",
    severity: "medium",
    recommendation: "Set X-Content-Type-Options: nosniff to prevent MIME sniffing.",
    validate: (v) =>
      v.toLowerCase().includes("nosniff")
        ? { ok: true }
        : { ok: false, reason: "Value should be 'nosniff'." },
  },
  {
    name: "referrer-policy",
    severity: "low",
    recommendation:
      "Set Referrer-Policy (e.g. strict-origin-when-cross-origin) to limit referrer leakage.",
  },
  {
    name: "permissions-policy",
    severity: "low",
    recommendation:
      "Set Permissions-Policy to restrict browser features (camera, microphone, geolocation, etc.).",
  },
  {
    name: "cross-origin-opener-policy",
    severity: "low",
    recommendation:
      "Set Cross-Origin-Opener-Policy: same-origin to isolate browsing context.",
  },
  {
    name: "cross-origin-resource-policy",
    severity: "low",
    recommendation:
      "Set Cross-Origin-Resource-Policy to control cross-origin embedding of resources.",
  },
  {
    name: "x-xss-protection",
    severity: "info",
    recommendation:
      "Optional. Modern browsers ignore this — rely on CSP instead.",
  },
];

const INFO_LEAK_HEADERS = ["server", "x-powered-by", "x-aspnet-version", "x-aspnetmvc-version"];

export function analyzeHeaders(rawHeaders: Record<string, string>): {
  checks: HeaderCheck[];
  findings: Finding[];
} {
  const checks: HeaderCheck[] = [];
  const findings: Finding[] = [];

  for (const rule of RULES) {
    const value = rawHeaders[rule.name];
    const present = value != null;
    let ok = present;
    let reason: string | undefined;
    if (present && rule.validate) {
      const res = rule.validate(value);
      ok = res.ok;
      reason = res.reason;
    }
    checks.push({
      name: rule.name,
      present,
      value: value ?? null,
      severity: rule.severity,
      recommendation: rule.recommendation,
    });
    if (!ok) {
      findings.push({
        id: `header-${rule.name}`,
        title: present
          ? `Weak ${rule.name} header`
          : `Missing ${rule.name} header`,
        category: "Headers",
        severity: rule.severity,
        description: present
          ? `The ${rule.name} header is present but does not meet best practice. ${reason ?? ""}`.trim()
          : `The ${rule.name} response header is not set. ${rule.recommendation}`,
        evidence: present ? `${rule.name}: ${value}` : undefined,
        recommendation: rule.recommendation,
      });
    }
  }

  for (const h of INFO_LEAK_HEADERS) {
    const v = rawHeaders[h];
    if (v) {
      findings.push({
        id: `leak-${h}`,
        title: `Information disclosure via ${h}`,
        category: "Headers",
        severity: "low",
        description: `The ${h} response header reveals software/version info that helps attackers fingerprint your stack.`,
        evidence: `${h}: ${v}`,
        recommendation: `Remove or redact the ${h} header from responses.`,
      });
    }
  }

  return { checks, findings };
}
