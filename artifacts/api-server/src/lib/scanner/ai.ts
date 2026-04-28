import { anthropic } from "@workspace/integrations-anthropic-ai";
import type { Finding } from "./types";

interface ScanContext {
  url: string;
  host: string;
  score: number;
  grade: string;
  findings: Finding[];
}

export async function summarizeScanWithAi(ctx: ScanContext): Promise<{
  summary: string;
  remediation: string[];
}> {
  const fallback = buildFallback(ctx);
  try {
    const findingsForPrompt = ctx.findings.slice(0, 40).map((f) => ({
      title: f.title,
      severity: f.severity,
      category: f.category,
      description: f.description,
      recommendation: f.recommendation,
    }));

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system:
        "You are a senior security engineer writing a concise white-hat security report for a website owner. Be direct, calm, and specific. No marketing language.",
      messages: [
        {
          role: "user",
          content: `Site scanned: ${ctx.url} (host ${ctx.host})
Score: ${ctx.score}/100 (grade ${ctx.grade})
Findings (JSON):
${JSON.stringify(findingsForPrompt, null, 2)}

Return STRICT JSON with exactly this shape, no extra text, no code fences:
{
  "summary": "2-4 sentence executive summary of the security posture in plain language. Mention the most important risks. Avoid jargon.",
  "remediation": ["short actionable step", "..."]
}
Provide 5-8 prioritized remediation steps, ordered by impact (highest first). Each step <= 25 words.`,
        },
      ],
    });

    const block = message.content[0];
    const text = block && block.type === "text" ? block.text : "";
    const parsed = extractJson(text);
    if (parsed && typeof parsed.summary === "string" && Array.isArray(parsed.remediation)) {
      return {
        summary: parsed.summary,
        remediation: parsed.remediation
          .filter((s: unknown): s is string => typeof s === "string")
          .slice(0, 10),
      };
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function extractJson(text: string): { summary?: string; remediation?: unknown[] } | null {
  if (!text) return null;
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildFallback(ctx: ScanContext): { summary: string; remediation: string[] } {
  const counts = {
    critical: ctx.findings.filter((f) => f.severity === "critical").length,
    high: ctx.findings.filter((f) => f.severity === "high").length,
    medium: ctx.findings.filter((f) => f.severity === "medium").length,
    low: ctx.findings.filter((f) => f.severity === "low").length,
  };
  const summary =
    `Scanned ${ctx.host} and scored ${ctx.score}/100 (grade ${ctx.grade}). ` +
    `Found ${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, and ${counts.low} low-severity issues. ` +
    `Focus first on the critical and high findings — they have the highest impact on security posture.`;
  const ordered = [...ctx.findings].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  const remediation = ordered.slice(0, 6).map((f) => f.recommendation);
  return { summary, remediation };
}

function severityRank(s: string): number {
  return { critical: 5, high: 4, medium: 3, low: 2, info: 1 }[s as keyof object] ?? 0;
}
