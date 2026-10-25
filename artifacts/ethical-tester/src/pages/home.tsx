import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowDownRight, ArrowUpRight, Check, ChevronRight, Clock3, Globe2, History, LockKeyhole, RefreshCw, Search, Shield, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { useRunScan, useListRecentScans, useGetScanStats, getListRecentScansQueryKey, getGetScanStatsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const severityMeta = [
  { key: "critical", label: "Critical", color: "bg-[#b84645]" },
  { key: "high", label: "High", color: "bg-[#ce6947]" },
  { key: "medium", label: "Medium", color: "bg-[#bb8433]" },
  { key: "low", label: "Low", color: "bg-[#338a96]" },
  { key: "info", label: "Info", color: "bg-[#879aa2]" },
] as const;

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "We couldn’t complete that assessment. Please check the address and try again.";
}

export default function Home() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [urlError, setUrlError] = useState("");
  const scanMutation = useRunScan();
  const isScanning = scanMutation.isPending;

  const { data: recentScans, isLoading: recentLoading, isError: recentError, refetch: refetchRecent } = useListRecentScans({
    query: { queryKey: getListRecentScansQueryKey() },
  });
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useGetScanStats({
    query: { queryKey: getGetScanStatsQueryKey() },
  });

  useEffect(() => {
    if (!isScanning) {
      setElapsedSeconds(0);
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [isScanning]);

  async function submitScan() {
    setUrlError("");
    let normalized = url.trim();
    if (!normalized) {
      setUrlError("Enter a website address to begin.");
      return;
    }
    if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;
    try {
      const parsed = new URL(normalized);
      if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname.includes(".")) throw new Error();
      normalized = parsed.toString();
    } catch {
      setUrlError("Enter a valid website address, such as example.com.");
      return;
    }

    try {
      const report = await scanMutation.mutateAsync({ data: { url: normalized } });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListRecentScansQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetScanStatsQueryKey() }),
      ]);
      setLocation(`/scan/${report.id}`);
    } catch {
      // The mutation error is rendered below with a retry action.
    }
  }

  function handleScan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitScan();
  }

  const severityCounts = stats?.recentSeverityCounts;
  const totalRecentFindings = severityCounts ? Object.values(severityCounts).reduce((sum, count) => sum + count, 0) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-7 sm:pt-12">
      <section className="relative isolate overflow-hidden rounded-[30px] border border-[#d5e8e3] bg-[#eaf5f2] px-5 py-8 shadow-[0_16px_44px_rgba(37,99,103,.07)] sm:px-10 sm:py-12 lg:px-14 lg:py-14">
        <div className="soft-grid absolute inset-0 -z-10 opacity-60" />
        <div className="absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full bg-[#d6eeea] blur-[1px]" />
        <div className="absolute -bottom-28 right-[24%] -z-10 h-64 w-64 rounded-full border border-[#c5e1dc] opacity-75" />
        <div className="grid items-center gap-10 lg:grid-cols-[1.04fr_.96fr]">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#c8e2dc] bg-white/75 px-3.5 py-2 text-xs font-bold tracking-wide text-[#326c66]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#dff1ec]"><ShieldCheck className="h-3.5 w-3.5" /></span>
              YOUR WEBSITE SECURITY, IN FOCUS
            </div>
            <h1 className="text-balance max-w-xl text-[2.6rem] font-extrabold leading-[1.06] tracking-[-.055em] text-[#183e4b] sm:text-6xl">
              A steadier way to see your site’s security.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-[#52717a] sm:text-lg">
              Check the security signals your website shares with the world. Clear findings, practical next steps, no intrusive probes.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium text-[#436872]">
              <span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-[#348075]" />Passive checks only</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#348075]" />Plain-language guidance</span>
            </div>
          </div>

          <div className="surface-card relative rounded-[24px] p-5 sm:p-7">
            {isScanning ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center" role="status" aria-live="polite" data-testid="status-scan-pending">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#e1f3ef] text-primary">
                  <Activity className="h-7 w-7 animate-pulse" />
                </div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#54817d]">Assessment in progress</p>
                <h2 className="mt-2 text-2xl font-bold text-[#1c4551]">Checking the available signals</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Running the available passive checks… Findings will appear when the request completes.</p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#f1f7f6] px-3 py-1.5 text-xs font-semibold text-[#4a7078]">
                  <Clock3 className="h-3.5 w-3.5" /> Elapsed {elapsedSeconds}s
                </div>
                <div className="mt-6 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[#e4eeec]">
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
                </div>
              </div>
            ) : (
              <>
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.15em] text-[#528079]">Start a site check</p>
                    <h2 className="mt-1 text-[1.65rem] font-bold tracking-tight text-[#1b414d]">What should we review?</h2>
                  </div>
                  <span className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-[#edf6f3] text-primary sm:flex"><Globe2 className="h-5 w-5" /></span>
                </div>
                <form onSubmit={handleScan} className="space-y-4" noValidate>
                  <label htmlFor="website-url" className="block text-sm font-semibold text-[#345963]">Website address</label>
                  <div className={`flex min-h-14 items-center rounded-xl border bg-white px-4 shadow-sm transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 ${urlError ? "border-destructive" : "border-[#d4e2df]"}`}>
                    <Globe2 className="mr-3 h-5 w-5 shrink-0 text-[#729297]" aria-hidden="true" />
                    <input
                      id="website-url"
                      data-testid="input-website-url"
                      className="h-full min-h-14 w-full bg-transparent text-base text-[#244a55] outline-none placeholder:text-[#91a6aa]"
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      placeholder="yourwebsite.com"
                      value={url}
                      onChange={(event) => { setUrl(event.target.value); setUrlError(""); }}
                      aria-invalid={!!urlError}
                      aria-describedby={urlError ? "url-error" : "url-hint"}
                    />
                  </div>
                  {urlError && <p id="url-error" className="text-sm font-medium text-destructive" role="alert" data-testid="text-url-error">{urlError}</p>}
                  {!urlError && <p id="url-hint" className="text-xs text-muted-foreground">Include a domain you own or are authorized to assess.</p>}
                  <Button type="submit" size="lg" disabled={!url.trim() || isScanning} data-testid="button-start-scan" className="h-12 w-full rounded-xl bg-[#176b7c] text-[15px] font-bold shadow-[0_7px_16px_rgba(23,107,124,.16)] hover:bg-[#105b6a]">
                    <Search className="mr-2 h-4 w-4" /> Review website
                    <ArrowDownRight className="ml-auto h-4 w-4 rotate-[-45deg]" />
                  </Button>
                </form>
                {scanMutation.isError && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#efcfbf] bg-[#fff7f2] p-3.5 text-sm text-[#7e4b3d]" role="alert" data-testid="status-scan-error">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">Assessment couldn’t be completed</p>
                      <p className="mt-1 break-words text-xs leading-5">{getErrorMessage(scanMutation.error)}</p>
                    </div>
                    <Button variant="ghost" size="sm" type="button" onClick={() => void submitScan()} data-testid="button-retry-scan" className="shrink-0 text-[#785046]">
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
                    </Button>
                  </div>
                )}
                <div className="mt-5 flex items-start gap-2.5 border-t border-[#e7efed] pt-4 text-xs leading-5 text-[#627d82]">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#428078]" />
                  <p>Only run checks on websites you own or have explicit permission to review. This assessment uses passive checks only.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="workspace-overview">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#688b8b]">Workspace overview</p>
            <h2 id="workspace-overview" className="mt-1 text-2xl font-bold text-[#1c414d]">A clearer picture, over time</h2>
          </div>
          <span className="hidden items-center gap-1.5 text-xs font-medium text-[#6b858a] sm:flex"><Activity className="h-4 w-4 text-primary" />Based on completed assessments</span>
        </div>

        {statsLoading ? (
          <div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-32 rounded-2xl" /></div>
        ) : statsError ? (
          <div className="surface-card flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5" data-testid="status-stats-error">
            <div className="flex items-center gap-3 text-sm text-muted-foreground"><TriangleAlert className="h-5 w-5 text-[#be744d]" />Workspace stats couldn’t be loaded.</div>
            <Button variant="outline" size="sm" onClick={() => void refetchStats()} data-testid="button-retry-stats"><RefreshCw className="mr-2 h-4 w-4" />Try again</Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[.8fr_.8fr_1.4fr]">
            <div className="surface-card rounded-2xl p-5 sm:p-6" data-testid="stat-total-scans">
              <div className="flex items-center justify-between text-sm font-medium text-[#668188]"><span>Completed checks</span><span className="rounded-lg bg-[#edf6f3] p-2 text-primary"><History className="h-4 w-4" /></span></div>
              <div className="mt-4 flex items-end gap-2"><span className="font-serif text-4xl font-extrabold tracking-tight text-[#1b4652]">{(stats?.totalScans ?? 0).toLocaleString()}</span><span className="mb-1 text-xs text-muted-foreground">all time</span></div>
            </div>
            <div className="surface-card rounded-2xl p-5 sm:p-6" data-testid="stat-average-score">
              <div className="flex items-center justify-between text-sm font-medium text-[#668188]"><span>Average score</span><span className="rounded-lg bg-[#edf6f3] p-2 text-primary"><ShieldCheck className="h-4 w-4" /></span></div>
              <div className="mt-4 flex items-end gap-2"><span className="font-serif text-4xl font-extrabold tracking-tight text-[#1b4652]">{stats ? Math.round(stats.averageScore) : "—"}</span><span className="mb-1 text-xs text-muted-foreground">out of 100</span></div>
            </div>
            <div className="surface-card rounded-2xl p-5 sm:p-6" data-testid="stat-severity-counts">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-[#668188]">Findings across recent checks</p><p className="mt-1 text-xs text-muted-foreground">{totalRecentFindings} total findings</p></div>
                <span className="rounded-lg bg-[#fff5eb] p-2 text-[#b87b38]"><ShieldAlert className="h-4 w-4" /></span>
              </div>
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
                {severityMeta.map(({ key, label, color }) => {
                  const count = severityCounts?.[key] ?? 0;
                  return <div key={key} className="flex items-center gap-1.5 text-xs text-[#617c82]"><span className={`h-2 w-2 rounded-full ${color}`} /><span>{label}</span><span className="font-bold text-[#31535c]">{count}</span></div>;
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="mt-11" aria-labelledby="recent-scans-title">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#688b8b]">Your activity</p><h2 id="recent-scans-title" className="mt-1 text-2xl font-bold text-[#1c414d]">Recent assessments</h2></div>
          {recentScans && recentScans.length > 0 && <span className="text-xs text-muted-foreground">{recentScans.length} latest</span>}
        </div>
        {recentLoading ? (
          <div className="space-y-3">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-[82px] rounded-2xl" />)}</div>
        ) : recentError ? (
          <div className="surface-card flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5" data-testid="status-history-error">
            <div className="flex items-center gap-3 text-sm text-muted-foreground"><TriangleAlert className="h-5 w-5 text-[#be744d]" />Recent assessments are temporarily unavailable.</div>
            <Button variant="outline" size="sm" onClick={() => void refetchRecent()} data-testid="button-retry-history"><RefreshCw className="mr-2 h-4 w-4" />Try again</Button>
          </div>
        ) : !recentScans?.length ? (
          <div className="surface-card rounded-2xl border-dashed px-6 py-10 text-center" data-testid="empty-recent-scans">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf6f3] text-primary"><History className="h-5 w-5" /></div>
            <h3 className="mt-4 font-bold text-[#31515b]">Your history starts here</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Completed website assessments will appear here, ready to revisit whenever you need them.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#d9e7e3] bg-white shadow-[0_8px_24px_rgba(34,92,105,.045)]">
            <div className="hidden grid-cols-[minmax(0,1fr)_130px_105px_36px] gap-4 border-b border-[#e7efed] bg-[#f5f9f8] px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#789094] sm:grid"><span>Website</span><span>Assessed</span><span>Score</span><span /></div>
            {recentScans.map((scan) => (
              <button key={scan.id} type="button" onClick={() => setLocation(`/scan/${scan.id}`)} data-testid={`link-scan-${scan.id}`} className="group grid w-full grid-cols-[minmax(0,1fr)_auto_20px] items-center gap-3 border-b border-[#eaf0ee] px-4 py-4 text-left transition-colors last:border-0 hover:bg-[#f5faf8] focus-visible:relative focus-visible:z-10 sm:grid-cols-[minmax(0,1fr)_130px_105px_36px] sm:gap-4 sm:px-5">
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${scan.score >= 80 ? "bg-[#e3f2ec] text-[#37765e]" : scan.score >= 60 ? "bg-[#eff4e5] text-[#7d7b3e]" : "bg-[#fff0e9] text-[#a45b43]"}`}>{scan.grade}</span>
                  <span className="min-w-0"><span className="block truncate font-semibold text-[#2d505a]">{scan.host}</span><span className="mt-1 block truncate text-xs text-muted-foreground sm:hidden">{formatDate(scan.scannedAt)} · Score {scan.score}/100</span><span className="hidden truncate text-xs text-muted-foreground sm:block">{scan.url}</span></span>
                </span>
                <span className="hidden text-xs text-[#6c8589] sm:block">{formatDate(scan.scannedAt)}</span>
                <span className="hidden items-center gap-2 sm:flex"><span className="text-sm font-bold text-[#31535c]">{scan.score}</span><span className="h-1.5 w-12 overflow-hidden rounded-full bg-[#e7efed]"><span className="block h-full rounded-full bg-[#4e9a87]" style={{ width: `${Math.max(0, Math.min(100, scan.score))}%` }} /></span></span>
                <span className="flex items-center justify-end gap-2"><span className="hidden text-xs text-[#82989a] md:inline">{scan.criticalCount + scan.highCount + scan.mediumCount + scan.lowCount} findings</span><ChevronRight className="h-4 w-4 text-[#82989a] transition-transform group-hover:translate-x-0.5 group-hover:text-primary" /></span>
              </button>
            ))}
          </div>
        )}
      </section>
      <div className="mt-8 flex items-center gap-2 text-xs leading-5 text-[#71898d]"><ArrowUpRight className="h-4 w-4 shrink-0 text-[#4d8a81]" />Scores summarize the results returned by each completed passive assessment.</div>
    </div>
  );
}
