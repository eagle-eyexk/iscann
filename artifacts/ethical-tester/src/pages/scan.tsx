import { useParams, Link } from "wouter";
import { 
  Shield, ShieldAlert, ShieldCheck, AlertTriangle, 
  Lock, Globe, Server, Cookie, FileWarning, 
  Activity, CheckCircle2, Info, ArrowLeft,
  Terminal, Code, ExternalLink, ShieldHalf
} from "lucide-react";
import { useGetScan, getGetScanQueryKey, Severity } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";

const severityColors = {
  critical: "bg-severity-critical/10 text-severity-critical border-severity-critical/20",
  high: "bg-severity-high/10 text-severity-high border-severity-high/20",
  medium: "bg-severity-medium/10 text-severity-medium border-severity-medium/20",
  low: "bg-severity-low/10 text-severity-low border-severity-low/20",
  info: "bg-severity-info/10 text-severity-info border-severity-info/20",
};

const severityIcons = {
  critical: <ShieldAlert className="w-5 h-5 text-severity-critical" />,
  high: <AlertTriangle className="w-5 h-5 text-severity-high" />,
  medium: <ShieldHalf className="w-5 h-5 text-severity-medium" />,
  low: <Shield className="w-5 h-5 text-severity-low" />,
  info: <Info className="w-5 h-5 text-severity-info" />,
};

export default function ScanReport() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);

  const { data: report, isLoading, error } = useGetScan(id, {
    query: {
      enabled: !!id,
      queryKey: getGetScanQueryKey(id)
    }
  });

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-8 space-y-8">
        <Skeleton className="h-10 w-32" />
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <Skeleton className="w-48 h-48 rounded-2xl" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <div className="flex gap-2 pt-4">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-24 text-center">
        <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-6 opacity-80" />
        <h1 className="text-3xl font-bold mb-4">Scan Not Found</h1>
        <p className="text-muted-foreground mb-8">The requested security report could not be located or has expired.</p>
        <Link href="/" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Return Home
        </Link>
      </div>
    );
  }

  const gradeColors = {
    'A': 'text-green-500 bg-green-500/10 border-green-500/20',
    'B': 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    'C': 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    'D': 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    'F': 'text-red-500 bg-red-500/10 border-red-500/20',
  };

  const gradeColor = gradeColors[report.grade as keyof typeof gradeColors] || gradeColors['F'];

  const criticalFindings = report.findings.filter(f => f.severity === 'critical');
  const highFindings = report.findings.filter(f => f.severity === 'high');
  const mediumFindings = report.findings.filter(f => f.severity === 'medium');
  const lowFindings = report.findings.filter(f => f.severity === 'low');
  const infoFindings = report.findings.filter(f => f.severity === 'info');

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8 space-y-12">
      <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
      </Link>

      {/* Hero Section */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`flex-shrink-0 w-48 h-48 rounded-2xl flex flex-col items-center justify-center border-2 ${gradeColor} shadow-lg`}
        >
          <div className="text-7xl font-bold leading-none">{report.grade}</div>
          <div className="text-sm font-semibold tracking-widest uppercase mt-2 opacity-80">Grade</div>
        </motion.div>

        <div className="flex-1 space-y-6 pt-2">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight font-mono break-all">{report.host}</h1>
              <a href={report.finalUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> Scanned {new Date(report.scannedAt).toLocaleString()}
              </span>
              <span className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4" /> Status {report.statusCode}
              </span>
              <span className="flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> {report.durationMs}ms duration
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={`text-base py-1 px-3 ${criticalFindings.length > 0 ? severityColors.critical : 'opacity-50'}`}>
              {criticalFindings.length} Critical
            </Badge>
            <Badge variant="outline" className={`text-base py-1 px-3 ${highFindings.length > 0 ? severityColors.high : 'opacity-50'}`}>
              {highFindings.length} High
            </Badge>
            <Badge variant="outline" className={`text-base py-1 px-3 ${mediumFindings.length > 0 ? severityColors.medium : 'opacity-50'}`}>
              {mediumFindings.length} Medium
            </Badge>
            <Badge variant="outline" className={`text-base py-1 px-3 ${lowFindings.length > 0 ? severityColors.low : 'opacity-50'}`}>
              {lowFindings.length} Low
            </Badge>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="flex items-center gap-2 text-primary">
              <ShieldCheck className="w-5 h-5" /> Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-6">
            <div className="text-base leading-relaxed text-foreground/90 font-medium">
              {report.aiSummary}
            </div>
            
            {report.aiRemediation.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                  <Terminal className="w-4 h-4" /> Recommended Actions
                </h3>
                <ul className="space-y-2">
                  {report.aiRemediation.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold font-mono">
                        {i + 1}
                      </span>
                      <span className="pt-0.5 leading-tight">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Findings List */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-primary" /> 
          Detailed Findings
        </h2>
        
        {report.findings.length === 0 ? (
          <Card className="bg-card/40 border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-green-500 opacity-50" />
              <p>No significant security issues found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {report.findings.map((finding, idx) => (
              <motion.div 
                key={finding.id}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 + (idx * 0.05) }}
              >
                <Card className="border-border/50 shadow-sm overflow-hidden">
                  <div className={`h-1 w-full ${
                    finding.severity === 'critical' ? 'bg-severity-critical' : 
                    finding.severity === 'high' ? 'bg-severity-high' : 
                    finding.severity === 'medium' ? 'bg-severity-medium' : 
                    finding.severity === 'low' ? 'bg-severity-low' : 'bg-severity-info'
                  }`} />
                  <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        {severityIcons[finding.severity as keyof typeof severityIcons]}
                        <CardTitle className="text-lg">{finding.title}</CardTitle>
                      </div>
                      <CardDescription className="flex items-center gap-2 font-mono text-xs">
                        <Badge variant="secondary" className="rounded-sm px-1.5 py-0 font-normal">{finding.category}</Badge>
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={`capitalize ${severityColors[finding.severity as keyof typeof severityColors]}`}>
                      {finding.severity}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-foreground/80">{finding.description}</p>
                    
                    {finding.evidence && (
                      <div className="bg-muted/50 rounded-md p-3 font-mono text-xs text-muted-foreground border border-border/50 overflow-x-auto whitespace-pre-wrap break-all">
                        {finding.evidence}
                      </div>
                    )}
                    
                    <div className="bg-primary/5 border border-primary/10 rounded-md p-3 text-sm">
                      <strong className="text-primary font-semibold mb-1 block">Recommendation:</strong>
                      {finding.recommendation}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Separator className="my-8" />

      {/* Technical Details Accordions */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Server className="w-6 h-6 text-primary" /> 
          Technical Details
        </h2>

        <Accordion type="multiple" className="space-y-4">
          
          {/* Headers */}
          <AccordionItem value="headers" className="border rounded-lg bg-card px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold text-lg">HTTP Security Headers</span>
                <Badge variant="secondary" className="ml-2 font-mono">{report.headers.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Header</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.headers.map((h, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs font-medium">{h.name}</TableCell>
                        <TableCell>
                          {h.present ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Present</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Missing</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground max-w-[300px] truncate" title={h.value || ""}>
                          {h.value || <span className="italic opacity-50">Not set</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* TLS */}
          <AccordionItem value="tls" className="border rounded-lg bg-card px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold text-lg">TLS & Certificate</span>
                {report.tls.protocol && <Badge variant="secondary" className="ml-2 font-mono">{report.tls.protocol}</Badge>}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border/50">
                  <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Certificate Info</div>
                  <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                    <span className="text-muted-foreground">Issuer:</span>
                    <span className="font-mono text-xs truncate" title={report.tls.issuer || ""}>{report.tls.issuer || "Unknown"}</span>
                    
                    <span className="text-muted-foreground">Subject:</span>
                    <span className="font-mono text-xs truncate" title={report.tls.subject || ""}>{report.tls.subject || "Unknown"}</span>
                    
                    <span className="text-muted-foreground">Cipher:</span>
                    <span className="font-mono text-xs">{report.tls.cipher || "Unknown"}</span>
                  </div>
                </div>
                
                <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border/50">
                  <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Validity</div>
                  <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                    <span className="text-muted-foreground">From:</span>
                    <span>{report.tls.validFrom ? new Date(report.tls.validFrom).toLocaleDateString() : "Unknown"}</span>
                    
                    <span className="text-muted-foreground">To:</span>
                    <span>{report.tls.validTo ? new Date(report.tls.validTo).toLocaleDateString() : "Unknown"}</span>
                    
                    <span className="text-muted-foreground">Expires in:</span>
                    <span className={report.tls.daysUntilExpiry && report.tls.daysUntilExpiry < 30 ? "text-orange-500 font-bold" : ""}>
                      {report.tls.daysUntilExpiry ? `${report.tls.daysUntilExpiry} days` : "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 bg-muted/30 p-4 rounded-lg border border-border/50">
                  <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Subject Alternative Names (SAN)</div>
                  <div className="flex flex-wrap gap-2">
                    {report.tls.san.length > 0 ? report.tls.san.map((s, i) => (
                      <Badge key={i} variant="secondary" className="font-mono font-normal">{s}</Badge>
                    )) : <span className="text-sm text-muted-foreground italic">None found</span>}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Tech Fingerprint */}
          <AccordionItem value="tech" className="border rounded-lg bg-card px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <Code className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold text-lg">Technology Fingerprint</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Server / CDN</div>
                  <div className="font-mono text-sm">{report.tech.server || "Unknown"}</div>
                  {report.tech.cdn && <div className="font-mono text-sm">{report.tech.cdn}</div>}
                </div>
                
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Framework / CMS</div>
                  <div className="font-mono text-sm">{report.tech.framework || "Unknown Framework"}</div>
                  {report.tech.cms && <div className="font-mono text-sm">{report.tech.cms}</div>}
                  {report.tech.poweredBy && <div className="font-mono text-sm text-muted-foreground text-xs">Powered by: {report.tech.poweredBy}</div>}
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Libraries & Analytics</div>
                  <div className="flex flex-wrap gap-1.5">
                    {report.tech.libraries.map(l => <Badge key={l} variant="outline" className="font-mono text-xs py-0 h-5">{l}</Badge>)}
                    {report.tech.analytics.map(a => <Badge key={a} variant="secondary" className="font-mono text-xs py-0 h-5">{a}</Badge>)}
                    {report.tech.libraries.length === 0 && report.tech.analytics.length === 0 && (
                      <span className="text-sm text-muted-foreground italic">None detected</span>
                    )}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Raw Headers */}
          <AccordionItem value="raw" className="border rounded-lg bg-card px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <Terminal className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold text-lg">Raw Response Headers</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <div className="bg-[#0D1117] text-[#c9d1d9] rounded-md p-4 font-mono text-sm overflow-x-auto border border-border/50">
                {Object.entries(report.rawHeaders).map(([key, value]) => (
                  <div key={key} className="flex whitespace-nowrap mb-1">
                    <span className="text-[#79c0ff] min-w-[200px] inline-block">{key}:</span>
                    <span className="text-[#a5d6ff]">{value}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>

    </div>
  );
}
