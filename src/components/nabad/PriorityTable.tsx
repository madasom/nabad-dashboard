import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { computeCompositeScore } from "@/data/nabad";
import { Link } from "react-router-dom";
import { ScoredSite } from "@/hooks/useSitesData";

const statusBadge = (score: number) => {
  if (score >= 80) return <Badge className="bg-red-500 text-white">Deploy</Badge>;
  if (score >= 65) return <Badge className="bg-amber-500 text-white">Stage</Badge>;
  if (score >= 50) return <Badge className="bg-yellow-400 text-black">Monitor</Badge>;
  return <Badge variant="secondary">Stable</Badge>;
};

export const PriorityTable = ({ sites, isLoading = false }: { sites: ScoredSite[]; isLoading?: boolean }) => {
  const ranked = sites
    .map((s) => ({ site: s, score: s._score ?? computeCompositeScore(s) }))
    .sort((a, b) => b.score.composite - a.score.composite)
    .slice(0, 5);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold">Top 5 Sites (CVI)</p>
          <Link to="/targeting" className="text-sm text-primary font-semibold">
            Open Targeting
          </Link>
        </div>
        <div className="space-y-2">
          {isLoading &&
            Array.from({ length: 5 }).map((_, idx) => (
              <div key={`priority-table-skeleton-${idx}`} className="grid grid-cols-6 gap-2 text-sm items-center">
                <Skeleton className="h-4 w-6" />
                <Skeleton className="col-span-2 h-5 w-40" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <div className="flex justify-end">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            ))}
          {!isLoading && ranked.length === 0 && (
            <p className="text-sm text-muted-foreground">Loading site priorities failed or returned no rows.</p>
          )}
          {!isLoading &&
            ranked.map((r, idx) => (
              <div key={r.site.id ?? `${r.site.name}-${idx}`} className="grid grid-cols-6 gap-2 text-sm items-center">
                <span className="text-muted-foreground text-xs">#{idx + 1}</span>
                <span className="col-span-2 font-semibold">{r.site.name}</span>
                <span className="text-xs text-muted-foreground">
                  {r.site.households === null ? "HH unknown" : `${r.site.households} HH`}
                </span>
                <span className="text-xs text-muted-foreground">Arrivals: {r.site.newArrivals14d ?? "—"}</span>
                <div className="flex items-center gap-2 justify-end">{statusBadge(r.score.composite)}</div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};
