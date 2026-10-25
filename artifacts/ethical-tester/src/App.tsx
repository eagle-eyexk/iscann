import { Switch, Route, Router as WouterRouter, Link } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ShieldCheck, LockKeyhole } from "lucide-react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ScanReport from "@/pages/scan";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/scan/:id" component={ScanReport} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div className="min-h-[100dvh] flex flex-col">
            <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
              <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-7">
                <Link href="/" className="group flex items-center gap-3 rounded-lg focus-visible:outline-none" data-testid="link-brand-home">
                  <img src={`${import.meta.env.BASE_URL}iscann-logo.png`} alt="iScann shield and eye logo" className="h-12 w-12 object-contain" />
                  <span className="font-serif text-[21px] font-extrabold tracking-[-.06em] text-[#123949]">iScann<span className="text-primary">.</span></span>
                </Link>
                <div className="hidden items-center gap-2 rounded-full border border-[#cce3df] bg-[#eff8f6] px-3.5 py-2 text-xs font-semibold text-[#28685f] sm:flex">
                  <ShieldCheck className="h-4 w-4" />
                  Passive website assessment
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground sm:hidden">
                  <LockKeyhole className="h-4 w-4 text-primary" /> Safe by design
                </div>
              </div>
            </header>
            <main className="flex-1"><Router /></main>
            <footer className="mt-12 border-t border-border/75 bg-[#f2f8f7]">
              <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <p className="font-semibold text-[#385965]">iScann · A clearer view of your website’s security</p>
                <p className="max-w-2xl leading-relaxed sm:text-right">Only assess websites you own or are explicitly authorized to review. iScann runs available passive checks and reports findings after the assessment completes.</p>
              </div>
            </footer>
          </div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
