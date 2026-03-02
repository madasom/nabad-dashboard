import { AlertsTicker } from "@/components/nabad/AlertsTicker";
import { Choropleth } from "@/components/nabad/Choropleth";
import { PriorityStack } from "@/components/nabad/PriorityStack";
import { RouteSafety } from "@/components/nabad/RouteSafety";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataPrecedenceCard } from "@/components/nabad/DataPrecedenceCard";
import { defaultWeights } from "@/data/nabad";
import { ArrowRight, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PriorityTable } from "@/components/nabad/PriorityTable";
import { useSitesData } from "@/hooks/useSitesData";
import { useImportsData } from "@/hooks/useImportsData";

const Dashboard = () => {
  const { data: siteProfiles } = useSitesData();
  const imports = useImportsData();

  const latestImport = imports.data?.[0];
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">DawaSom — Vulnerability Brain</h1>
          <p className="text-muted-foreground">
            Composite Vulnerability Index driving deployments (as of 25 Feb 2026)
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Settings2 className="h-4 w-4" />
          Weights: Displacement {defaultWeights.displacement * 100}%, Health {defaultWeights.health * 100}%, Community{" "}
          {defaultWeights.community * 100}%
        </Badge>
        {latestImport && (
          <Badge variant={latestImport.status === "done" ? "secondary" : latestImport.status === "failed" ? "destructive" : "outline"}>
            Latest import: {latestImport.filename} ({latestImport.status})
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3 space-y-4">
          <PriorityTable sites={siteProfiles} />
          <Choropleth sites={siteProfiles} />
          <RouteSafety />
          <DataPrecedenceCard />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { title: "Targeting", desc: "Tune weights, view health + displacement signals", to: "/targeting" },
              { title: "Operations", desc: "Cycle timelines, corridor safety, A/B toggle", to: "/operations" },
              { title: "Impact", desc: "SADD reach, service mix, vaccination dropout trend", to: "/impact" },
            ].map((item) => (
              <Card key={item.title} className="border-dashed hover:border-primary/50 transition">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{item.title}</p>
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                  <Link to={item.to} className="text-sm text-primary font-semibold mt-2 inline-flex items-center gap-1">
                    Open {item.title}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-dashed">
            <CardContent className="p-4 text-sm text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">How decisions are made</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Lead indicator: IOM ETT new-arrival intensity + DHIS2 Penta3 coverage. Alert when Penta3 &lt; 50% or GAM
                  &gt; 15% in any district.
                </li>
                <li>Needs (Protection, Food, Health/Nutrition, Wash, New Arrivals) are critical if marked “Yes”.</li>
                <li>
                  CVI ≥ 65 → stage deployment; CVI ≥ 80 + critical need → immediate deployment, with corridor safety override if
                  safety &lt; 45%.
                </li>
                <li>A/B testing keeps control sites constant to measure speed-to-site and cost-per-beneficiary.</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <PriorityStack sites={siteProfiles} />
          <AlertsTicker />
          {imports.isError && <p className="text-xs text-destructive">Failed to load import status</p>}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
