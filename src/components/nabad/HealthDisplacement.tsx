import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Stethoscope, ThermometerSun, Truck } from "lucide-react";
import { ScoredSite } from "@/hooks/useSitesData";

function summarizeDistrict(district: string, sites: ScoredSite[]) {
  const filtered = sites.filter((s) => s.district === district);
  if (!filtered.length) {
    return {
      penta3: null,
      gam: null,
      arrivals: 0,
      noSiteRows: true,
      gamIsProxy: false,
      gamSourceLabel: null,
    };
  }
  const penta3Sites = filtered.filter((s) => s.penta3Coverage !== null);
  const gamSites = filtered.filter((s) => s.gam !== null);
  const penta3 = penta3Sites.length
    ? penta3Sites.reduce((acc, s) => acc + (s.penta3Coverage ?? 0), 0) / penta3Sites.length
    : null;
  const gam = gamSites.length
    ? gamSites.reduce((acc, s) => acc + (s.gam ?? 0), 0) / gamSites.length
    : null;
  const arrivals = filtered.reduce((acc, s) => acc + (s.newArrivals14d ?? 0), 0);
  const gamSourceLabel =
    typeof gamSites[0]?.raw?.__gamSource === "object" &&
    gamSites[0].raw?.__gamSource !== null &&
    "locationName" in gamSites[0].raw.__gamSource
      ? String(gamSites[0].raw.__gamSource.locationName)
      : null;
  const gamIsProxy =
    Boolean(gamSourceLabel) &&
    !gamSourceLabel!.toLowerCase().includes(district.toLowerCase());
  return {
    penta3: penta3 === null ? null : Math.round(penta3),
    gam: gam === null ? null : Number(gam.toFixed(1)),
    arrivals,
    noSiteRows: false,
    gamIsProxy,
    gamSourceLabel,
  };
}

export const HealthDisplacement = ({ sites }: { sites: ScoredSite[] }) => {
  const districts = [...new Set(sites.map((site) => site.district).filter(Boolean))]
    .sort((a, b) => {
      const aRows = sites.filter((site) => site.district === a).length;
      const bRows = sites.filter((site) => site.district === b).length;
      return bRows - aRows;
    })
    .slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Health + Displacement Signals</CardTitle>
          <Badge variant="outline" className="gap-1">
            <ThermometerSun className="h-4 w-4" />
            Alerts: Penta3 &lt; 50% or GAM &gt; 15%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {districts.map((district) => {
          const summary = summarizeDistrict(district, sites);
          const gamRisk = summary.gam === null ? 0 : Math.min(100, (summary.gam / 25) * 100);
          return (
            <div key={district} className="rounded-xl border border-border/70 p-4 space-y-3 bg-gradient-to-br from-primary/5 via-card to-background">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  <p className="font-semibold">{district}</p>
                </div>
                <Badge variant="secondary">Arrivals: {summary.arrivals}</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Penta3 coverage</span>
                  <span className={summary.penta3 === null ? "text-muted-foreground" : summary.penta3 < 50 ? "text-red-600" : "text-emerald-600"}>
                    {summary.penta3 === null ? "Unknown" : `${summary.penta3}%`}
                  </span>
                </div>
                <Progress value={summary.penta3 ?? 0} className="h-2" />
                <div className="flex items-center justify-between text-sm">
                  <span>GAM prevalence</span>
                  <span className={summary.gam === null ? "text-muted-foreground" : summary.gam > 15 ? "text-red-600" : "text-emerald-600"}>
                    {summary.gam === null ? "Unknown" : `${summary.gam}%`}
                  </span>
                </div>
                <Progress value={gamRisk} className="h-2 bg-amber-100" />
                {summary.gamIsProxy && summary.gamSourceLabel && (
                  <p className="text-[11px] text-amber-700">
                    Regional proxy from {summary.gamSourceLabel}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Truck className="h-3.5 w-3.5" />
                {summary.noSiteRows
                  ? "No site rows loaded for this district"
                  : `${summary.arrivals.toLocaleString()} new arrivals (14d) flagged by IOM ETT`}
              </div>
            </div>
          );
        })}
        {districts.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
            No scoped district data loaded yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
