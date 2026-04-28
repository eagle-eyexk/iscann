import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ScanReport from "@/pages/scan";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
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
          <div className="dark min-h-screen bg-background text-foreground flex flex-col">
            <header className="border-b border-border/40 bg-card/50 backdrop-blur sticky top-0 z-40">
              <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                <a href="/" className="flex items-center gap-2.5 group">
                  <div className="bg-primary/10 p-1.5 rounded border border-primary/20 group-hover:border-primary/40 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                  </div>
                  <span className="font-semibold text-lg tracking-tight">WhiteHat<span className="text-muted-foreground font-normal">Scanner</span></span>
                </a>
                <div className="text-xs text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full border border-border/50 hidden sm:flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Safe passive checks only
                </div>
              </div>
            </header>
            <main className="flex-1">
              <Router />
            </main>
            <footer className="border-t border-border/40 py-8 mt-12 bg-card/20 text-center text-sm text-muted-foreground">
              <div className="container max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p>Ethical Web Security Analyzer</p>
                <p className="max-w-md text-xs opacity-70">
                  Only scan sites you own or have explicit permission to test. This tool runs only safe, passive checks — no exploits or aggressive payloads.
                </p>
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
