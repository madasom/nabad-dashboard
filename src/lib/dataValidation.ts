import type { ScoredSite } from "@/hooks/useSitesData";

export type DataValidationSummary = {
  totalSites: number;
  duplicateNameGroups: Array<{
    name: string;
    count: number;
    districts: string[];
    ids: string[];
  }>;
  missingHouseholds: ScoredSite[];
  missingPenta3: ScoredSite[];
  missingGam: ScoredSite[];
  missingCoordinates: ScoredSite[];
};

export function validateSitesData(sites: ScoredSite[]): DataValidationSummary {
  const byName = new Map<string, ScoredSite[]>();
  for (const site of sites) {
    const key = site.name.trim().toLowerCase();
    const bucket = byName.get(key) ?? [];
    bucket.push(site);
    byName.set(key, bucket);
  }

  const duplicateNameGroups = [...byName.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([, group]) => ({
      name: group[0].name,
      count: group.length,
      districts: [...new Set(group.map((site) => site.district))],
      ids: group.map((site) => site.id ?? site.name),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    totalSites: sites.length,
    duplicateNameGroups,
    missingHouseholds: sites.filter((site) => site.households === null),
    missingPenta3: sites.filter((site) => site.penta3Coverage === null),
    missingGam: sites.filter((site) => site.gam === null),
    missingCoordinates: sites.filter((site) => !Number.isFinite(site.lat) || !Number.isFinite(site.lon)),
  };
}
