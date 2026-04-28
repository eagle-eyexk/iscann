import type { Finding, Severity } from "./types";

const WEIGHT: Record<Severity, number> = {
  critical: 30,
  high: 15,
  medium: 7,
  low: 2,
  info: 0,
};

export function scoreFindings(findings: Finding[]): { score: number; grade: string } {
  let penalty = 0;
  for (const f of findings) penalty += WEIGHT[f.severity];
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const grade =
    score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
  return { score, grade };
}

export function countSeverities(findings: Finding[]): {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
} {
  return {
    critical: findings.filter((f) => f.severity === "critical").length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
    info: findings.filter((f) => f.severity === "info").length,
  };
}
