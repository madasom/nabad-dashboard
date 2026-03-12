import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { computeCompositeScore, siteProfiles } from "@/data/nabad";
import { ScoredSite } from "@/hooks/useSitesData";
import { Activity, Lock, Radar, Waves } from "lucide-react";
import { useMode } from "@/context/ModeContext";

const boundsFromSites = (sites: Array<{ lat: number; lon: number }>) => ({
  lat: {
    min: Math.min(...sites.map((s) => s.lat)),
    max: Math.max(...sites.map((s) => s.lat)),
  },
  lon: {
    min: Math.min(...sites.map((s) => s.lon)),
    max: Math.max(...sites.map((s) => s.lon)),
  },
});

const heatColors = [
  { threshold: 80, className: "bg-red-500", label: "Deploy now" },
  { threshold: 65, className: "bg-amber-500", label: "Prepare / verify" },
  { threshold: 50, className: "bg-yellow-400", label: "Monitor" },
  { threshold: 0, className: "bg-emerald-500", label: "Stable" },
];

function markerColor(score: number) {
  return heatColors.find((c) => score >= c.threshold) ?? heatColors[heatColors.length - 1];
}

function toPercent(value: number, min: number, max: number) {
  return ((value - min) / (max - min)) * 100;
}

type HeatmapProps = {
  sites?: (typeof siteProfiles | ScoredSite[]);
  onSelect?: (siteName: string) => void;
  highlight?: string | null;
};

export const CviHeatmap = ({ sites = siteProfiles, onSelect, highlight }: HeatmapProps) => {
  const { execMode } = useMode();
  const normalized = (sites as any[]).map((s) => ({ ...s, _score: (s as any)._score ?? computeCompositeScore(s as any) }));
  const mappedSites = normalized.filter((site) => Number.isFinite(site.lat) && Number.isFinite(site.lon));
  const bounds = mappedSites.length > 0 ? boundsFromSites(mappedSites as any) : null;
  return (
    <Card className="border border-primary/10 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Composite Vulnerability Map (CVI)</CardTitle>
        <p className="text-sm text-muted-foreground">Prioritized sites, refreshed 14-day window</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Activity className="h-4 w-4" />
            CVI ≥ 65 triggers readiness
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Radar className="h-4 w-4" />
            Live: DHIS2 + IOM + CDMC
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-[360px] rounded-2xl overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(16,38,84,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(252,211,77,0.15),transparent_40%),linear-gradient(135deg,rgba(15,23,42,0.7),rgba(15,23,42,0.35))] border border-border/60 shadow-inner">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:48px_48px]" />
          <div className="absolute inset-4">
            {mappedSites.map((site) => {
              const score = (site as any)._score ?? computeCompositeScore(site);
              const color = markerColor(score.composite);
              const x = bounds ? toPercent(site.lon, bounds.lon.min, bounds.lon.max) : 50;
              const y = bounds ? toPercent(site.lat, bounds.lat.min, bounds.lat.max) : 50;

              return (
                <Tooltip key={site.name} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div
                      onClick={() => onSelect?.(site.name)}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${color.className} rounded-full shadow-lg shadow-black/20 border border-white/60 cursor-pointer ${highlight === site.name ? "ring-2 ring-white" : ""}`}
                      style={{
                        left: `${x}%`,
                        top: `${100 - y}%`,
                        width: "16px",
                        height: "16px",
                      }}
                    >
                      <div className="absolute inset-0 rounded-full animate-ping opacity-40 bg-white" />
                      {!execMode && site.safety < 0.45 && (
                        <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow">
                          <Lock className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="w-64">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{site.name}</p>
                      <Badge variant="secondary" className="capitalize">
                        {site.district}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      HH: {site.households === null ? "Unknown" : site.households.toLocaleString()} • New arrivals (14d): {site.newArrivals14d} • Penta3:{" "}
                      {site.penta3Coverage === null ? "Unknown" : `${site.penta3Coverage}%`} • GAM: {site.gam === null ? "Unknown" : `${site.gam}%`}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge className={`${color.className} text-white`}>
                        CVI {score.composite}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Needs {score.needsScore}% • Displacement {score.displacementRisk}%
                      </span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
            {mappedSites.length === 0 && (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No mapped site coordinates available.
              </div>
            )}
          </div>

          <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-full bg-background/80 px-3 py-2 text-xs border border-border/60 backdrop-blur">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Deploy
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Verify
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              Monitor
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Stable
            </span>
          </div>

          <div className="absolute bottom-3 right-3 flex items-center gap-2 text-xs text-muted-foreground bg-background/80 px-3 py-2 rounded-full border border-border/60 backdrop-blur">
            <Waves className="h-4 w-4" />
            Lat 2.08 – 2.09 • Lon 45.39 – 45.42
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
