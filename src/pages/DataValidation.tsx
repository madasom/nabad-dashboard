import { DataValidationCard } from "@/components/nabad/DataValidationCard";
import { useSitesData } from "@/hooks/useSitesData";

const DataValidation = () => {
  const { data: siteProfiles } = useSitesData();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Data Validation</h1>
        <p className="page-description">
          Review duplicate site names, missing households, missing Penta3/GAM, and missing coordinates from live imported data.
        </p>
      </div>

      <DataValidationCard sites={siteProfiles} />
    </div>
  );
};

export default DataValidation;
