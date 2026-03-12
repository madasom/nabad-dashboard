import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { computeCompositeScore } from "@/data/nabad";
import { ScoredSite } from "@/hooks/useSitesData";
import { ShieldAlert, Siren, Sparkles } from "lucide-react";

const actionLabel = (score: number) => {
  if (score >= 80) return { text: "Deploy now", tone: "bg-red-500 text-white" };
  if (score >= 65) return { text: "Stage team", tone: "bg-amber-500 text-white" };
  if (score >= 50) return { text: "Monitor", tone: "bg-yellow-500 text-white" };
  return { text: "Stable", tone: "bg-emerald-500 text-white" };
};

const leadDriver = (score: ReturnType<typeof computeCompositeScore>) => {
  const factors: [string, number][] = [
    ["Displacement", score.displacementRisk],
    ["Health", score.healthRisk],
    ["Needs", score.needsScore],
    ["Community/MOH Alerts", score.communitySignals],
  ];
  return factors.sort((a, b) => b[1] - a[1])[0][0];
};

export const PriorityStack = ({ sites, isLoading = false }: { sites: ScoredSite[]; isLoading?: boolean }) => {
  if (!isLoading && (!sites || sites.length === 0)) return null;
  const scored = sites.map((s) => ({ ...s, score: s._score ?? computeCompositeScore(s) }));
  const topSites = scored
    .sort((a, b) => b.score.composite - a.score.composite)
    .slice(0, 8);
  const avgCvi = scored.length
    ? Math.round(scored.reduce((acc, s) => acc + s.score.composite, 0) / scored.length)
    : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Priority Stack</CardTitle>
          <p className="text-sm text-muted-foreground">Sorted by Composite Vulnerability Index (CVI)</p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Sparkles className="h-4 w-4" />
          {isLoading ? "Loading CVI..." : `Avg CVI ${Math.round(avgCvi)}`}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading &&
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={`priority-stack-skeleton-${idx}`} className="rounded-xl border border-border/70 p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 5 }).map((__, metricIdx) => (
                  <div key={`priority-stack-metric-${idx}-${metricIdx}`} className="space-y-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        {!isLoading &&
          topSites.map((site, idx) => {
            const action = actionLabel(site.score.composite);
            const householdsLabel = site.households === null ? "HH unknown" : `HH ${site.households.toLocaleString()}`;
            const penta3Label = site.penta3Coverage === null ? "Penta3 unknown" : `Penta3 ${site.penta3Coverage}%`;
            const gamLabel = site.gam === null ? "GAM unknown" : `GAM ${site.gam}%`;

            return (
              <div key={site.id ?? `${site.name}-${idx}`} className="rounded-xl border border-border/70 p-3 hover:border-primary/40 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">#{idx + 1}</span>
                      <p className="font-semibold">{site.name}</p>
                      <Badge variant="secondary" className="capitalize">
                        {site.district}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {householdsLabel} • Arrivals 14d {site.newArrivals14d} • {penta3Label} • {gamLabel}
                    </p>
                  </div>
                  <Badge className={action.tone}>{action.text}</Badge>
                </div>

                <div className="mt-2 overflow-x-auto pb-1">
                  <div className="grid min-w-[520px] grid-cols-5 gap-2 text-[11px] text-muted-foreground">
                    <div>
                      <p className="font-semibold text-foreground text-xs">CVI</p>
                      <Progress value={site.score.composite} className="h-1.5" />
                      <span>{site.score.composite}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-xs">Displacement</p>
                      <Progress value={site.score.displacementRisk} className="h-1.5" />
                      <span>{site.score.displacementRisk}%</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-xs">Health</p>
                      <Progress value={site.score.healthRisk} className="h-1.5" />
                      <span>{site.score.healthRisk}%</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-xs">Needs</p>
                      <Progress value={site.score.needsScore} className="h-1.5" />
                      <span>{site.score.needsScore}%</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-xs">Community</p>
                      <Progress value={site.score.communitySignals} className="h-1.5" />
                      <span>{site.score.communitySignals}%</span>
                    </div>
                  </div>

                      <Badge variant="outline" className="text-[10px]">
                        Lead: {leadDriver(site.score)}
                      </Badge>
                </div>
              </div>
            );
          })}

        <Separator />
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldAlert className="h-4 w-4" />
        CVI weights: displacement 30%, health 30%, needs 25%, community/MOH alerts 50%
          </div>
          <Badge variant="outline" className="gap-1">
            <Siren className="h-4 w-4" />
            Trigger CVI ≥ 65
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
