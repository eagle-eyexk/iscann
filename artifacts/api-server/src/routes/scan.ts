import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, scansTable } from "@workspace/db";
import {
  RunScanBody,
  RunScanResponse,
  GetScanParams,
  GetScanResponse,
  ListRecentScansResponse,
  GetScanStatsResponse,
} from "@workspace/api-zod";
import { runScanFor, normalizeUrl } from "../lib/scanner";
import type { Finding, Severity } from "../lib/scanner/types";
import type { ScanReport } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/scan", async (req, res): Promise<void> => {
  const parsed = RunScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let normalized: string;
  try {
    normalized = normalizeUrl(parsed.data.url);
  } catch {
    res.status(400).json({ error: "Invalid URL." });
    return;
  }

  req.log.info({ url: normalized }, "Starting scan");

  let report: ScanReport;
  let counts;
  try {
    const result = await runScanFor(normalized);
    counts = result._counts;
    const { _counts, ...rest } = result;
    report = rest;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "PRIVATE_HOST") {
      res.status(400).json({
        error: "This URL points to a private/internal host. Only public web addresses can be scanned.",
      });
      return;
    }
    req.log.error({ err }, "Scan failed");
    res
      .status(400)
      .json({ error: `Scan failed: ${(err as Error).message ?? "unknown error"}` });
    return;
  }

  // Persist
  const [row] = await db
    .insert(scansTable)
    .values({
      url: report.url,
      finalUrl: report.finalUrl,
      host: report.host,
      durationMs: report.durationMs,
      score: report.score,
      grade: report.grade,
      statusCode: report.statusCode,
      criticalCount: counts.critical,
      highCount: counts.high,
      mediumCount: counts.medium,
      lowCount: counts.low,
      infoCount: counts.info,
      report: report,
    })
    .returning();

  if (!row) {
    res.status(500).json({ error: "Failed to persist scan." });
    return;
  }

  const final: ScanReport = {
    ...report,
    id: row.id,
    scannedAt: row.scannedAt,
  };

  res.json(RunScanResponse.parse(final));
});

router.get("/scan/recent", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: scansTable.id,
      url: scansTable.url,
      host: scansTable.host,
      scannedAt: scansTable.scannedAt,
      score: scansTable.score,
      grade: scansTable.grade,
      criticalCount: scansTable.criticalCount,
      highCount: scansTable.highCount,
      mediumCount: scansTable.mediumCount,
      lowCount: scansTable.lowCount,
    })
    .from(scansTable)
    .orderBy(desc(scansTable.scannedAt))
    .limit(20);

  res.json(ListRecentScansResponse.parse(rows));
});

router.get("/scan/stats", async (_req, res): Promise<void> => {
  const totalRow = await db
    .select({ total: sql<number>`count(*)::int`, avg: sql<number>`coalesce(round(avg(${scansTable.score}))::int, 0)` })
    .from(scansTable);
  const total = totalRow[0]?.total ?? 0;
  const averageScore = totalRow[0]?.avg ?? 0;

  const gradeRows = await db
    .select({
      grade: scansTable.grade,
      count: sql<number>`count(*)::int`,
    })
    .from(scansTable)
    .groupBy(scansTable.grade);
  const gradeDistribution = ["A", "B", "C", "D", "F"].map((g) => ({
    grade: g,
    count: gradeRows.find((r) => r.grade === g)?.count ?? 0,
  }));

  const sevRow = await db
    .select({
      critical: sql<number>`coalesce(sum(${scansTable.criticalCount}), 0)::int`,
      high: sql<number>`coalesce(sum(${scansTable.highCount}), 0)::int`,
      medium: sql<number>`coalesce(sum(${scansTable.mediumCount}), 0)::int`,
      low: sql<number>`coalesce(sum(${scansTable.lowCount}), 0)::int`,
      info: sql<number>`coalesce(sum(${scansTable.infoCount}), 0)::int`,
    })
    .from(scansTable);
  const recentSeverityCounts = sevRow[0] ?? {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  const recentReports = await db
    .select({ report: scansTable.report })
    .from(scansTable)
    .orderBy(desc(scansTable.scannedAt))
    .limit(50);

  const issueAgg = new Map<
    string,
    { title: string; category: string; severity: Severity; count: number }
  >();
  for (const r of recentReports) {
    const rep = r.report as { findings?: Finding[] } | null;
    if (!rep?.findings) continue;
    for (const f of rep.findings) {
      const key = f.id;
      const existing = issueAgg.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        issueAgg.set(key, {
          title: f.title,
          category: f.category,
          severity: f.severity,
          count: 1,
        });
      }
    }
  }
  const sevRank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const topIssues = Array.from(issueAgg.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return (sevRank[a.severity] ?? 9) - (sevRank[b.severity] ?? 9);
    })
    .slice(0, 8);

  res.json(
    GetScanStatsResponse.parse({
      totalScans: total,
      averageScore,
      gradeDistribution,
      topIssues,
      recentSeverityCounts,
    }),
  );
});

router.get("/scan/:id", async (req, res): Promise<void> => {
  const params = GetScanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(scansTable)
    .where(eq(scansTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  const stored = row.report as ScanReport;
  const result: ScanReport = {
    ...stored,
    id: row.id,
    scannedAt: row.scannedAt,
  };
  res.json(GetScanResponse.parse(result));
});

export default router;
