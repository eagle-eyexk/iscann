import type { ContentChecks, TechFingerprint, RobotsInfo, Finding } from "./types";
import { fetchPublicUrl } from "./fetch";

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const SCRIPT_RE = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
const HTTP_FORM_RE = /<form\b[^>]*\baction=["']http:\/\/[^"']+["']/gi;
const COMMENT_RE = /<!--[\s\S]*?-->/g;
const TITLE_RE = /<title[^>]*>([^<]*)<\/title>/i;
const META_GENERATOR_RE = /<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i;

export function analyzeContent(html: string, baseUrl: string): {
  content: ContentChecks;
  findings: Finding[];
} {
  const findings: Finding[] = [];
  const externalScripts: string[] = [];
  let m: RegExpExecArray | null;
  SCRIPT_RE.lastIndex = 0;
  while ((m = SCRIPT_RE.exec(html))) {
    const src = m[1] ?? "";
    if (/^https?:\/\//i.test(src)) {
      try {
        const u = new URL(src);
        const base = new URL(baseUrl);
        if (u.host !== base.host) externalScripts.push(src);
      } catch {
        // ignore
      }
    }
  }

  const isHttps = baseUrl.startsWith("https://");
  let mixed = false;
  if (isHttps) {
    if (/<(?:script|img|iframe|link)[^>]+(?:src|href)=["']http:\/\//i.test(html)) {
      mixed = true;
    }
  }

  const formsWithoutHttps = (html.match(HTTP_FORM_RE) ?? []).length;
  const emailMatches: string[] = html.match(EMAIL_RE) ?? [];
  const emailsFound = Array.from(new Set(emailMatches)).slice(0, 25);
  const commentMatches: string[] = html.match(COMMENT_RE) ?? [];
  const commentsLeaked = commentMatches.filter((c: string) => c.length > 30).length;

  const titleMatch = html.match(TITLE_RE);
  const title = titleMatch ? titleMatch[1].trim() : null;

  const content: ContentChecks = {
    title,
    hasMixedContent: mixed,
    externalScripts: Array.from(new Set(externalScripts)).slice(0, 50),
    formsWithoutHttps,
    emailsFound,
    commentsLeaked,
  };

  if (mixed) {
    findings.push({
      id: "content-mixed",
      title: "Mixed content detected",
      category: "Content",
      severity: "high",
      description:
        "The HTTPS page references resources over plain HTTP. Browsers may block them and the page is no longer fully secure.",
      recommendation:
        "Update all resource URLs to https:// or use protocol-relative URLs and verify all assets are TLS-served.",
    });
  }
  if (formsWithoutHttps > 0) {
    findings.push({
      id: "content-form-http",
      title: `${formsWithoutHttps} form(s) submit over HTTP`,
      category: "Content",
      severity: "high",
      description:
        "Form data sent over plain HTTP can be read by anyone on the network path.",
      recommendation: "Change form action URLs to use HTTPS.",
    });
  }
  if (commentsLeaked > 5) {
    findings.push({
      id: "content-comments",
      title: "Many HTML comments found",
      category: "Content",
      severity: "info",
      description: `Found ${commentsLeaked} substantial HTML comments. They sometimes leak debug info, internal URLs, or TODOs.`,
      recommendation: "Strip HTML comments at build time for production.",
    });
  }
  if (emailsFound.length > 0) {
    findings.push({
      id: "content-emails",
      title: "Email addresses exposed in HTML",
      category: "Content",
      severity: "low",
      description: `${emailsFound.length} email address(es) appear directly in the HTML and may be harvested by spammers.`,
      evidence: emailsFound.slice(0, 5).join(", "),
      recommendation: "Obfuscate emails or replace with a contact form.",
    });
  }

  return { content, findings };
}

export function fingerprintTech(
  html: string,
  rawHeaders: Record<string, string>,
): TechFingerprint {
  const server = rawHeaders["server"] ?? null;
  const poweredBy = rawHeaders["x-powered-by"] ?? null;
  let cms: string | null = null;
  let framework: string | null = null;
  const analytics: string[] = [];
  const libraries: string[] = [];
  let cdn: string | null = null;

  const generator = html.match(META_GENERATOR_RE)?.[1] ?? null;
  if (generator) {
    if (/wordpress/i.test(generator)) cms = "WordPress";
    else if (/drupal/i.test(generator)) cms = "Drupal";
    else if (/joomla/i.test(generator)) cms = "Joomla";
    else if (/ghost/i.test(generator)) cms = "Ghost";
    else if (/hugo/i.test(generator)) cms = "Hugo";
    else if (/jekyll/i.test(generator)) cms = "Jekyll";
    else if (/next\.js/i.test(generator)) framework = "Next.js";
    else if (/gatsby/i.test(generator)) framework = "Gatsby";
  }
  if (!cms && /wp-content\//i.test(html)) cms = "WordPress";
  if (!framework) {
    if (/__NEXT_DATA__/.test(html)) framework = "Next.js";
    else if (/data-reactroot|react-dom/i.test(html)) framework = "React";
    else if (/ng-version=/i.test(html)) framework = "Angular";
    else if (/__NUXT__/i.test(html)) framework = "Nuxt";
    else if (/svelte/i.test(html)) framework = "Svelte";
    else if (/data-vue-meta|vue\.js/i.test(html)) framework = "Vue";
  }

  if (/google-analytics\.com|googletagmanager\.com|gtag\(/i.test(html)) analytics.push("Google Analytics");
  if (/plausible\.io/i.test(html)) analytics.push("Plausible");
  if (/cdn\.segment\.com/i.test(html)) analytics.push("Segment");
  if (/static\.hotjar\.com/i.test(html)) analytics.push("Hotjar");
  if (/cdn\.amplitude\.com/i.test(html)) analytics.push("Amplitude");
  if (/posthog\.com/i.test(html)) analytics.push("PostHog");

  if (/jquery(?:-|\.)/i.test(html)) libraries.push("jQuery");
  if (/bootstrap(?:-|\.)/i.test(html)) libraries.push("Bootstrap");
  if (/tailwindcss/i.test(html)) libraries.push("Tailwind CSS");
  if (/stripe\.com\/v3/i.test(html)) libraries.push("Stripe.js");

  const cfRay = rawHeaders["cf-ray"];
  const xVercel = rawHeaders["x-vercel-id"] ?? rawHeaders["server-timing"];
  const xAmz = rawHeaders["x-amz-cf-id"];
  const fastly = rawHeaders["x-served-by"];
  if (cfRay) cdn = "Cloudflare";
  else if (typeof xVercel === "string" && /vercel/i.test(xVercel)) cdn = "Vercel";
  else if (xAmz) cdn = "AWS CloudFront";
  else if (typeof fastly === "string" && /cache-/i.test(fastly)) cdn = "Fastly";

  return {
    server,
    poweredBy,
    framework,
    cms,
    analytics: Array.from(new Set(analytics)),
    libraries: Array.from(new Set(libraries)),
    cdn,
  };
}

export async function checkRobots(baseUrl: string): Promise<{
  robots: RobotsInfo;
  findings: Finding[];
}> {
  const findings: Finding[] = [];
  const root = baseUrl.replace(/\/$/, "");
  let present = false;
  let body = "";
  try {
    const res = await fetchPublicUrl(`${root}/robots.txt`, 5000, 256 * 1024);
    present = res.statusCode === 200;
    if (present) body = res.body;
  } catch {
    // ignore
  }

  const sitemapUrls = present
    ? Array.from(body.matchAll(/^\s*Sitemap:\s*(\S+)/gim)).map((m) => m[1])
    : [];

  const SENSITIVE = ["admin", "wp-admin", "backup", "private", "secret", "config", ".git", "phpmyadmin"];
  const sensitiveDisallows: string[] = [];
  if (present) {
    const lines = body.split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*Disallow:\s*(\S+)/i);
      if (m) {
        const path = m[1] ?? "";
        if (SENSITIVE.some((s) => path.toLowerCase().includes(s))) {
          sensitiveDisallows.push(path);
        }
      }
    }
  }

  if (present && sensitiveDisallows.length > 0) {
    findings.push({
      id: "robots-sensitive",
      title: "robots.txt advertises sensitive paths",
      category: "Content",
      severity: "low",
      description:
        "robots.txt is publicly readable. Disallowing sensitive paths there tells attackers exactly what to look at.",
      evidence: sensitiveDisallows.slice(0, 5).join(", "),
      recommendation:
        "Do not rely on robots.txt to hide sensitive areas. Protect them with auth and remove the entries.",
    });
  }
  if (!present) {
    findings.push({
      id: "robots-missing",
      title: "robots.txt missing",
      category: "Content",
      severity: "info",
      description: "No robots.txt found. This is informational; not a security issue.",
      recommendation: "Add a robots.txt to control crawler behavior. Optional.",
    });
  }

  return {
    robots: { present, sensitiveDisallows, sitemapUrls },
    findings,
  };
}
