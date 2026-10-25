import { Link, useParams } from "wouter";
import { useGetScan, getGetScanQueryKey, Severity } from "@workspace/api-client-react";
import { AlertCircle, ArrowLeft, ArrowUpRight, Check, ChevronDown, Clock3, Cookie, FileWarning, Globe2, Info, LockKeyhole, Network, RefreshCw, Server, Shield, ShieldAlert, ShieldCheck, Sparkles, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const severityStyles: Record<Severity, string> = {
  critical: "bg-[#fff0ee] text-[#a53c38] border-[#efc4bf]",
  high: "bg-[#fff3ed] text-[#a64f31] border-[#efc7b3]",
  medium: "bg-[#fff8e9] text-[#8e6825] border-[#ead9ac]",
  low: "bg-[#eaf6f4] text-[#287477] border-[#c7e4df]",
  info: "bg-[#f0f4f5] text-[#586e75] border-[#d6e0e2]",
};

const severityText: Record<Severity, string> = {
  critical: "text-[#a53c38]",
  high: "text-[#a64f31]",
  medium: "text-[#8e6825]",
  low: "text-[#287477]",
  info: "text-[#586e75]",
};

function humanDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const boundedScore = Math.max(0, Math.min(100, score));
  const color = boundedScore >= 80 ? "#39816e" : boundedScore >= 60 ? "#a1823f" : "#b75e48";
  return (
    <div className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(${color} ${boundedScore * 3.6}deg, #e4eeeb 0deg)` }} aria-label={`Security score ${score} out of 100, grade ${grade}`}>
      <div className="flex h-[122px] w-[122px] flex-col items-center justify-center rounded-full bg-white shadow-inner">
        <span className="font-serif text-[2.6rem] font-extrabold leading-none tracking-tight text-[#234a55]" data-testid="text-report-score">{score}</span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[.18em] text-[#789095]">Score / 100</span>
      </div>
      <span className="absolute -right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-[#e8f4ef] font-serif text-base font-extrabold text-[#35765e]" data-testid="text-report-grade">{grade}</span>
    </div>
  );
}

function DetailSection({ title, icon: Icon, count, children, initialOpen = false }: { title: string; icon: typeof Globe2; count?: string; children: React.ReactNode; initialOpen?: boolean }) {
  return (
    <details className="group overflow-hidden rounded-2xl border border-[#d9e7e3] bg-white shadow-[0_6px_18px_rgba(34,92,105,.035)]" open={initialOpen}>
      <summary data-testid={`toggle-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf6f3] text-[#397e79]"><Icon className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1 font-bold text-[#294d57]">{title}</span>
        {count && <span className="rounded-full bg-[#f1f6f5] px-2.5 py-1 text-[11px] font-semibold text-[#668187]">{count}</span>}
        <ChevronDown className="h-4 w-4 text-[#82999c] transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-[#eaf0ee] px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </details>
  );
}

function DataPills({ values, empty = "None reported" }: { values: string[]; empty?: string }) {
  if (!values.length) return <span className="text-sm text-muted-foreground">{empty}</span>;
  return <div className="flex flex-wrap gap-2">{values.map((value, index) => <span key={`${value}-${index}`} className="max-w-full break-all rounded-lg border border-[#dce9e6] bg-[#f5f9f8] px-2.5 py-1.5 font-mono text-xs text-[#49666d]">{value}</span>)}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-[.13em] text-[#809699]">{label}</dt><dd className="mt-1.5 break-words text-sm text-[#385860]">{children}</dd></div>;
}

export default function ScanReport() {
  const params = useParams();
  const id = Number(params.id || 0);
  const validId = Number.isInteger(id) && id > 0;
  const { data: report, isLoading, error, refetch, isFetching } = useGetScan(id, {
    query: { enabled: validId, queryKey: getGetScanQueryKey(id) },
  });

  if (isLoading) {
    return <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-7"><Skeleton className="h-8 w-40" /><Skeleton className="h-60 rounded-[26px]" /><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>;
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-7" data-testid="status-report-error">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#fff3ed] text-[#ad684a]"><AlertCircle className="h-7 w-7" /></div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-[#779095]">Report unavailable</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#244651]">We couldn’t open this assessment.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">The report may have moved or there may be a temporary connection issue. Try loading it again, or return to your workspace.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {validId && <Button variant="outline" onClick={() => void refetch()} disabled={isFetching} data-testid="button-retry-report"><RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />Try again</Button>}
          <Link href="/" data-testid="link-return-home" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><ArrowLeft className="mr-2 h-4 w-4" />Workspace</Link>
        </div>
      </div>
    );
  }

  const counts = (["critical", "high", "medium", "low", "info"] as Severity[]).map((severity) => ({
    severity,
    count: report.findings.filter((finding) => finding.severity === severity).length,
  }));
  const gradeHue = report.score >= 80 ? "text-[#36745f]" : report.score >= 60 ? "text-[#8b7138]" : "text-[#a95743]";

  return (
    <div className="mx-auto max-w-6xl px-4 pb-14 pt-7 sm:px-7 sm:pt-9">
      <Link href="/" data-testid="link-back-dashboard" className="mb-6 inline-flex items-center gap-2 rounded-lg py-2 text-sm font-semibold text-[#59757b] transition-colors hover:text-primary"><ArrowLeft className="h-4 w-4" />Back to workspace</Link>

      <section className="relative overflow-hidden rounded-[26px] border border-[#d5e8e3] bg-[#eaf5f2] p-5 shadow-[0_12px_36px_rgba(37,99,103,.06)] sm:p-8">
        <div className="soft-grid absolute inset-0 opacity-40" />
        <div className="relative grid items-center gap-7 md:grid-cols-[auto_1fr_auto]">
          <ScoreRing score={report.score} grade={report.grade} />
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#cce3dc] bg-white/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#39766c]"><ShieldCheck className="h-3.5 w-3.5" />Completed passive assessment</div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <h1 className="max-w-full break-all font-serif text-3xl font-extrabold tracking-[-.04em] text-[#1f4652] sm:text-4xl" data-testid="text-report-host">{report.host}</h1>
              <a href={report.finalUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${report.host} in a new tab`} data-testid="link-open-scanned-site" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#cfe2de] bg-white/75 text-[#4b7778] hover:text-primary"><ArrowUpRight className="h-4 w-4" /></a>
            </div>
            <p className="mt-2 break-all text-sm text-[#668187]">{report.finalUrl}</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#5d777d]">
              <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{humanDate(report.scannedAt)}</span>
              <span className="inline-flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5" />HTTP {report.statusCode}</span>
              <span className="inline-flex items-center gap-1.5"><ActivityIcon />{report.durationMs} ms</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/70 p-4 md:min-w-[155px]">
            <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#799094]">Assessment result</p>
            <p className={`mt-1 font-serif text-3xl font-extrabold ${gradeHue}`} data-testid="text-result-grade">{report.grade} <span className="text-lg">/ 100</span></p>
            <p className="mt-1 text-xs text-[#678087]">{report.findings.length} reported findings</p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Finding counts">
        {counts.map(({ severity, count }) => (
          <div key={severity} data-testid={`stat-findings-${severity}`} className="rounded-2xl border border-[#dce8e5] bg-white px-4 py-4 shadow-[0_5px_18px_rgba(34,92,105,.035)]">
            <p className="text-xs font-semibold capitalize text-[#71898e]">{severity}</p><p className={`mt-2 font-serif text-3xl font-extrabold ${severityText[severity]}`}>{count}</p>
          </div>
        ))}
      </section>

      <section className="mt-9" aria-labelledby="summary-heading">
        <div className="mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#4c8981]" /><h2 id="summary-heading" className="text-xl font-bold text-[#254a54]">Assessment summary</h2></div>
        <div className="rounded-2xl border border-[#d3e6e1] bg-[#f2f8f6] p-5 sm:p-6" data-testid="text-ai-summary">
          <p className="text-[15px] leading-7 text-[#36575f]">{report.aiSummary}</p>
          {report.aiRemediation.length > 0 && <div className="mt-6 border-t border-[#dcebe7] pt-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#315b60]"><Shield className="h-4 w-4 text-[#49857d]" />Suggested next steps</h3>
            <ol className="space-y-3">{report.aiRemediation.map((step, index) => <li key={`${index}-${step}`} className="flex gap-3 text-sm leading-6 text-[#45646b]" data-testid={`text-remediation-${index}`}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[#39776e]">{index + 1}</span><span>{step}</span></li>)}</ol>
          </div>}
        </div>
      </section>

      <section className="mt-9" aria-labelledby="findings-heading">
        <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#789093]">What was observed</p><h2 id="findings-heading" className="mt-1 text-xl font-bold text-[#254a54]">Detailed findings</h2></div><span className="text-xs text-[#71898e]">{report.findings.length} total</span></div>
        {report.findings.length === 0 ? (
          <div className="rounded-2xl border border-[#cfe4d8] bg-[#f0f8f3] px-6 py-9 text-center" data-testid="empty-findings">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#45836d]"><Check className="h-6 w-6" /></span>
            <h3 className="mt-4 font-bold text-[#315c4d]">No findings were returned</h3>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#648176]">The completed assessment returned no reported findings. This reflects the available passive checks, not a guarantee that the site is free of security issues.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {report.findings.map((finding) => (
              <article key={finding.id} className="overflow-hidden rounded-2xl border border-[#dce8e5] bg-white shadow-[0_5px_18px_rgba(34,92,105,.035)]" data-testid={`card-finding-${finding.id}`}>
                <div className={`h-1 ${finding.severity === "critical" ? "bg-[#b84645]" : finding.severity === "high" ? "bg-[#ce6947]" : finding.severity === "medium" ? "bg-[#bb8433]" : finding.severity === "low" ? "bg-[#338a96]" : "bg-[#879aa2]"}`} />
                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f1f6f5]"><ShieldAlert className={`h-4 w-4 ${severityText[finding.severity]}`} /></span><div><h3 className="font-bold text-[#2d4f59]">{finding.title}</h3><p className="mt-1 text-xs text-[#779095]">{finding.category}</p></div></div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${severityStyles[finding.severity]}`}>{finding.severity}</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#526e74]">{finding.description}</p>
                  {finding.evidence && <div className="mt-4 rounded-xl border border-[#e3ecea] bg-[#f6f9f8] px-3.5 py-3"><p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#809598]"><Info className="h-3 w-3" />Observed evidence</p><p className="break-all font-mono text-xs leading-5 text-[#4d696f]">{finding.evidence}</p></div>}
                  <div className="mt-4 rounded-xl bg-[#edf6f3] px-3.5 py-3 text-sm leading-6 text-[#456963]"><strong className="font-bold text-[#347268]">Recommendation</strong><p>{finding.recommendation}</p></div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10" aria-labelledby="technical-heading">
        <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#789093]">Observed response details</p><h2 id="technical-heading" className="mt-1 text-xl font-bold text-[#254a54]">Technical details</h2></div>
        <div className="space-y-3">
          <DetailSection title="Security response headers" icon={Globe2} count={`${report.headers.length} checks`} initialOpen>
            <div className="space-y-2">
              {report.headers.map((header, index) => <div key={`${header.name}-${index}`} data-testid={`row-header-${index}`} className="grid gap-2 rounded-xl border border-[#e7efed] bg-[#fbfdfc] p-3 sm:grid-cols-[minmax(150px,.7fr)_100px_minmax(0,1.6fr)] sm:items-start">
                <span className="break-all font-mono text-xs font-semibold text-[#435f66]">{header.name}</span><span className={`inline-flex w-fit items-center gap-1 text-xs font-semibold ${header.present ? "text-[#39765e]" : "text-[#a75743]"}`}>{header.present ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}{header.present ? "Present" : "Missing"}</span>
                <span className="break-all text-xs leading-5 text-[#6b8388]">{header.value || (header.present ? "Value not provided" : header.recommendation || "No recommendation provided")}</span>
              </div>)}
              {!report.headers.length && <p className="text-sm text-muted-foreground">No header checks were included in this report.</p>}
            </div>
          </DetailSection>

          <DetailSection title="TLS & certificate" icon={LockKeyhole} count={report.tls.protocol || "Certificate details"}>
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Protocol">{report.tls.protocol || "Not reported"}</Field><Field label="Cipher suite">{report.tls.cipher || "Not reported"}</Field>
              <Field label="Issuer">{report.tls.issuer || "Not reported"}</Field><Field label="Subject">{report.tls.subject || "Not reported"}</Field>
              <Field label="Valid from">{report.tls.validFrom ? humanDate(report.tls.validFrom) : "Not reported"}</Field><Field label="Valid until">{report.tls.validTo ? humanDate(report.tls.validTo) : "Not reported"}</Field>
              <Field label="Days until expiry">{report.tls.daysUntilExpiry ?? "Not reported"}</Field>
            </dl>
            <div className="mt-5"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#809699]">Subject alternative names</p><DataPills values={report.tls.san} /></div>
          </DetailSection>

          <DetailSection title="DNS records" icon={Network}>
            <div className="grid gap-5 sm:grid-cols-2">
              {([["A records", report.dns.a], ["AAAA records", report.dns.aaaa], ["Mail exchangers", report.dns.mx], ["Name servers", report.dns.ns], ["TXT records", report.dns.txt], ["CAA records", report.dns.caa]] as [string, string[]][]).map(([label, values]) => <div key={label}><p className="mb-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#809699]">{label}</p><DataPills values={values} /></div>)}
            </div>
            <div className="mt-5 flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${report.dns.hasSpf ? "bg-[#e9f5ed] text-[#3c755d]" : "bg-[#f2f5f5] text-[#657c80]"}`}>SPF {report.dns.hasSpf ? "present" : "not detected"}</span><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${report.dns.hasDmarc ? "bg-[#e9f5ed] text-[#3c755d]" : "bg-[#f2f5f5] text-[#657c80]"}`}>DMARC {report.dns.hasDmarc ? "present" : "not detected"}</span></div>
          </DetailSection>

          <DetailSection title="Cookie attributes" icon={Cookie} count={`${report.cookies.length} cookies`}>
            {report.cookies.length ? <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead><tr className="border-b border-[#e5eeeb] text-[10px] uppercase tracking-[.12em] text-[#819598]"><th className="pb-3 pr-4 font-bold">Cookie</th><th className="pb-3 pr-4 font-bold">Secure</th><th className="pb-3 pr-4 font-bold">HttpOnly</th><th className="pb-3 font-bold">SameSite</th></tr></thead><tbody>{report.cookies.map((cookie, index) => <tr key={`${cookie.name}-${index}`} className="border-b border-[#edf2f1] last:border-0" data-testid={`row-cookie-${index}`}><td className="break-all py-3 pr-4 font-mono text-xs text-[#405e65]">{cookie.name}</td><td className="py-3 pr-4 text-xs">{cookie.secure ? "Yes" : "No"}</td><td className="py-3 pr-4 text-xs">{cookie.httpOnly ? "Yes" : "No"}</td><td className="py-3 text-xs">{cookie.sameSite || "Not set"}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">No cookies were included in the response data.</p>}
          </DetailSection>

          <DetailSection title="Exposed files" icon={FileWarning} count={`${report.exposedFiles.length} reported`}>
            {report.exposedFiles.length ? <div className="space-y-2">{report.exposedFiles.map((file, index) => <div key={`${file.path}-${index}`} data-testid={`row-exposed-file-${index}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e7efed] bg-[#fbfdfc] p-3 text-xs"><code className="min-w-0 flex-1 break-all text-[#4b666c]">{file.path}</code><span className="rounded-md bg-[#f1f6f5] px-2 py-1 text-[#607b80]">HTTP {file.status}</span><span className={`rounded-full border px-2 py-1 capitalize ${severityStyles[file.risk]}`}>{file.risk}</span>{file.contentType && <span className="w-full break-all text-[#7a9093] sm:w-auto">{file.contentType}</span>}</div>)}</div> : <p className="text-sm text-muted-foreground">No exposed files were reported.</p>}
          </DetailSection>

          <DetailSection title="Content observations" icon={Webhook}>
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Page title">{report.content.title || "Not reported"}</Field><Field label="Mixed content">{report.content.hasMixedContent ? "Detected" : "Not detected"}</Field>
              <Field label="Forms without HTTPS">{report.content.formsWithoutHttps}</Field><Field label="HTML comments flagged">{report.content.commentsLeaked}</Field>
            </dl>
            <div className="mt-5 grid gap-5 sm:grid-cols-2"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#809699]">External scripts</p><DataPills values={report.content.externalScripts} /></div><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#809699]">Emails found</p><DataPills values={report.content.emailsFound} /></div></div>
          </DetailSection>

          <DetailSection title="Robots & sitemap" icon={Shield} count={report.robots.present ? "robots.txt present" : "not detected"}>
            <div className="grid gap-5 sm:grid-cols-2"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#809699]">Sensitive disallow paths</p><DataPills values={report.robots.sensitiveDisallows} /></div><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#809699]">Sitemap URLs</p><DataPills values={report.robots.sitemapUrls} /></div></div>
          </DetailSection>

          <DetailSection title="Technology fingerprint" icon={Server}>
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><Field label="Web server">{report.tech.server || "Not detected"}</Field><Field label="CDN">{report.tech.cdn || "Not detected"}</Field><Field label="Framework">{report.tech.framework || "Not detected"}</Field><Field label="CMS">{report.tech.cms || "Not detected"}</Field><Field label="Powered by">{report.tech.poweredBy || "Not reported"}</Field></dl>
            <div className="mt-5 grid gap-5 sm:grid-cols-2"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#809699]">Libraries</p><DataPills values={report.tech.libraries} /></div><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#809699]">Analytics</p><DataPills values={report.tech.analytics} /></div></div>
          </DetailSection>

          <DetailSection title="Redirect chain" icon={ArrowUpRight} count={`${report.redirectChain.length} hops`}>
            <DataPills values={report.redirectChain} empty="No redirect chain returned." />
          </DetailSection>

          <DetailSection title="Raw response headers" icon={Webhook} count={`${Object.keys(report.rawHeaders).length} headers`}>
            <div className="space-y-2">{Object.entries(report.rawHeaders).map(([key, value]) => <div key={key} className="grid gap-1 rounded-lg bg-[#f5f9f8] px-3 py-2 sm:grid-cols-[minmax(150px,.45fr)_1fr] sm:gap-4"><span className="break-all font-mono text-xs font-semibold text-[#4a676d]">{key}</span><span className="break-all font-mono text-xs leading-5 text-[#72888c]">{value}</span></div>)}</div>
          </DetailSection>
        </div>
      </section>
      <p className="mt-7 flex items-start gap-2 text-xs leading-5 text-[#789093]"><LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#54877e]" />This report reflects the response and passive checks available at the time of assessment. Only review sites you own or are authorized to assess.</p>
    </div>
  );
}

function ActivityIcon() {
  return <Clock3 className="h-3.5 w-3.5" />;
}
