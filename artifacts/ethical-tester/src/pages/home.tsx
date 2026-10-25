import { Link } from "wouter";
import { ArrowDownRight, ArrowRight, Check, Eye, Fingerprint, LockKeyhole, ShieldCheck } from "lucide-react";

const trustPoints = [
  { icon: LockKeyhole, title: "Passive by design", copy: "Review public-facing signals without intrusive probes or exploit attempts." },
  { icon: Fingerprint, title: "Evidence stays attached", copy: "Every stored report reflects the results and evidence returned by that assessment." },
  { icon: Eye, title: "Your sites, your workspace", copy: "Organize only assets you own or have explicit permission to review." },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-7 sm:pt-12">
      <section className="relative isolate overflow-hidden rounded-[30px] border border-[#d5e8e3] bg-[#eaf5f2] px-5 py-10 shadow-[0_16px_44px_rgba(37,99,103,.07)] sm:px-10 sm:py-14 lg:px-14 lg:py-16">
        <div className="soft-grid absolute inset-0 -z-10 opacity-60" />
        <div className="absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full bg-[#d6eeea]" />
        <div className="absolute -bottom-28 right-[23%] -z-10 h-64 w-64 rounded-full border border-[#c5e1dc]" />
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#c8e2dc] bg-white/75 px-3.5 py-2 text-xs font-bold tracking-wide text-[#326c66]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#dff1ec]"><ShieldCheck className="h-3.5 w-3.5" /></span>
              SECURITY SIGNALS, MADE CLEAR
            </div>
            <h1 className="text-balance max-w-2xl text-[2.7rem] font-extrabold leading-[1.04] tracking-[-.055em] text-[#183e4b] sm:text-6xl lg:text-[4.4rem]">
              A steadier view of the sites you protect.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-[#52717a] sm:text-lg">
              iScann gives owners a place to organize authorized websites and review evidence-based passive assessments—without intrusive testing.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/sign-up" className="inline-flex h-12 items-center justify-center gap-3 rounded-xl bg-[#176b7c] px-5 text-sm font-bold text-white shadow-[0_7px_16px_rgba(23,107,124,.16)] transition hover:-translate-y-0.5 hover:bg-[#105b6a]" data-testid="link-get-started">
                Create your workspace <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/sign-in" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#c9ded9] bg-white/75 px-5 text-sm font-semibold text-[#42636b] hover:bg-white" data-testid="link-home-sign-in">
                Sign in <ArrowDownRight className="h-4 w-4 -rotate-45" />
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium text-[#436872]">
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#348075]" />Passive checks only</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#348075]" />Reports grounded in returned data</span>
            </div>
          </div>
          <div className="relative mx-auto flex w-full max-w-[490px] items-center justify-center">
            <div className="absolute inset-4 rounded-[40%] bg-[#d8eee9] blur-2xl" />
            <div className="relative w-full rounded-[28px] border border-white/90 bg-white/80 p-5 shadow-[0_24px_70px_rgba(34,92,105,.12)] backdrop-blur sm:p-7">
              <div className="flex items-center justify-between border-b border-[#e6efed] pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf5f2] text-[#24717a]"><ShieldCheck className="h-5 w-5" /></span>
                  <div><p className="text-sm font-bold text-[#294d57]">Owner workspace</p><p className="text-xs text-[#789095]">A focused view of your sites</p></div>
                </div>
                <span className="rounded-full border border-[#cce3dc] bg-[#eff8f6] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#39766c]">Private</span>
              </div>
              <div className="mt-5 rounded-2xl border border-[#dce9e6] bg-[#fbfdfc] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf6f3] text-[#397e79]"><Eye className="h-5 w-5" /></span><div><p className="font-semibold text-[#31535c]">Authorized assets</p><p className="text-xs text-[#82999c]">Managed by you</p></div></div>
                  <span className="text-xs font-semibold text-[#528079]">Workspace</span>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#f2f8f6] px-3 py-2.5 text-xs text-[#668187]"><LockKeyhole className="h-4 w-4 shrink-0 text-[#4d8a81]" />Only registered sites can be assessed</div>
              </div>
              <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-[#e3ecea] bg-white p-4">
                <div><p className="text-xs font-bold uppercase tracking-[.13em] text-[#789093]">Assessment workflow</p><p className="mt-1 text-sm font-semibold text-[#31535c]">Review only what is observed</p></div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-[#d8eee9] text-[#2b7779]"><Eye className="h-5 w-5" /></div>
              </div>
              <p className="mt-5 text-center text-[11px] leading-5 text-[#82999c]">No active testing. No invented results. Just the available passive signals, clearly presented.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-16 grid gap-8 border-b border-[#dce9e6] pb-12 md:grid-cols-[.72fr_1.28fr] md:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#688b8b]">A calmer security routine</p><h2 className="mt-3 max-w-md text-3xl font-bold leading-tight text-[#1c414d] sm:text-4xl">Know what you own. Review what the evidence says.</h2></div>
        <p className="max-w-2xl text-base leading-7 text-[#5e7b81]">Start by registering a website and confirming you’re authorized to assess it. Run a passive check when you’re ready, then return to its stored report whenever you need a clear record.</p>
      </section>

      <section className="grid gap-5 py-10 md:grid-cols-3" aria-label="iScann principles">
        {trustPoints.map(({ icon: Icon, title, copy }, index) => (
          <article key={title} className={`rounded-2xl border border-[#dce9e6] bg-white p-5 shadow-[0_5px_18px_rgba(34,92,105,.035)] sm:p-6 ${index === 1 ? "md:translate-y-5" : ""}`}>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf6f3] text-[#397e79]"><Icon className="h-5 w-5" /></span>
            <h3 className="mt-5 text-lg font-bold text-[#294d57]">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#668187]">{copy}</p>
          </article>
        ))}
      </section>

      <section className="mt-10 flex flex-col gap-5 rounded-[24px] border border-[#cfe3de] bg-[#f1f8f6] px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-9">
        <div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#54817d]">Start with permission</p><h2 className="mt-2 text-2xl font-bold text-[#1c414d]">Your workspace begins with an authorized asset.</h2><p className="mt-2 text-sm leading-6 text-[#668187]">Add your site, confirm authorization, and keep every report in one owner-scoped place.</p></div>
        <Link href="/sign-up" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#176b7c] px-4 text-sm font-bold text-white hover:bg-[#105b6a]" data-testid="link-create-workspace-bottom">Create workspace <ArrowRight className="h-4 w-4" /></Link>
      </section>
    </div>
  );
}
