import { AlertsTicker } from "@/components/nabad/AlertsTicker";
import { CviHeatmap } from "@/components/nabad/CviHeatmap";
import { HealthDisplacement } from "@/components/nabad/HealthDisplacement";
import { PriorityStack } from "@/components/nabad/PriorityStack";
import { SiteDrawer } from "@/components/nabad/SiteDrawer";
import { SiteFilters } from "@/components/nabad/SiteFilters";
import { Choropleth } from "@/components/nabad/Choropleth";
import { DataPrecedenceCard } from "@/components/nabad/DataPrecedenceCard";
import { Card, CardContent } from "@/components/ui/card";
import { defaultWeights } from "@/data/nabad";
import { Settings2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useSitesData } from "@/hooks/useSitesData";

const Targeting = () => {
  const { data: siteProfiles, isLoading: sitesLoading } = useSitesData();
  const [selected, setSelected] = useState<string | null>(siteProfiles[0]?.name ?? null);
  const [filters, setFilters] = useState({ threshold: 50, district: "all", onlySafe: false });

  const filteredSites = useMemo(() => {
    return siteProfiles.filter((s) => {
      if (filters.district !== "all" && s.district !== filters.district) return false;
      const score = s.newArrivals14d ?? 0;
      const comp = score;
      const meetsScore = comp >= filters.threshold;
      const safe = filters.onlySafe ? s.safety >= 0.45 : true;
      return meetsScore && safe;
    });
  }, [filters, siteProfiles]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Predictive Targeting Engine</h1>
          <p className="text-muted-foreground">
            CVI blends displacement, health, needs, and community/MOH alert signals.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Settings2 className="h-4 w-4" />
          Weights: displacement {defaultWeights.displacement * 100}%, health {defaultWeights.health * 100}%, needs{" "}
          {defaultWeights.needs * 100}%, community/MOH alerts {defaultWeights.community * 100}%
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <Choropleth
            sites={filteredSites.length ? filteredSites : siteProfiles}
            onSelect={setSelected}
            selected={selected}
            isLoading={sitesLoading}
          />
          <HealthDisplacement sites={siteProfiles} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <AlertsTicker />
            <SiteDrawer siteName={selected} sites={siteProfiles} />
          </div>
          <DataPrecedenceCard compact />
        </div>
        <div className="lg:col-span-1 space-y-4">
          <SiteFilters
            threshold={filters.threshold}
            district={filters.district}
            onlySafe={filters.onlySafe}
            onChange={setFilters}
            sites={siteProfiles}
          />
          <PriorityStack sites={siteProfiles} isLoading={sitesLoading} />
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-4 text-sm text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Decision rules</p>
          <ul className="list-disc list-inside space-y-1">
            <li>CVI ≥ 65 → stage deployment; CVI ≥ 80 + critical need → deploy.</li>
            <li>Hotspot thresholds: Penta3 &lt; 50%; GAM &gt; 15%; new arrivals &gt; 15% of HH in 14d.</li>
            <li>Community and MOH alerts contribute 50% of CVI; corridor safety remains an operational check outside CVI.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default Targeting;
