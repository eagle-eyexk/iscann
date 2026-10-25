import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Activity, Archive, ArrowRight, Check, Clock3, Globe2, History, Plus, RefreshCw,
  Search, ShieldCheck, TriangleAlert,
} from "lucide-react";
import {
  getGetScanStatsQueryKey, getListAssetsQueryKey, getListRecentScansQueryKey,
  useArchiveAsset, useCreateAsset, useGetScanStats, useListAssets, useListRecentScans, useRunScan,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(value: string | null | undefined) {
  if (!value) return "Not assessed yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function errorText(error: unknown, fallback: string) {
  return error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : fallback;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<number | null>(null);
  const assetsQuery = useListAssets({ query: { queryKey: getListAssetsQueryKey() } });
  const recentQuery = useListRecentScans({ query: { queryKey: getListRecentScansQueryKey() } });
  const statsQuery = useGetScanStats({ query: { queryKey: getGetScanStatsQueryKey() } });
  const createAsset = useCreateAsset();
  const archiveAsset = useArchiveAsset();
  const runScan = useRunScan();
  const assets = assetsQuery.data ?? [];
  const isRunning = runScan.isPending;

  async function submitAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setNotice("");
    if (!name.trim()) {
      setFormError("Add a name for this website.");
      return;
    }
    if (!authorized) {
      setFormError("Confirm you own this website or have explicit authorization before adding it.");
      return;
    }
    let normalizedUrl = url.trim();
    if (!normalizedUrl) {
      setFormError("Enter the website address.");
      return;
    }
    if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;
    try {
      const parsed = new URL(normalizedUrl);
      if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname.includes(".")) throw new Error();
      normalizedUrl = parsed.toString();
    } catch {
      setFormError("Enter a valid public website address, such as example.com.");
      return;
    }
    try {
      await createAsset.mutateAsync({ data: { name: name.trim(), url: normalizedUrl, authorizationConfirmed: true } });
      await queryClient.invalidateQueries({ queryKey: getListAssetsQueryKey() });
      setName("");
      setUrl("");
      setAuthorized(false);
      setNotice("Website added to your authorized assets.");
    } catch (error) {
      setFormError(errorText(error, "We couldn’t add that website. Please try again."));
    }
  }

  async function handleArchive(id: number, assetName: string) {
    const confirmed = window.confirm(`Archive “${assetName}” from your active assets?\n\nArchiving hides it from future scans. Past reports are preserved.`);
    if (!confirmed) return;
    setNotice("");
    try {
      await archiveAsset.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: getListAssetsQueryKey() });
      setNotice(`${assetName} was archived. Past reports remain available.`);
    } catch (error) {
      setNotice(`Could not archive this website: ${errorText(error, "Please try again.")}`);
    }
  }

  async function handleRun(id: number, assetName: string) {
    if (!assets.some((asset) => asset.id === id)) return;
    setSelectedAsset(id);
    setNotice("");
    try {
      const report = await runScan.mutateAsync({ data: { assetId: id } });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAssetsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListRecentScansQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetScanStatsQueryKey() }),
      ]);
      setLocation(`/scan/${report.id}`);
    } catch (error) {
      setNotice(`Assessment for ${assetName} couldn’t be completed: ${errorText(error, "Please try again.")}`);
    } finally {
      setSelectedAsset(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-7 sm:pt-10">
      <section className="relative isolate overflow-hidden rounded-[26px] border border-[#d5e8e3] bg-[#eaf5f2] px-5 py-7 shadow-[0_12px_36px_rgba(37,99,103,.06)] sm:px-8 sm:py-9">
        <div className="soft-grid absolute inset-0 -z-10 opacity-45" />
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#54817d]"><ShieldCheck className="h-4 w-4" /> Owner workspace</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-.045em] text-[#1b414d] sm:text-4xl">Your authorized websites</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5b777d] sm:text-base">Manage the sites you have permission to review. Passive assessments can only be started from an asset in this list.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#cce3dc] bg-white/75 px-3.5 py-2 text-xs font-semibold text-[#39766c]"><Activity className="h-4 w-4" /> Passive checks only</div>
        </div>
      </section>

      {notice && <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#cfe3de] bg-[#f1f8f6] px-4 py-3 text-sm text-[#3e6d66]" role="status" data-testid="status-dashboard-notice"><Check className="mt-0.5 h-4 w-4 shrink-0" /><span>{notice}</span></div>}

      <section className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(290px,.8fr)] lg:items-start">
        <div className="min-w-0">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#688b8b]">Asset registry</p><h2 className="mt-1 text-2xl font-bold text-[#1c414d]">Active assets</h2></div>
            {!assetsQuery.isLoading && !assetsQuery.isError && <span className="rounded-full bg-[#edf6f3] px-3 py-1 text-xs font-bold text-[#528079]">{assets.length} {assets.length === 1 ? "website" : "websites"}</span>}
          </div>
          {assetsQuery.isLoading ? (
            <div className="space-y-3" role="status" aria-label="Loading your authorized assets"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /></div>
          ) : assetsQuery.isError ? (
            <div className="surface-card rounded-2xl p-6" role="alert" data-testid="status-assets-error"><div className="flex items-center gap-3 text-sm text-[#6c7473]"><TriangleAlert className="h-5 w-5 text-[#be744d]" />Your assets couldn’t be loaded.</div><Button variant="outline" size="sm" onClick={() => void assetsQuery.refetch()} className="mt-4"><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></div>
          ) : !assets.length ? (
            <div className="surface-card rounded-2xl border-dashed px-6 py-10 text-center" data-testid="empty-assets">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf6f3] text-primary"><Globe2 className="h-5 w-5" /></div>
              <h3 className="mt-4 font-bold text-[#31515b]">No active websites yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">Add a site you own or are authorized to assess. Your asset list is the only starting point for new checks.</p>
              <a href="#add-asset" className="mt-5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-primary hover:bg-[#edf6f3]"><Plus className="h-4 w-4" />Add an authorized site</a>
            </div>
          ) : (
            <div className="space-y-3">
              {assets.map((asset) => (
                <article key={asset.id} className="surface-card rounded-2xl p-4 sm:p-5" data-testid={`card-asset-${asset.id}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf6f3] text-[#397e79]"><Globe2 className="h-5 w-5" /></span>
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-[#294d57]" data-testid={`text-asset-name-${asset.id}`}>{asset.name}</h3>
                        <p className="mt-1 truncate text-sm text-[#668187]">{asset.host}</p>
                        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#82999c]"><Clock3 className="h-3.5 w-3.5" />Last assessed: {formatDate(asset.lastScannedAt)}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 pl-[52px] sm:pl-0">
                      <Button type="button" size="sm" disabled={isRunning} onClick={() => void handleRun(asset.id, asset.name)} data-testid={`button-run-scan-${asset.id}`} className="rounded-lg bg-[#176b7c] hover:bg-[#105b6a]">
                        {isRunning && selectedAsset === asset.id ? <><Activity className="mr-2 h-4 w-4 animate-pulse" />Request pending</> : <><Search className="mr-2 h-4 w-4" />Run passive check</>}
                      </Button>
                      <Button type="button" variant="outline" size="icon" aria-label={`Archive ${asset.name}`} title="Archive asset" disabled={archiveAsset.isPending || isRunning} onClick={() => void handleArchive(asset.id, asset.name)} data-testid={`button-archive-asset-${asset.id}`} className="shrink-0 text-[#638087]"><Archive className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  {isRunning && selectedAsset === asset.id && <p className="mt-3 ml-[52px] text-xs text-[#628187]" role="status" aria-live="polite" data-testid="status-scan-pending">Assessment request pending. This scanner does not provide live progress; the report opens when the request completes.</p>}
                </article>
              ))}
            </div>
          )}
        </div>

        <aside id="add-asset" className="surface-card scroll-mt-24 rounded-2xl p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#688b8b]">Register a website</p><h2 className="mt-1 text-xl font-bold text-[#1c414d]">Add authorized asset</h2></div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf6f3] text-primary"><Plus className="h-5 w-5" /></span>
          </div>
          <form className="space-y-4" onSubmit={(event) => void submitAsset(event)} noValidate>
            <div>
              <label htmlFor="asset-name" className="mb-1.5 block text-sm font-semibold text-[#345963]">Asset name</label>
              <input id="asset-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Company website" autoComplete="organization" data-testid="input-asset-name" className="h-11 w-full rounded-xl border border-[#d4e2df] bg-white px-3.5 text-sm text-[#244a55] outline-none placeholder:text-[#91a6aa] focus:border-primary focus:ring-2 focus:ring-primary/15" />
            </div>
            <div>
              <label htmlFor="asset-url" className="mb-1.5 block text-sm font-semibold text-[#345963]">Website address</label>
              <input id="asset-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="example.com" type="text" inputMode="url" autoComplete="url" data-testid="input-asset-url" className="h-11 w-full rounded-xl border border-[#d4e2df] bg-white px-3.5 text-sm text-[#244a55] outline-none placeholder:text-[#91a6aa] focus:border-primary focus:ring-2 focus:ring-primary/15" />
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#dce9e6] bg-[#f7fbfa] p-3.5">
              <input type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} data-testid="checkbox-authorization" className="mt-0.5 h-4 w-4 shrink-0 accent-[#176b7c]" />
              <span className="text-xs leading-5 text-[#536f76]">I own this website or have explicit authorization to assess it. I understand checks are passive only.</span>
            </label>
            {formError && <p className="text-sm font-medium text-destructive" role="alert" data-testid="text-asset-error">{formError}</p>}
            <Button type="submit" disabled={createAsset.isPending} data-testid="button-add-asset" className="h-11 w-full rounded-xl bg-[#176b7c] font-bold hover:bg-[#105b6a]">
              {createAsset.isPending ? <><Activity className="mr-2 h-4 w-4 animate-pulse" />Adding website…</> : <><Plus className="mr-2 h-4 w-4" />Add authorized website</>}
            </Button>
            <p className="text-xs leading-5 text-[#7a9093]">Archiving hides an asset from future scans but preserves its stored reports.</p>
          </form>
        </aside>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
        <div>
          <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[.15em] text-[#688b8b]">Workspace overview</p><h2 className="mt-1 text-2xl font-bold text-[#1c414d]">Assessment history</h2></div>
          {statsQuery.isLoading ? <div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div> : statsQuery.isError ? (
            <div className="surface-card rounded-2xl p-5" role="alert"><p className="flex items-center gap-2 text-sm text-[#6c7473]"><TriangleAlert className="h-4 w-4 text-[#be744d]" />Summary statistics unavailable.</p><Button variant="outline" size="sm" onClick={() => void statsQuery.refetch()} className="mt-3"><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="surface-card rounded-2xl p-5" data-testid="stat-total-scans"><div className="flex items-center justify-between text-sm font-medium text-[#668188]"><span>Completed checks</span><History className="h-4 w-4 text-primary" /></div><p className="mt-4 font-serif text-4xl font-extrabold tracking-tight text-[#1b4652]">{(statsQuery.data?.totalScans ?? 0).toLocaleString()}</p><p className="mt-1 text-xs text-[#82999c]">Across available report history</p></div>
              <div className="surface-card rounded-2xl p-5" data-testid="stat-average-score"><div className="flex items-center justify-between text-sm font-medium text-[#668188]"><span>Average score</span><ShieldCheck className="h-4 w-4 text-primary" /></div><p className="mt-4 font-serif text-4xl font-extrabold tracking-tight text-[#1b4652]">{statsQuery.data ? Math.round(statsQuery.data.averageScore) : "—"}</p><p className="mt-1 text-xs text-[#82999c]">Out of 100</p></div>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#688b8b]">Stored reports</p><h2 className="mt-1 text-2xl font-bold text-[#1c414d]">Recent assessments</h2></div></div>
          {recentQuery.isLoading ? <div className="space-y-3"><Skeleton className="h-16 rounded-2xl" /><Skeleton className="h-16 rounded-2xl" /></div> : recentQuery.isError ? (
            <div className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5" role="alert"><p className="flex items-center gap-2 text-sm text-[#6c7473]"><TriangleAlert className="h-4 w-4 text-[#be744d]" />Reports could not be loaded.</p><Button variant="outline" size="sm" onClick={() => void recentQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></div>
          ) : !recentQuery.data?.length ? (
            <div className="surface-card rounded-2xl border-dashed px-6 py-8 text-center" data-testid="empty-recent-scans"><History className="mx-auto h-6 w-6 text-[#54877e]" /><h3 className="mt-3 font-bold text-[#31515b]">No stored reports yet</h3><p className="mt-1 text-sm text-muted-foreground">Completed assessments will be listed here.</p></div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#d9e7e3] bg-white shadow-[0_8px_24px_rgba(34,92,105,.045)]">
              {recentQuery.data.map((scan) => (
                <button key={scan.id} type="button" onClick={() => setLocation(`/scan/${scan.id}`)} data-testid={`link-scan-${scan.id}`} className="group grid w-full grid-cols-[minmax(0,1fr)_auto_20px] items-center gap-3 border-b border-[#eaf0ee] px-4 py-4 text-left transition-colors last:border-0 hover:bg-[#f5faf8] sm:grid-cols-[minmax(0,1fr)_120px_76px_20px] sm:px-5">
                  <span className="flex min-w-0 items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${scan.score >= 80 ? "bg-[#e3f2ec] text-[#37765e]" : scan.score >= 60 ? "bg-[#eff4e5] text-[#7d7b3e]" : "bg-[#fff0e9] text-[#a45b43]"}`}>{scan.grade}</span><span className="min-w-0"><span className="block truncate font-semibold text-[#2d505a]">{scan.host}</span><span className="mt-1 block truncate text-xs text-muted-foreground sm:hidden">{formatDate(scan.scannedAt)} · Score {scan.score}/100</span><span className="hidden truncate text-xs text-muted-foreground sm:block">{scan.url}</span></span></span>
                  <span className="hidden text-xs text-[#6c8589] sm:block">{formatDate(scan.scannedAt)}</span>
                  <span className="hidden text-sm font-bold text-[#31535c] sm:block">{scan.score}/100</span>
                  <ArrowRight className="h-4 w-4 text-[#82989a] transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
      <p className="mt-8 flex items-start gap-2 text-xs leading-5 text-[#71898d]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#4d8a81]" />Only websites returned by your authorized asset list can be scanned. Reports are stored evidence from completed passive checks.</p>
    </div>
  );
}
