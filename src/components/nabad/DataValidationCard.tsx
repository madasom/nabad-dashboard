import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { validateSitesData } from "@/lib/dataValidation";
import type { ScoredSite } from "@/hooks/useSitesData";
import { DatabaseZap, MapPinOff, ShieldAlert } from "lucide-react";

type Props = {
  sites: ScoredSite[];
  compact?: boolean;
};

export const DataValidationCard = ({ sites, compact = false }: Props) => {
  const summary = validateSitesData(sites);

  const metrics = [
    { label: "Duplicate names", value: summary.duplicateNameGroups.length },
    { label: "Missing HH", value: summary.missingHouseholds.length },
    { label: "Missing Penta3", value: summary.missingPenta3.length },
    { label: "Missing GAM", value: summary.missingGam.length },
    { label: "Missing GPS", value: summary.missingCoordinates.length },
  ];

  return (
    <Card>
      <CardHeader className={compact ? "pb-3" : undefined}>
        <CardTitle className="text-lg flex items-center gap-2">
          <DatabaseZap className="h-4 w-4" />
          Data Validation
        </CardTitle>
        <CardDescription>
          Live checks against imported site records and linked health indicators in the database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-border/70 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="text-lg font-semibold">{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
          <p className="font-medium">Coverage</p>
          <p className="text-muted-foreground">
            {summary.totalSites} sites loaded. {summary.totalSites - summary.missingHouseholds.length} have households,
            {" "}{summary.totalSites - summary.missingPenta3.length} have Penta3, and {summary.totalSites - summary.missingGam.length} have GAM.
          </p>
        </div>

        {!compact && (
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-border/70 p-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <p className="font-medium">Duplicate site names</p>
              </div>
              {summary.duplicateNameGroups.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No duplicate settlement names detected.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {summary.duplicateNameGroups.slice(0, 5).map((group) => (
                    <div key={group.ids.join("-")} className="rounded-md border border-border/70 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{group.name}</span>
                        <Badge variant="outline">{group.count} records</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Districts: {group.districts.join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border/70 p-3">
              <div className="flex items-center gap-2">
                <MapPinOff className="h-4 w-4 text-amber-600" />
                <p className="font-medium">Top data gaps</p>
              </div>
              <div className="mt-2 space-y-2 text-sm">
                {[
                  {
                    label: "Missing households",
                    sites: summary.missingHouseholds,
                  },
                  {
                    label: "Missing Penta3",
                    sites: summary.missingPenta3,
                  },
                  {
                    label: "Missing GAM",
                    sites: summary.missingGam,
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-md border border-border/70 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span>{item.label}</span>
                      <Badge variant="outline">{item.sites.length}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.sites.slice(0, 3).map((site) => site.name).join(", ") || "None"}
                      {item.sites.length > 3 ? ` +${item.sites.length - 3} more` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
