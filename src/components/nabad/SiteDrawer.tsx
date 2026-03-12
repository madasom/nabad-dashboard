import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { computeCompositeScore } from "@/data/nabad";
import { ScoredSite } from "@/hooks/useSitesData";
import { useAlertsData } from "@/hooks/useAlertsData";
import { useCommunityResponses } from "@/hooks/useCommunityResponses";
import { normalizeCommunityResponse, responseMatchesSite } from "@/lib/communityResponses";
import { format } from "date-fns";
import { Activity, AlertTriangle, ClipboardList, Radio, Shield } from "lucide-react";

type Props = {
  siteName: string | null;
  sites: ScoredSite[];
};

export const SiteDrawer = ({ siteName, sites }: Props) => {
  if (!siteName) return null;
  const site = sites.find((s) => s.name === siteName);
  if (!site) return null;
  const score = site._score ?? computeCompositeScore(site);
  const { data: alertsData } = useAlertsData();
  const communityResponsesQuery = useCommunityResponses();
  const alerts = (alertsData ?? []).filter((a) => a.siteName === site.name);
  const matchedCommunityResponses = (communityResponsesQuery.data ?? [])
    .filter((response) => responseMatchesSite(response, site))
    .map(normalizeCommunityResponse)
    .slice(0, 4);

  const lead = (() => {
    const factors: [string, number][] = [
      ["Displacement", score.displacementRisk],
      ["Health", score.healthRisk],
      ["Needs", score.needsScore],
      ["Community/MOH Alerts", score.communitySignals],
    ];
    return factors.sort((a, b) => b[1] - a[1])[0][0];
  })();

  const factors = [
    { label: "Displacement", value: score.displacementRisk },
    { label: "Health", value: score.healthRisk },
    { label: "Needs", value: score.needsScore },
    { label: "Community/MOH Alerts", value: score.communitySignals },
  ];

  const importedResponses = site.responses ?? {};
  const householdsLabel = site.households === null ? "Unknown" : site.households.toLocaleString();
  const penta3Label = site.penta3Coverage === null ? "Unknown" : `${site.penta3Coverage}%`;
  const gamLabel = site.gam === null ? "Unknown" : `${site.gam}%`;

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-lg">{site.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{site.district}</p>
          </div>
          <Badge className="gap-1">
            <Activity className="h-4 w-4" />
            CVI {score.composite}
          </Badge>
          <Badge variant="secondary">Lead: {lead}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>HH: {householdsLabel}</div>
          <div>New arrivals (14d): {site.newArrivals14d ?? "—"}</div>
          <div>Penta3: {penta3Label}</div>
          <div>GAM: {gamLabel}</div>
          {site.mainNeed && <div>Main need: {site.mainNeed}</div>}
          {(site.mainCause || site.hazardCause || site.conflictCause) && (
            <div className="col-span-2">Cause: {site.mainCause ?? site.hazardCause ?? site.conflictCause}</div>
          )}
          {site.originRegion && (
            <div className="col-span-2">
              Origin: {site.originRegion}
              {site.originDistrict ? ` / ${site.originDistrict}` : ""} {site.originLocation ? ` / ${site.originLocation}` : ""}
            </div>
          )}
          {site.dataCollectionWeek && <div className="col-span-2">Data week: {site.dataCollectionWeek}</div>}
          <div className="col-span-2 flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            Needs: Protection/Food/Health/WASH/New arrivals flagged if “Yes”
          </div>
        </div>
        <br/>
        <br/>

        <div className="space-y-2">
          {factors.map((f) => (
            <div key={f.label}>
              <div className="flex justify-between text-xs text-muted-foreground mt-4">
                <span>{f.label}</span>
                <span>{f.value}%</span>
              </div>
              <Progress value={f.value} className="h-2" />
            </div>
          ))}
        </div>

        <div className="space-y-2">
              <br/>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Radio className="h-4 w-4 text-primary" /> Ground alerts
          </div>
          {alerts.length === 0 && <p className="text-xs text-muted-foreground">No community alerts yet.</p>}
          {alerts.map((a) => (
            <div key={a.id} className="text-xs border border-border rounded-lg p-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {a.category}
                </Badge>
                <Badge className="capitalize">{a.severity}</Badge>
              </div>
              <p className="mt-1 text-sm">{a.message}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="h-4 w-4 text-primary" /> Community form submissions
          </div>
          {matchedCommunityResponses.length === 0 ? (
            <p className="text-xs text-muted-foreground">No matched community form submissions for this site yet.</p>
          ) : (
            matchedCommunityResponses.map((response) => (
              <div key={response.id} className="text-xs border border-border rounded-lg p-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">{response.formTitle}</Badge>
                  <span className="text-muted-foreground">{format(new Date(response.submittedAt), "dd MMM yyyy, HH:mm")}</span>
                </div>
                <p className="text-sm">{response.summary}</p>
                <p className="text-muted-foreground">
                  {response.siteLabel}
                  {response.districtLabel !== "Unspecified area" ? ` • ${response.districtLabel}` : ""}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Shield className="h-4 w-4 text-primary" /> Imported service responses
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(importedResponses)
              .filter(([, v]) => v)
              .map(([k]) => (
                <Badge key={k} variant="secondary" className="capitalize">
                  {k}
                </Badge>
              ))}
            {Object.entries(importedResponses).filter(([, v]) => v).length === 0 && (
              <p className="text-xs text-muted-foreground">No responses recorded in the imported site dataset.</p>
            )}
          </div>
        </div>

        {site.safety < 0.45 && (
          <div className="flex items-center gap- text-xs text-red-600">
            <Shield className="h-4 w-4" />
            Safety override needed (score &lt; 45%)
          </div>
        )}
      </CardContent>
    </Card>
  );
};
