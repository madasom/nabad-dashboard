import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useIndicatorObservations } from "@/hooks/useIndicatorObservations";
import { useSitesData } from "@/hooks/useSitesData";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HeartPulse, Users, AlertCircle } from "lucide-react";
import { useMemo } from "react";

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
}

function formatDateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export const BeneficiaryImpact = () => {
  const { data: sites, isLoading: sitesLoading } = useSitesData();
  const pentaQuery = useIndicatorObservations("penta3");

  const displacementComposition = useMemo(() => {
    const totals = sites.reduce(
      (acc, site) => {
        acc.female += site.arrivalsFemale ?? 0;
        acc.male += site.arrivalsMale ?? 0;
        acc.children += site.arrivalsChildren ?? 0;
        return acc;
      },
      { female: 0, male: 0, children: 0 },
    );
    const total = totals.female + totals.male + totals.children;
    return {
      ...totals,
      total,
      femalePct: percent(totals.female, total),
      malePct: percent(totals.male, total),
      childrenPct: percent(totals.children, total),
    };
  }, [sites]);

  const districtComposition = useMemo(() => {
    const grouped = new Map<string, { district: string; female: number; male: number; children: number }>();
    for (const site of sites) {
      const district = site.district ?? "Unknown";
      const current = grouped.get(district) ?? { district, female: 0, male: 0, children: 0 };
      current.female += site.arrivalsFemale ?? 0;
      current.male += site.arrivalsMale ?? 0;
      current.children += site.arrivalsChildren ?? 0;
      grouped.set(district, current);
    }
    return [...grouped.values()]
      .map((row) => ({ ...row, total: row.female + row.male + row.children }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  }, [sites]);

  const pentaSeries = useMemo(() => {
    const observations = pentaQuery.data ?? [];
    const byLocation = observations.reduce<Record<string, typeof observations>>((acc, observation) => {
      acc[observation.locationName] = [...(acc[observation.locationName] ?? []), observation];
      return acc;
    }, {});

    const leadLocation = Object.entries(byLocation).sort((a, b) => b[1].length - a[1].length)[0];
    if (!leadLocation) return { location: null, points: [] as Array<{ period: string; coverage: number }> };

    const [location, series] = leadLocation;
    const points = [...series]
      .sort((a, b) => {
        const aTime = a.periodDate ? new Date(a.periodDate).getTime() : 0;
        const bTime = b.periodDate ? new Date(b.periodDate).getTime() : 0;
        return aTime - bTime;
      })
      .map((point) => ({
        period: point.periodDate ?? point.periodLabel,
        coverage: Math.round(point.value * 10) / 10,
      }));

    return { location, points };
  }, [pentaQuery.data]);

  const loading = sitesLoading || pentaQuery.isLoading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Beneficiary & Impact Tracking</CardTitle>
          <p className="text-sm text-muted-foreground">Live where site and imported indicator data exists; clearly marked where it does not.</p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <HeartPulse className="h-4 w-4" />
          Mixed live view
        </Badge>
      </CardHeader>
      <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={`impact-skeleton-${idx}`} className="rounded-xl border border-border/70 p-4 space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))
          ) : (
            <>
              <div className="rounded-xl border border-border/70 p-4">
                <p className="text-sm font-semibold mb-2">Female arrivals share</p>
                <Progress value={displacementComposition.femalePct} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{displacementComposition.female.toLocaleString()} arrivals</span>
                  <span>{displacementComposition.femalePct}% of reported SADD split</span>
                </div>
              </div>
              <div className="rounded-xl border border-border/70 p-4">
                <p className="text-sm font-semibold mb-2">Male arrivals share</p>
                <Progress value={displacementComposition.malePct} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{displacementComposition.male.toLocaleString()} arrivals</span>
                  <span>{displacementComposition.malePct}% of reported SADD split</span>
                </div>
              </div>
              <div className="rounded-xl border border-border/70 p-4">
                <p className="text-sm font-semibold mb-2">Children arrivals share</p>
                <Progress value={displacementComposition.childrenPct} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{displacementComposition.children.toLocaleString()} arrivals</span>
                  <span>{displacementComposition.childrenPct}% of reported SADD split</span>
                </div>
              </div>
              <div className="rounded-xl border border-dashed border-border/70 p-4 bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">Minority / disability reach</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Not live yet. The current database does not store minority-clan or disability participation fields.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/70 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">District arrival composition</p>
              <Badge variant="outline" className="gap-1">
                <Users className="h-3.5 w-3.5" />
                DB-backed
              </Badge>
            </div>
            <div className="h-48">
              {loading ? (
                <Skeleton className="h-full w-full rounded-lg" />
              ) : districtComposition.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={districtComposition} margin={{ left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="district" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <ReTooltip />
                    <Legend />
                    <Bar dataKey="female" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="male" fill="#0f766e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="children" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No live SADD split available yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 p-3">
            <div className="flex items-center justify-between mb-2 gap-2">
              <p className="text-sm font-semibold">Imported Penta3 coverage trend</p>
              <Badge variant="outline">
                {pentaSeries.location ? pentaSeries.location : "No source mapped"}
              </Badge>
            </div>
            <div className="h-48">
              {loading ? (
                <Skeleton className="h-full w-full rounded-lg" />
              ) : pentaSeries.points.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pentaSeries.points} margin={{ left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} tickFormatter={formatDateLabel} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <ReTooltip labelFormatter={(value) => formatDateLabel(String(value))} />
                    <Legend />
                    <Line type="monotone" dataKey="coverage" name="Penta3 %" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No imported Penta3 observation series available yet.
                </div>
              )}
            </div>
            {!loading && pentaSeries.points.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Trend uses the imported facility/location with the most monthly Penta3 observations currently in the database.
              </p>
            )}
          </div>

          <div className="lg:col-span-2 rounded-xl border border-dashed border-border/70 p-4 bg-muted/20">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Predictive vs control service uptake</p>
              <Badge variant="outline">No live impact experiment data</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              The current database does not store experiment-arm assignments, service uptake outcomes, cross-sector linkage events, or cost-per-beneficiary records, so those comparisons cannot be computed honestly yet.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
