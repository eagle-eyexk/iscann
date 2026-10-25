import type { ExposedFile, Finding, Severity } from "./types";
import { fetchPublicUrl } from "./fetch";

interface Candidate {
  path: string;
  risk: Severity;
  title: string;
  description: string;
  recommendation: string;
}

const CANDIDATES: Candidate[] = [
  {
    path: "/.env",
    risk: "critical",
    title: "Exposed .env file",
    description: ".env files commonly contain database credentials, API keys, and secrets.",
    recommendation: "Remove the file from the web root and rotate all secrets it contained.",
  },
  {
    path: "/.git/config",
    risk: "critical",
    title: "Exposed .git directory",
    description: "An exposed .git folder can let attackers download the full repository, including secrets in history.",
    recommendation: "Block access to /.git/ at the web server (return 404) and never deploy the .git folder.",
  },
  {
    path: "/.git/HEAD",
    risk: "critical",
    title: "Exposed .git/HEAD",
    description: "The .git directory is reachable, exposing source code and history.",
    recommendation: "Block /.git/* at the proxy or web server.",
  },
  {
    path: "/.aws/credentials",
    risk: "critical",
    title: "Exposed AWS credentials file",
    description: "AWS credentials should never be reachable from the web.",
    recommendation: "Remove the file and rotate the IAM keys.",
  },
  {
    path: "/.svn/entries",
    risk: "high",
    title: "Exposed Subversion metadata",
    description: ".svn metadata can leak source code.",
    recommendation: "Block access to /.svn/* and remove from deployment.",
  },
  {
    path: "/.DS_Store",
    risk: "low",
    title: ".DS_Store file exposed",
    description: "macOS .DS_Store can leak file/directory names.",
    recommendation: "Remove .DS_Store from the deployment and add it to .gitignore.",
  },
  {
    path: "/wp-config.php.bak",
    risk: "critical",
    title: "WordPress config backup exposed",
    description: "Backup wp-config.php files often contain DB credentials.",
    recommendation: "Remove backup files from the web root.",
  },
  {
    path: "/config.json",
    risk: "high",
    title: "config.json reachable",
    description: "Generic config files often expose secrets or internal endpoints.",
    recommendation: "Verify the file should be public; if not, block access.",
  },
  {
    path: "/server-status",
    risk: "medium",
    title: "Apache server-status exposed",
    description: "server-status leaks internal request and worker info.",
    recommendation: "Restrict mod_status to localhost.",
  },
  {
    path: "/phpinfo.php",
    risk: "high",
    title: "phpinfo() page exposed",
    description: "phpinfo() leaks server, PHP, and environment details useful to attackers.",
    recommendation: "Delete the file. Never deploy phpinfo() to production.",
  },
  {
    path: "/.well-known/security.txt",
    risk: "info",
    title: "security.txt missing",
    description: "A security.txt file makes it easier for security researchers to report issues responsibly.",
    recommendation: 'Publish /.well-known/security.txt with at least a "Contact:" line.',
  },
  {
    path: "/admin",
    risk: "info",
    title: "/admin path responds",
    description: "An admin login page is reachable. Make sure it is properly protected.",
    recommendation: "Require strong auth, MFA, and rate limiting on admin endpoints.",
  },
];

const TIMEOUT_MS = 6000;

export async function probeExposedFiles(baseUrl: string): Promise<{
  files: ExposedFile[];
  findings: Finding[];
}> {
  const files: ExposedFile[] = [];
  const findings: Finding[] = [];
  const root = baseUrl.replace(/\/$/, "");

  await Promise.all(
    CANDIDATES.map(async (c) => {
      const url = `${root}${c.path}`;
      try {
        const res = await fetchPublicUrl(url, TIMEOUT_MS, 0, "HEAD");

        const len = Number(res.headers["content-length"] ?? "0");
        const ct = res.headers["content-type"] ?? null;
        const isHit =
          res.statusCode === 200 &&
          // For .well-known/security.txt: present is GOOD, so we want to report missing as info-level
          c.path !== "/.well-known/security.txt";

        if (c.path === "/.well-known/security.txt") {
          if (res.statusCode !== 200) {
            files.push({ path: c.path, status: res.statusCode, contentType: null, size: null, risk: c.risk });
            findings.push({
              id: `exposed-${c.path}`,
              title: c.title,
              category: "Exposure",
              severity: c.risk,
              description: c.description,
              evidence: `${url} -> ${res.statusCode}`,
              recommendation: c.recommendation,
            });
          }
          return;
        }

        if (isHit) {
          files.push({
            path: c.path,
            status: res.statusCode,
            contentType: ct,
            size: len > 0 ? len : null,
            risk: c.risk,
          });
          findings.push({
            id: `exposed-${c.path}`,
            title: c.title,
            category: "Exposure",
            severity: c.risk,
            description: c.description,
            evidence: `${url} returned 200 ${ct ?? ""}`.trim(),
            recommendation: c.recommendation,
          });
        }
      } catch {
        // Network errors mean it's not reachable — that's good. Ignore.
      }
    }),
  );

  return { files, findings };
}
