import { spawn } from "node:child_process";
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";
import type { InjectionCandidate, SqlmapResult, Finding } from "@workspace/api-zod";

const SQLMAP_BIN_CANDIDATES = [
  "/home/runner/workspace/.pythonlibs/bin/sqlmap",
  ".pythonlibs/bin/sqlmap",
  "sqlmap",
];

const PER_TARGET_TIMEOUT_MS = 90_000;
const MAX_TARGETS = 4;

export function locateSqlmap(): string | null {
  for (const p of SQLMAP_BIN_CANDIDATES) {
    if (p === "sqlmap") {
      // Trust PATH lookup via spawn — handled separately
      continue;
    }
    if (existsSync(p)) return p;
  }
  return null;
}

export async function runSqlmapBatch(
  candidates: InjectionCandidate[],
): Promise<{
  available: boolean;
  results: SqlmapResult[];
  findings: Finding[];
  notes: string[];
}> {
  const findings: Finding[] = [];
  const notes: string[] = [];
  const bin = locateSqlmap();
  if (!bin) {
    notes.push("sqlmap binary was not found on the server.");
    return { available: false, results: [], findings, notes };
  }

  const targets = candidates.slice(0, MAX_TARGETS);
  if (targets.length < candidates.length) {
    notes.push(`Tested first ${MAX_TARGETS} of ${candidates.length} candidates to keep scan time bounded.`);
  }

  const results: SqlmapResult[] = [];
  for (const c of targets) {
    const r = await runSqlmapOnce(bin, c.url);
    results.push(r);
    if (r.vulnerable) {
      findings.push({
        id: `sqli-${c.url}`,
        title: "Probable SQL injection detected by sqlmap",
        category: "Injection",
        severity: "critical",
        description: `sqlmap reports ${c.url} appears vulnerable to SQL injection${r.dbms ? ` (DBMS: ${r.dbms})` : ""}. Techniques: ${r.techniques.join(", ") || "unknown"}.`,
        evidence: r.evidence ?? undefined,
        recommendation:
          "Use parameterized queries / prepared statements for every user-controlled value. Validate inputs on the server, apply least-privilege DB credentials, and patch the vulnerable parameter immediately.",
      });
    }
  }

  return { available: true, results, findings, notes };
}

async function runSqlmapOnce(bin: string, url: string): Promise<SqlmapResult> {
  const startedAt = Date.now();
  let outputDir = "";
  try {
    outputDir = await mkdtemp(path.join(tmpdir(), "sqlmap-"));
  } catch {
    return {
      url,
      param: null,
      vulnerable: false,
      techniques: [],
      dbms: null,
      evidence: null,
      durationMs: Date.now() - startedAt,
      error: "Could not create scratch directory",
    };
  }

  const args = [
    "-u",
    url,
    "--batch",
    "--level=1",
    "--risk=1",
    "--random-agent",
    "--smart",
    "--threads=1",
    "--timeout=10",
    "--retries=1",
    "--disable-coloring",
    "--technique=BEUS",
    "--output-dir=" + outputDir,
    "-v",
    "1",
  ];

  const result: SqlmapResult = await new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let resolved = false;

    const proc = spawn(bin, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
    });

    const killTimer = setTimeout(() => {
      if (!resolved) {
        try {
          proc.kill("SIGKILL");
        } catch {
          // ignore
        }
        resolved = true;
        resolve(parseSqlmap(url, stdout, stderr, true));
      }
    }, PER_TARGET_TIMEOUT_MS);

    proc.stdout.on("data", (d) => {
      stdout += d.toString();
      if (stdout.length > 200_000) stdout = stdout.slice(-200_000);
    });
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
      if (stderr.length > 50_000) stderr = stderr.slice(-50_000);
    });
    proc.on("error", (err) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(killTimer);
      resolve({
        url,
        param: null,
        vulnerable: false,
        techniques: [],
        dbms: null,
        evidence: null,
        durationMs: Date.now() - startedAt,
        error: err.message,
      });
    });
    proc.on("close", () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(killTimer);
      resolve(parseSqlmap(url, stdout, stderr, false));
    });
  });

  result.durationMs = Date.now() - startedAt;

  // sqlmap may have written a structured log; try to enrich
  try {
    const enriched = await enrichFromSqlmapLog(outputDir, result);
    if (enriched) {
      result.vulnerable = result.vulnerable || enriched.vulnerable;
      if (enriched.techniques.length) result.techniques = enriched.techniques;
      if (enriched.dbms) result.dbms = enriched.dbms;
      if (enriched.param) result.param = enriched.param;
    }
  } catch {
    // ignore
  }

  // Cleanup scratch dir
  try {
    await rm(outputDir, { recursive: true, force: true });
  } catch {
    // ignore
  }

  return result;
}

function parseSqlmap(
  url: string,
  stdout: string,
  _stderr: string,
  timedOut: boolean,
): SqlmapResult {
  const text = stdout;
  const vulnerable =
    /Parameter:.*\bis vulnerable\b/i.test(text) ||
    /the back-end DBMS is/i.test(text) ||
    /sqlmap identified the following injection point/i.test(text);
  const techniques: string[] = [];
  const techRe = /Type:\s*([A-Za-z0-9 +\-/_.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = techRe.exec(text))) {
    const t = (m[1] ?? "").trim();
    if (t && !techniques.includes(t)) techniques.push(t);
  }
  const dbmsMatch = text.match(/back-end DBMS:\s*([^\n\r]+)/i);
  const paramMatch = text.match(/Parameter:\s*([^\n\r]+?)\s*\(/i);

  let evidence: string | null = null;
  const idx = text.search(/sqlmap identified|Parameter:|the back-end DBMS/i);
  if (idx >= 0) {
    evidence = text.slice(idx, idx + 600).trim();
  } else if (timedOut) {
    evidence = "sqlmap exceeded the per-target time budget.";
  }

  return {
    url,
    param: paramMatch ? paramMatch[1].trim() : null,
    vulnerable,
    techniques,
    dbms: dbmsMatch ? dbmsMatch[1].trim() : null,
    evidence,
    durationMs: 0,
    error: timedOut ? "Timed out" : null,
  };
}

async function enrichFromSqlmapLog(
  outputDir: string,
  current: SqlmapResult,
): Promise<{ vulnerable: boolean; techniques: string[]; dbms: string | null; param: string | null } | null> {
  try {
    const entries = await readdir(outputDir);
    for (const entry of entries) {
      const sub = path.join(outputDir, entry);
      const candidates = ["log", "session.sqlite", "target.txt"];
      for (const c of candidates) {
        const p = path.join(sub, c);
        if (existsSync(p) && c === "log") {
          const txt = await readFile(p, "utf-8").catch(() => "");
          if (!txt) continue;
          const vulnerable =
            current.vulnerable || /is vulnerable|injection point/i.test(txt);
          const techniques: string[] = [];
          const techRe = /Type:\s*([A-Za-z0-9 +\-/_.]+)/g;
          let m: RegExpExecArray | null;
          while ((m = techRe.exec(txt))) {
            const t = (m[1] ?? "").trim();
            if (t && !techniques.includes(t)) techniques.push(t);
          }
          const dbms = txt.match(/back-end DBMS:\s*([^\n\r]+)/i)?.[1]?.trim() ?? null;
          const param = txt.match(/Parameter:\s*([^\n\r]+?)\s*\(/i)?.[1]?.trim() ?? null;
          return { vulnerable, techniques, dbms, param };
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}
