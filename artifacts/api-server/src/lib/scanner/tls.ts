import { connect } from "node:tls";
import type { PeerCertificate } from "node:tls";
import type { TlsInfo, Finding } from "./types";

export async function inspectTls(host: string, port = 443): Promise<{
  tls: TlsInfo;
  findings: Finding[];
}> {
  const findings: Finding[] = [];
  const empty: TlsInfo = {
    protocol: null,
    cipher: null,
    issuer: null,
    subject: null,
    validFrom: null,
    validTo: null,
    daysUntilExpiry: null,
    san: [],
  };

  const result = await new Promise<TlsInfo>((resolve) => {
    const socket = connect(
      { host, port, servername: host, timeout: 8000, rejectUnauthorized: false },
      () => {
        try {
          const cert = socket.getPeerCertificate(true) as PeerCertificate & {
            subjectaltname?: string;
          };
          const cipher = socket.getCipher();
          const protocol = socket.getProtocol();
          const validFrom = cert?.valid_from ? new Date(cert.valid_from).toISOString() : null;
          const validTo = cert?.valid_to ? new Date(cert.valid_to).toISOString() : null;
          const daysUntilExpiry = validTo
            ? Math.round((new Date(validTo).getTime() - Date.now()) / 86400000)
            : null;
          const san = (cert?.subjectaltname ?? "")
            .split(",")
            .map((s) => s.trim().replace(/^DNS:/i, ""))
            .filter(Boolean);
          resolve({
            protocol,
            cipher: cipher?.name ?? null,
            issuer: cert?.issuer
              ? formatDN(cert.issuer as unknown as Record<string, string | string[]>)
              : null,
            subject: cert?.subject
              ? formatDN(cert.subject as unknown as Record<string, string | string[]>)
              : null,
            validFrom,
            validTo,
            daysUntilExpiry,
            san,
          });
        } catch {
          resolve(empty);
        } finally {
          socket.end();
        }
      },
    );
    socket.on("error", () => resolve(empty));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(empty);
    });
  });

  if (result.protocol) {
    if (/^TLSv1(\.0|\.1)?$/i.test(result.protocol)) {
      findings.push({
        id: "tls-old-protocol",
        title: `Outdated TLS protocol ${result.protocol}`,
        category: "TLS",
        severity: "high",
        description: `Server negotiated ${result.protocol}, which is deprecated and considered insecure.`,
        evidence: result.protocol,
        recommendation: "Disable TLS 1.0 and 1.1; require TLS 1.2 minimum, prefer TLS 1.3.",
      });
    }
  } else {
    findings.push({
      id: "tls-unreachable",
      title: "Could not establish TLS connection",
      category: "TLS",
      severity: "high",
      description: "The server could not be reached over HTTPS on port 443, or the TLS handshake failed.",
      recommendation: "Ensure HTTPS is enabled and the certificate is valid.",
    });
  }

  const daysLeft = result.daysUntilExpiry;
  if (daysLeft != null) {
    if (daysLeft < 0) {
      findings.push({
        id: "tls-expired",
        title: "TLS certificate has expired",
        category: "TLS",
        severity: "critical",
        description: `The certificate expired ${Math.abs(daysLeft)} day(s) ago.`,
        evidence: `valid_to: ${result.validTo}`,
        recommendation: "Renew the certificate immediately.",
      });
    } else if (daysLeft < 14) {
      findings.push({
        id: "tls-expires-soon",
        title: "TLS certificate expires soon",
        category: "TLS",
        severity: "high",
        description: `Certificate expires in ${daysLeft} day(s).`,
        evidence: `valid_to: ${result.validTo}`,
        recommendation: "Renew before expiry. Consider automating renewal with Let's Encrypt or an ACM equivalent.",
      });
    } else if (daysLeft < 30) {
      findings.push({
        id: "tls-expires-month",
        title: "TLS certificate expires within a month",
        category: "TLS",
        severity: "medium",
        description: `Certificate expires in ${daysLeft} day(s).`,
        evidence: `valid_to: ${result.validTo}`,
        recommendation: "Plan renewal soon to avoid downtime.",
      });
    }
  }

  return { tls: result, findings };
}

function formatDN(dn: Record<string, string | string[]>): string {
  return Object.entries(dn)
    .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(",") : v}`)
    .join(", ");
}
