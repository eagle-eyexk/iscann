import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Activity, LogOut, ShieldCheck } from "lucide-react";
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import ScanReport from "@/pages/scan";
import NotFound from "@/pages/not-found";
import "@/index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#176b7c",
    colorForeground: "#1c414d",
    colorMutedForeground: "#627d82",
    colorDanger: "#ad443d",
    colorBackground: "#fbfdfc",
    colorInput: "#ffffff",
    colorInputForeground: "#244a55",
    colorNeutral: "#d4e2df",
    fontFamily: "DM Sans, sans-serif",
    borderRadius: "0.85rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#fbfdfc] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#d8e8e4] shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#1c414d] font-bold",
    headerSubtitle: "text-[#627d82]",
    socialButtonsBlockButtonText: "text-[#31535c] font-semibold",
    formFieldLabel: "text-[#345963] font-semibold",
    footerActionLink: "text-[#176b7c] font-semibold",
    footerActionText: "text-[#627d82]",
    dividerText: "text-[#70878a]",
    identityPreviewEditButton: "text-[#176b7c]",
    formFieldSuccessText: "text-[#347268]",
    alertText: "text-[#7e4b3d]",
    logoBox: "rounded-xl overflow-hidden",
    logoImage: "object-contain",
    socialButtonsBlockButton: "border-[#d4e2df] bg-white hover:bg-[#f1f8f6]",
    formButtonPrimary: "bg-[#176b7c] hover:bg-[#105b6a] font-bold",
    formFieldInput: "border-[#d4e2df] bg-white text-[#244a55]",
    footerAction: "border-t border-[#e4eeeb]",
    dividerLine: "bg-[#dce8e5]",
    alert: "border-[#efcfbf] bg-[#fff7f2]",
    otpCodeFieldInput: "border-[#d4e2df] bg-white text-[#244a55]",
    formFieldRow: "gap-1",
    main: "gap-5",
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const cache = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== userId) cache.clear();
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, cache]);
  return null;
}

function HomeRedirect() {
  return <><Show when="signed-in"><Redirect to="/dashboard" /></Show><Show when="signed-out"><Home /></Show></>;
}

function ProtectedDashboard() {
  return <><Show when="signed-in"><Dashboard /></Show><Show when="signed-out"><Redirect to="/" /></Show></>;
}

function ProtectedReport() {
  return <><Show when="signed-in"><ScanReport /></Show><Show when="signed-out"><Redirect to="/" /></Show></>;
}

function SignInPage() {
  return <div className="auth-page"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}

function SignUpPage() {
  return <div className="auth-page"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>;
}

function WorkspaceHeader() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const display = user?.firstName || user?.primaryEmailAddress?.emailAddress || "Account";
  return (
    <header className="sticky top-0 z-40 border-b border-[#dce9e6] bg-[#f8fcfb]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-7">
        <Link href="/" className="group flex items-center gap-2.5 rounded-lg focus-visible:outline-none" data-testid="link-brand-home">
          <img src={`${import.meta.env.BASE_URL}iscann-logo.png`} alt="" className="h-11 w-11 object-contain" />
          <span className="font-serif text-[21px] font-extrabold tracking-[-.06em] text-[#123949]">iScann<span className="text-primary">.</span></span>
        </Link>
        <div className="hidden items-center gap-2 rounded-full border border-[#cce3df] bg-[#eff8f6] px-3.5 py-2 text-xs font-semibold text-[#28685f] sm:flex">
          <ShieldCheck className="h-4 w-4" /> Passive website assessment
        </div>
        <div className="flex items-center gap-2">
          <Show when="signed-out">
            <Link href="/sign-in" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#42636b] hover:bg-[#edf6f3]" data-testid="link-sign-in">Sign in</Link>
            <Link href="/sign-up" className="rounded-lg bg-[#176b7c] px-3.5 py-2 text-sm font-bold text-white hover:bg-[#105b6a]" data-testid="link-sign-up">Create account</Link>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#42636b] hover:bg-[#edf6f3] sm:inline-flex" data-testid="link-dashboard"><Activity className="h-4 w-4" />Workspace</Link>
            <span className="hidden max-w-[180px] truncate text-xs font-medium text-[#668187] md:inline" data-testid="text-account-name">{display}</span>
            <button type="button" onClick={() => void signOut({ redirectUrl: basePath || "/" })} className="inline-flex items-center gap-2 rounded-lg border border-[#dce9e6] bg-white px-3 py-2 text-sm font-semibold text-[#42636b] hover:bg-[#f1f8f6]" data-testid="button-sign-out" aria-label="Sign out">
              <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span>
            </button>
          </Show>
        </div>
      </div>
    </header>
  );
}

function AppRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to your iScann workspace" } },
        signUp: { start: { title: "Create your workspace", subtitle: "Keep authorized site reviews in one place" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <div className="min-h-[100dvh] flex flex-col">
              <WorkspaceHeader />
              <main className="flex-1">
                <Switch>
                  <Route path="/" component={HomeRedirect} />
                  <Route path="/dashboard" component={ProtectedDashboard} />
                  <Route path="/scan/:id" component={ProtectedReport} />
                  <Route path="/sign-in/*?" component={SignInPage} />
                  <Route path="/sign-up/*?" component={SignUpPage} />
                  <Route component={NotFound} />
                </Switch>
              </main>
              <footer className="mt-12 border-t border-[#dce9e6] bg-[#f2f8f7]">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-7">
                  <p className="font-semibold text-[#385965]">iScann · A clearer view of your website’s security</p>
                  <p className="max-w-2xl leading-relaxed sm:text-right">Only assess websites you own or are explicitly authorized to review. iScann runs available passive checks and reports evidence after the assessment completes.</p>
                </div>
              </footer>
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return <WouterRouter base={basePath}><AppRoutes /></WouterRouter>;
}

export default App;
