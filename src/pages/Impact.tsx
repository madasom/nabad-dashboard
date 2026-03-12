import { BeneficiaryImpact } from "@/components/nabad/BeneficiaryImpact";
import { Card, CardContent } from "@/components/ui/card";

const Impact = () => {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Beneficiary & Impact Tracking</h1>
        <p className="text-muted-foreground">
          Track live displacement composition and imported health trends, with clear gaps shown where impact data is not yet stored.
        </p>
      </div>

      <BeneficiaryImpact />

      <Card className="border-dashed">
        <CardContent className="p-4 text-sm text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Learning questions</p>
          <ul className="list-disc list-inside space-y-1">
            <li>How is the displacement SADD composition shifting across districts over time?</li>
            <li>Do imported Penta3 coverage observations indicate improving or worsening service continuity?</li>
            <li>Which impact dimensions still need new database fields before they can be monitored live?</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default Impact;
