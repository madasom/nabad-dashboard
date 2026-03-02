import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
    ["Community", score.communitySignals],
    ["Safety", score.safetyPenalty],
  ];
  return factors.sort((a, b) => b[1] - a[1])[0][0];
};

export const PriorityStack = ({ sites }: { sites: ScoredSite[] }) => {
  if (!sites || sites.length === 0) return null;
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
          Avg CVI {Math.round(avgCvi)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {topSites.map((site, idx) => {
          const action = actionLabel(site.score.composite);
          return (
            <div key={site.name} className="rounded-xl border border-border/70 p-3 hover:border-primary/40 transition">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">#{idx + 1}</span>
                    <p className="font-semibold">{site.name}</p>
                    <Badge variant="secondary" className="capitalize">
                      {site.district}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      Lead: {leadDriver(site.score)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    HH {site.households.toLocaleString()} • Arrivals 14d {site.newArrivals14d} • Penta3 {site.penta3Coverage}% •
                    GAM {site.gam}%
                  </p>
                </div>
                <Badge className={action.tone}>{action.text}</Badge>
              </div>
              <div className="mt-2 grid grid-cols-5 gap-2 text-[11px] text-muted-foreground">
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
            </div>
          );
        })}

        <Separator />
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldAlert className="h-4 w-4" />
            Lead indicator: displacement + Penta3 gap (30% each) with CDMC signals (15%)
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
