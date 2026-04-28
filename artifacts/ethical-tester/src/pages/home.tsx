import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Shield, ShieldAlert, Activity, Globe, Lock, Search, ChevronRight, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  useRunScan, 
  useListRecentScans, 
  useGetScanStats,
  getListRecentScansQueryKey,
  getGetScanStatsQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

// Severity colors
const severityColors = {
  critical: "bg-severity-critical text-severity-critical-foreground",
  high: "bg-severity-high text-severity-high-foreground",
  medium: "bg-severity-medium text-severity-medium-foreground",
  low: "bg-severity-low text-severity-low-foreground",
  info: "bg-severity-info text-severity-info-foreground",
};

const scanSteps = [
  "Resolving DNS records...",
  "Fetching HTTP security headers...",
  "Inspecting TLS certificate...",
  "Probing for exposed sensitive files...",
  "Fingerprinting web technologies...",
  "Analyzing content for risks...",
  "Asking AI for executive summary...",
  "Finalizing report..."
];

export default function Home() {
  const [, setLocation] = useLocation();
  const [url, setUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const runScanMutation = useRunScan();
  
  const { data: recentScans, isLoading: isLoadingRecent } = useListRecentScans({
    query: { queryKey: getListRecentScansQueryKey() }
  });
  
  const { data: stats, isLoading: isLoadingStats } = useGetScanStats({
    query: { queryKey: getGetScanStatsQueryKey() }
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning) {
      interval = setInterval(() => {
        setScanStepIndex(prev => (prev + 1) % scanSteps.length);
        setProgress(prev => {
          const newProg = prev + (100 / (scanSteps.length * 3));
          return newProg > 98 ? 98 : newProg;
        });
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    let targetUrl = url;
    if (!targetUrl.startsWith('http')) {
      targetUrl = `https://${targetUrl}`;
    }

    setIsScanning(true);
    setScanStepIndex(0);
    setProgress(0);

    try {
      const report = await runScanMutation.mutateAsync({
        data: { url: targetUrl }
      });
      setProgress(100);
      setLocation(`/scan/${report.id}`);
    } catch (error) {
      console.error("Scan failed", error);
      setIsScanning(false);
      // In a real app we'd show a toast here
    }
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-12 space-y-16">
      
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 mb-4">
            <Shield className="w-4 h-4" />
            Passive Security Analysis
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
            See your website<br/>like an attacker does.
          </h1>
          <p className="text-lg text-muted-foreground">
            Instantly surface misconfigurations, exposed files, and security gaps with a safe, non-intrusive scan.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative max-w-2xl mx-auto"
        >
          {isScanning ? (
            <Card className="border-primary/30 bg-card shadow-lg shadow-primary/5">
              <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
                  <div className="bg-primary/10 p-4 rounded-full border border-primary/30 relative">
                    <Activity className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                </div>
                
                <div className="w-full max-w-md space-y-2 text-center">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={scanStepIndex}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-sm font-medium font-mono text-muted-foreground h-5"
                    >
                      {scanSteps[scanStepIndex]}
                    </motion.p>
                  </AnimatePresence>
                  <Progress value={progress} className="h-2 w-full bg-muted" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  type="text" 
                  placeholder="example.com" 
                  className="pl-12 pr-4 py-6 text-lg bg-card/80 border-muted-foreground/20 focus-visible:ring-primary focus-visible:border-primary shadow-sm h-auto font-mono"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isScanning}
                />
              </div>
              <Button type="submit" size="lg" disabled={!url || isScanning} className="py-6 px-8 text-lg font-semibold h-auto">
                <Search className="w-5 h-5 mr-2" />
                Run Scan
              </Button>
            </form>
          )}
          
          {!isScanning && (
            <p className="text-xs text-muted-foreground mt-4 font-mono text-center flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Only scan properties you have permission to test.
            </p>
          )}
        </motion.div>
      </section>

      {/* Stats Section */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">Global Telemetry</h2>
        </div>
        
        {isLoadingStats ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
          </div>
        ) : !stats || stats.totalScans === 0 ? (
          <Card className="bg-card/40 border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p>No scans recorded yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-card shadow-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Scans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono">{stats.totalScans.toLocaleString()}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-card shadow-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono">{Math.round(stats.averageScore)}</div>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-sm border-border/50 md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Recent Findings by Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 h-[36px]">
                  {Object.entries(stats.recentSeverityCounts).filter(([_, count]) => count > 0).map(([sev, count]) => (
                    <div key={sev} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded-sm ${sev === 'critical' ? 'bg-severity-critical' : sev === 'high' ? 'bg-severity-high' : sev === 'medium' ? 'bg-severity-medium' : sev === 'low' ? 'bg-severity-low' : 'bg-severity-info'}`} />
                      <span className="font-mono font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* Recent Scans */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold tracking-tight">Recent Scans</h2>
          </div>
        </div>

        {isLoadingRecent ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : !recentScans || recentScans.length === 0 ? (
          <Card className="bg-card/40 border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Shield className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p>No recent scans found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentScans.map((scan) => (
              <Card 
                key={scan.id} 
                className="group bg-card shadow-sm border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => setLocation(`/scan/${scan.id}`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl ${
                      scan.grade === 'A' ? 'bg-green-500/10 text-green-500' :
                      scan.grade === 'B' ? 'bg-blue-500/10 text-blue-500' :
                      scan.grade === 'C' ? 'bg-yellow-500/10 text-yellow-500' :
                      scan.grade === 'D' ? 'bg-orange-500/10 text-orange-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {scan.grade}
                    </div>
                    <div>
                      <div className="font-medium font-mono mb-1">{scan.host}</div>
                      <div className="text-xs text-muted-foreground flex gap-3">
                        <span>{new Date(scan.scannedAt).toLocaleDateString()}</span>
                        <span>Score: {scan.score}/100</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex gap-1">
                      {scan.criticalCount > 0 && <Badge variant="outline" className="border-severity-critical text-severity-critical">{scan.criticalCount} Crit</Badge>}
                      {scan.highCount > 0 && <Badge variant="outline" className="border-severity-high text-severity-high">{scan.highCount} High</Badge>}
                      {scan.mediumCount > 0 && <Badge variant="outline" className="border-severity-medium text-severity-medium">{scan.mediumCount} Med</Badge>}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
