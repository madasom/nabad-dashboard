import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAlertsData } from "@/hooks/useAlertsData";
import { useImportsData } from "@/hooks/useImportsData";
import { useSitesData } from "@/hooks/useSitesData";
import { AlertTriangle, Database, Route, TimerReset, Truck, Users } from "lucide-react";
import { useMemo } from "react";

const formatImportStatus = (status: string) => {
  if (status === "done") return "Live";
  if (status === "failed") return "Attention needed";
  return status;
};

const cardTone = (status?: string) => {
  if (status === "done") return "secondary";
  if (status === "failed") return "destructive";
  return "outline";
};

export const RouteSafety = () => {
  const { data: sites, isLoading: sitesLoading } = useSitesData();
  const { data: alerts, isLoading: alertsLoading } = useAlertsData();
  const importsQuery = useImportsData();

  const districtSummary = useMemo(() => {
    const grouped = new Map<
      string,
      { district: string; arrivals: number; alerts: number; sites: number; topSite: string | null }
    >();

    for (const site of sites) {
      const district = site.district ?? "Unknown";
      const current = grouped.get(district) ?? {
        district,
        arrivals: 0,
        alerts: 0,
        sites: 0,
        topSite: null,
      };
      current.arrivals += site.newArrivals14d ?? 0;
      current.sites += 1;
      if (!current.topSite || (site.newArrivals14d ?? 0) > 0) current.topSite = site.name;
      grouped.set(district, current);
    }

    for (const alert of alerts ?? []) {
      const district = alert.district ?? "Unknown";
      const current = grouped.get(district) ?? {
        district,
        arrivals: 0,
        alerts: 0,
        sites: 0,
        topSite: null,
      };
      current.alerts += 1;
      grouped.set(district, current);
    }

    return [...grouped.values()].sort((a, b) => b.arrivals - a.arrivals || b.alerts - a.alerts).slice(0, 4);
  }, [alerts, sites]);

  const latestImport = importsQuery.data?.[0];
  const totalArrivals = sites.reduce((sum, site) => sum + (site.newArrivals14d ?? 0), 0);
  const highPriorityAlerts = (alerts ?? []).filter((alert) => ["critical", "high"].includes(alert.severity ?? "")).length;
  const topDistrict = districtSummary[0];
  const loading = sitesLoading || alertsLoading || importsQuery.isLoading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Operational Route Optimisation</CardTitle>
          <p className="text-sm text-muted-foreground">Live where the database supports it; unavailable where no operations dataset exists.</p>
        </div>
        <Badge variant={cardTone(latestImport?.status)} className="gap-1">
          <Truck className="h-4 w-4" />
          {latestImport ? `Latest sync ${formatImportStatus(latestImport.status)}` : "Awaiting sync"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={`ops-skeleton-${idx}`} className="rounded-xl border border-border/70 p-4 space-y-3">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))
          ) : (
            <>
              <div className="rounded-xl border border-border/70 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Latest external sync</p>
                  <Database className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-semibold">{latestImport?.filename ?? "No imports yet"}</p>
                <p className="text-sm text-muted-foreground">
                  {latestImport ? `${latestImport.importedRows ?? 0}/${latestImport.totalRows ?? 0} rows • ${formatImportStatus(latestImport.status)}` : "Import IOM, MOH, or registry files to populate live operations context."}
                </p>
              </div>

              <div className="rounded-xl border border-border/70 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Live displacement load</p>
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-semibold">{totalArrivals.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">
                  14-day arrivals across loaded sites. Top district: {topDistrict ? `${topDistrict.district} (${topDistrict.arrivals.toLocaleString()})` : "No district totals yet"}.
                </p>
              </div>

              <div className="rounded-xl border border-border/70 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Ground alert pressure</p>
                  <AlertTriangle className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-semibold">{highPriorityAlerts}</p>
                <p className="text-sm text-muted-foreground">
                  Critical/high community alerts in the live feed. {alerts?.length ?? 0} total alerts currently stored.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-border/70 rounded-xl p-4 bg-gradient-to-br from-emerald-50 to-background space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Route className="h-5 w-5 text-emerald-600" />
                <p className="font-semibold">District operational signals</p>
              </div>
              <Badge variant="outline">DB-backed</Badge>
            </div>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : districtSummary.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>District</TableHead>
                    <TableHead className="w-[120px]">Arrivals (14d)</TableHead>
                    <TableHead className="w-[110px]">Alerts</TableHead>
                    <TableHead>Lead site</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {districtSummary.map((district) => (
                    <TableRow key={district.district}>
                      <TableCell className="font-medium">{district.district}</TableCell>
                      <TableCell>{district.arrivals.toLocaleString()}</TableCell>
                      <TableCell>{district.alerts}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{district.topSite ?? "Unknown"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No live site and alert data available yet.</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="border border-dashed border-border/80 rounded-xl p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Route className="h-5 w-5 text-muted-foreground" />
                  <p className="font-semibold">Corridor safety index</p>
                </div>
                <Badge variant="outline">No live operations data</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                The database does not currently store corridor names, safety scores, or incident logs, so route-level safety cannot be computed honestly.
              </p>
            </div>

            <div className="border border-dashed border-border/80 rounded-xl p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TimerReset className="h-5 w-5 text-muted-foreground" />
                  <p className="font-semibold">A/B testing and speed to site</p>
                </div>
                <Badge variant="outline">No live operations data</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                There are no experiment-arm assignments, deployment timestamps, beneficiary costs, or response-time logs in the database yet.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
