import type {
  Finding,
  HeaderCheck,
  CookieInfo,
  TlsInfo,
  DnsInfo,
  ExposedFile,
  TechFingerprint,
  ContentChecks,
  RobotsInfo,
  Severity,
} from "@workspace/api-zod";

export type {
  Finding,
  HeaderCheck,
  CookieInfo,
  TlsInfo,
  DnsInfo,
  ExposedFile,
  TechFingerprint,
  ContentChecks,
  RobotsInfo,
  Severity,
};

export interface RawScanData {
  url: string;
  finalUrl: string;
  host: string;
  statusCode: number;
  redirectChain: string[];
  rawHeaders: Record<string, string>;
  bodySnippet: string;
  bodyFull: string;
  headers: HeaderCheck[];
  cookies: CookieInfo[];
  tls: TlsInfo;
  dns: DnsInfo;
  tech: TechFingerprint;
  exposedFiles: ExposedFile[];
  content: ContentChecks;
  robots: RobotsInfo;
  findings: Finding[];
}
