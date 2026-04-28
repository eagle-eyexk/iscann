import { promises as dns } from "node:dns";
import psl from "psl";
import type { DnsInfo, Finding } from "./types";

async function safe<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

export async function inspectDns(host: string): Promise<{
  dns: DnsInfo;
  findings: Finding[];
}> {
  const findings: Finding[] = [];
  const apex =
    (psl.parse(host) as { domain?: string | null }).domain ?? host;

  const [a, aaaa, mx, ns, txt, caa, dmarcTxt] = await Promise.all([
    safe(dns.resolve4(host)),
    safe(dns.resolve6(host)),
    safe(dns.resolveMx(host)),
    safe(dns.resolveNs(apex)),
    safe(dns.resolveTxt(apex)),
    safe(dns.resolveCaa(apex)),
    safe(dns.resolveTxt(`_dmarc.${apex}`)),
  ]);

  const flatTxt = (txt ?? []).map((arr) => arr.join(""));
  const flatDmarc = (dmarcTxt ?? []).map((arr) => arr.join(""));
  const hasSpf = flatTxt.some((t) => t.toLowerCase().startsWith("v=spf1"));
  const hasDmarc = flatDmarc.some((t) => t.toLowerCase().startsWith("v=dmarc1"));

  const result: DnsInfo = {
    a: a ?? [],
    aaaa: aaaa ?? [],
    mx: (mx ?? []).map((m) => `${m.priority} ${m.exchange}`),
    ns: ns ?? [],
    txt: flatTxt,
    caa: (caa ?? []).map((entry) => {
      const e = entry as unknown as Record<string, string | number>;
      const tag = (e.issue ?? e.issuewild ?? e.iodef ?? "?") as string;
      const kind = Object.keys(e).find((k) => k !== "critical" && k !== "flags") ?? "issue";
      return `${e.critical ?? e.flags ?? 0} ${kind} "${tag}"`;
    }),
    hasSpf,
    hasDmarc,
  };

  if ((mx ?? []).length > 0) {
    if (!hasSpf) {
      findings.push({
        id: "dns-no-spf",
        title: "Missing SPF record",
        category: "DNS",
        severity: "medium",
        description:
          "No SPF (v=spf1) TXT record found at the apex. This makes it easier for attackers to spoof email from your domain.",
        recommendation:
          'Publish an SPF record at the apex, e.g. "v=spf1 include:_spf.google.com -all".',
      });
    }
    if (!hasDmarc) {
      findings.push({
        id: "dns-no-dmarc",
        title: "Missing DMARC record",
        category: "DNS",
        severity: "medium",
        description:
          "No DMARC record at _dmarc subdomain. DMARC tells receivers what to do with messages that fail SPF/DKIM.",
        recommendation:
          'Add a DMARC TXT record at _dmarc.{domain}, e.g. "v=DMARC1; p=quarantine; rua=mailto:postmaster@yourdomain".',
      });
    }
  }

  if ((caa ?? []).length === 0) {
    findings.push({
      id: "dns-no-caa",
      title: "No CAA records",
      category: "DNS",
      severity: "low",
      description:
        "Without CAA records, any CA may issue a certificate for your domain.",
      recommendation:
        'Publish CAA records pinning the CAs you use, e.g. 0 issue "letsencrypt.org".',
    });
  }

  return { dns: result, findings };
}
