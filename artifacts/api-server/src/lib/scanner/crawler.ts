import type { InjectionCandidate } from "@workspace/api-zod";

const HREF_RE = /<a\b[^>]*\bhref=["']([^"']+)["']/gi;
const FORM_RE = /<form\b[^>]*\baction=["']([^"']+)["'][^>]*>([\s\S]*?)<\/form>/gi;
const INPUT_NAME_RE = /<input\b[^>]*\bname=["']([^"']+)["']/gi;

const MAX_PAGES = 8;
const MAX_CANDIDATES = 12;
const FETCH_TIMEOUT_MS = 8000;

const INTERESTING_PARAMS = new Set([
  "id",
  "uid",
  "user",
  "userid",
  "user_id",
  "page",
  "pid",
  "cat",
  "category",
  "cid",
  "item",
  "product",
  "p",
  "q",
  "search",
  "query",
  "year",
  "ref",
  "lang",
  "view",
  "type",
  "n",
  "no",
  "num",
  "order",
  "sort",
  "file",
  "name",
  "key",
  "token",
  "session",
]);

export async function crawlForCandidates(rootUrl: string): Promise<{
  crawledUrls: number;
  candidates: InjectionCandidate[];
}> {
  const root = new URL(rootUrl);
  const baseHost = root.host;

  const visited = new Set<string>();
  const queue: string[] = [stripFragment(rootUrl)];
  const candidates = new Map<string, InjectionCandidate>();

  while (queue.length > 0 && visited.size < MAX_PAGES && candidates.size < MAX_CANDIDATES) {
    const next = queue.shift();
    if (!next || visited.has(next)) continue;
    visited.add(next);

    let html = "";
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(next, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent": "WhiteHatScanner/1.0 (ethical;crawler)",
          Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        },
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const ctype = res.headers.get("content-type") ?? "";
      if (!/html|xml/i.test(ctype)) continue;
      html = await res.text();
    } catch {
      continue;
    }

    // Extract <a href> links
    let m: RegExpExecArray | null;
    HREF_RE.lastIndex = 0;
    while ((m = HREF_RE.exec(html))) {
      const href = m[1];
      if (!href) continue;
      let abs: URL;
      try {
        abs = new URL(href, next);
      } catch {
        continue;
      }
      if (!/^https?:$/i.test(abs.protocol)) continue;
      if (abs.host !== baseHost) continue;
      const clean = stripFragment(abs.toString());
      const candidate = makeCandidate(abs);
      if (candidate) {
        if (!candidates.has(candidate.url)) {
          candidates.set(candidate.url, candidate);
        }
      }
      if (
        !visited.has(clean) &&
        !queue.includes(clean) &&
        visited.size + queue.length < MAX_PAGES
      ) {
        queue.push(clean);
      }
    }

    // GET-style forms become candidates too
    FORM_RE.lastIndex = 0;
    while ((m = FORM_RE.exec(html))) {
      const action = m[1];
      const inner = m[2] ?? "";
      let abs: URL;
      try {
        abs = new URL(action ?? "", next);
      } catch {
        continue;
      }
      if (abs.host !== baseHost) continue;
      const inputs: string[] = [];
      let im: RegExpExecArray | null;
      INPUT_NAME_RE.lastIndex = 0;
      while ((im = INPUT_NAME_RE.exec(inner))) {
        if (im[1]) inputs.push(im[1]);
      }
      if (inputs.length > 0) {
        for (const name of inputs) abs.searchParams.set(name, "1");
        const cand = makeCandidate(abs);
        if (cand && !candidates.has(cand.url)) candidates.set(cand.url, cand);
      }
    }
  }

  return { crawledUrls: visited.size, candidates: Array.from(candidates.values()).slice(0, MAX_CANDIDATES) };
}

function makeCandidate(u: URL): InjectionCandidate | null {
  const path = u.pathname.toLowerCase();
  const params = Array.from(u.searchParams.keys());
  const isPhp = /\.php$/i.test(path);
  const isAspx = /\.aspx?$/i.test(path);
  const hasInteresting = params.some((p) => INTERESTING_PARAMS.has(p.toLowerCase()));

  if (params.length === 0) return null;
  if (!isPhp && !isAspx && !hasInteresting) return null;

  let kind = "id-param";
  if (isPhp) kind = "php";
  else if (isAspx) kind = "aspx";

  return {
    url: u.toString(),
    method: "GET",
    params,
    kind,
  };
}

function stripFragment(u: string): string {
  const i = u.indexOf("#");
  return i >= 0 ? u.slice(0, i) : u;
}
