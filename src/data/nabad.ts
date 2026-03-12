import { subDays } from "date-fns";
import { generatedSites, generatedDisplacement } from "./nabad.generated";

export type NeedType = "protection" | "food" | "health" | "wash" | "newArrivals";

export interface SiteProfile {
  name: string;
  district: string;
  households: number | null;
  lat: number | null;
  lon: number | null;
  needs: Record<NeedType, boolean>;
  penta3Coverage: number | null; // percentage
  gam: number | null; // percentage
  newArrivals14d: number;
  safety: number; // 0-1, higher is safer
  lastReport: string;
}

export interface CommunityAlert {
  id: string;
  site: string;
  district: SiteProfile["district"];
  channel: "SMS" | "CDMC" | "Hotline";
  message: string;
  severity: "critical" | "high" | "medium" | "low";
  category: NeedType;
  reportedAt: string;
}

export interface DisplacementEvent {
  id: string;
  site: string;
  district: SiteProfile["district"];
  arrivals: number;
  reportedAt: string;
}

export interface BeneficiaryProgress {
  female: number;
  femaleTarget: number;
  minority: number;
  minorityTarget: number;
  cwd: number; // children with disabilities
  cwdTarget: number;
}

export interface AbTestSnapshot {
  predictiveCostPerBen: number;
  controlCostPerBen: number;
  predictiveUptake: number;
  controlUptake: number;
  sampleSites: number;
}

export interface DeploymentCycle {
  cycle: string;
  window: string;
  focus: string;
  status: "planned" | "in-progress" | "complete";
  completion: number;
}

const districtRotation: SiteProfile["district"][] = ["Dayniile", "Hodan", "Kahda"];
const healthByDistrict: Record<string, { penta3: number; gam: number }> = {
  Dayniile: { penta3: 44, gam: 16.8 },
  Hodan: { penta3: 52, gam: 14.1 },
  Kahda: { penta3: 39, gam: 17.5 },
};
const needPatterns: NeedType[][] = [
  ["protection", "health", "wash", "newArrivals"],
  ["food", "health", "newArrivals"],
  ["protection", "food", "wash"],
  ["health"],
  ["wash", "newArrivals"],
];

export const siteProfiles: SiteProfile[] = generatedSites.map((site, idx) => {
  const district = (site.district as SiteProfile["district"]) ?? districtRotation[idx % districtRotation.length];
  const needs = needPatterns[idx % needPatterns.length].reduce(
    (acc, key) => ({ ...acc, [key]: true }),
    { protection: false, food: false, health: false, wash: false, newArrivals: false }
  );
  const penta = healthByDistrict[district] ?? { penta3: 45, gam: 15.5 };
  return {
    ...site,
    district,
    needs,
    penta3Coverage: penta.penta3 - (idx % 3 === 0 ? 4 : 0),
    gam: penta.gam + (idx % 2 === 0 ? 0.6 : -0.4),
    safety: 0.45 + ((idx * 7) % 30) / 100,
    lastReport: subDays(new Date(), idx % 5).toISOString(),
  };
});

export const communityAlerts: CommunityAlert[] = [
  {
    id: "SMS-250843",
    site: "Ceel Siyaad",
    district: "Dayniile",
    channel: "SMS",
    message: "New informal shelters near borehole; latrine overflow and harassment risk after dark.",
    severity: "critical",
    category: "wash",
    reportedAt: "2026-02-25T08:43:47+03:00",
  },
  {
    id: "SMS-250846",
    site: "Dan Hiil",
    district: "Hodan",
    channel: "SMS",
    message: "GBV referral from CDMC: 2 incidents reported; request lighting and patrols.",
    severity: "high",
    category: "protection",
    reportedAt: "2026-02-25T08:46:26+03:00",
  },
  {
    id: "SMS-250852",
    site: "Banaaneey",
    district: "Kahda",
    channel: "CDMC",
    message: "Acute watery diarrhoea cases reported, nearest clinic 7km away.",
    severity: "high",
    category: "health",
    reportedAt: "2026-02-25T08:52:00+03:00",
  },
  {
    id: "SMS-250901",
    site: "Ceel Muluq",
    district: "Dayniile",
    channel: "Hotline",
    message: "Shelter fire contained; 14 HH displaced and need tarps + WASH.",
    severity: "medium",
    category: "food",
    reportedAt: "2026-02-25T09:01:00+03:00",
  },
  {
    id: "SMS-250915",
    site: "Godgale",
    district: "Hodan",
    channel: "SMS",
    message: "Spontaneous arrivals from Afgooye corridor; request rapid registration.",
    severity: "medium",
    category: "newArrivals",
    reportedAt: "2026-02-25T09:15:00+03:00",
  },
  {
    id: "SMS-250930",
    site: "Wadani",
    district: "Kahda",
    channel: "SMS",
    message: "Water trucking delayed 3 days; women walking 2km to fetch water.",
    severity: "high",
    category: "wash",
    reportedAt: "2026-02-25T09:30:00+03:00",
  },
];

export const displacementEvents: DisplacementEvent[] = generatedDisplacement.length
  ? generatedDisplacement.map((d, idx) => ({ ...d, id: d.id ?? `ETT-${idx + 1}` }))
  : siteProfiles.slice(0, 12).map((site, idx) => ({
      id: `ETT-${2900 + idx}`,
      site: site.name,
      district: site.district,
      arrivals: Math.round(site.newArrivals14d * (0.5 + (idx % 3) * 0.2)),
      reportedAt: subDays(new Date(), idx % 7).toISOString(),
    }));

export const beneficiaryProgress: BeneficiaryProgress = {
  female: 58,
  femaleTarget: 60,
  minority: 32,
  minorityTarget: 35,
  cwd: 11,
  cwdTarget: 12,
};

export const abTestSnapshot: AbTestSnapshot = {
  predictiveCostPerBen: 9.8,
  controlCostPerBen: 13.4,
  predictiveUptake: 72,
  controlUptake: 54,
  sampleSites: 9,
};

export const deploymentCycles: DeploymentCycle[] = [
  {
    cycle: "Cycle 1 (Jan–Mar)",
    window: "05 Jan – 05 Mar 2026",
    focus: "Predictive: Ceel Siyaad cluster; Control: Hodan town clinics",
    status: "in-progress",
    completion: 62,
  },
  {
    cycle: "Cycle 2 (Mar–May)",
    window: "10 Mar – 10 May 2026",
    focus: "Kahda mixed sites + night safety validation",
    status: "planned",
    completion: 12,
  },
  {
    cycle: "Cycle 3 (May–Jul)",
    window: "18 May – 18 Jul 2026",
    focus: "Backfill hotspots + shelter/GBV surge",
    status: "planned",
    completion: 5,
  },
];

export const defaultWeights = {
  displacement: 0.3,
  health: 0.3,
  needs: 0.25,
  community: 0.5,
};

const severityWeight: Record<CommunityAlert["severity"], number> = {
  critical: 1,
  high: 0.8,
  medium: 0.5,
  low: 0.25,
};

export function computeCompositeScore(
  site: SiteProfile,
  weights = defaultWeights,
  alertFeed: CommunityAlert[] = communityAlerts
) {
  const pentaRisk = site.penta3Coverage === null ? null : 1 - site.penta3Coverage / 100;
  const gamRisk = site.gam === null ? null : site.gam / 20;
  const healthSignals = [
    pentaRisk === null ? null : { value: pentaRisk, weight: 0.6 },
    gamRisk === null ? null : { value: gamRisk, weight: 0.4 },
  ].filter((signal): signal is { value: number; weight: number } => signal !== null);
  const healthRisk = healthSignals.length
    ? healthSignals.reduce((acc, signal) => acc + signal.value * signal.weight, 0) /
      healthSignals.reduce((acc, signal) => acc + signal.weight, 0)
    : 0;
  const displacementRisk = Math.min(site.newArrivals14d / 250, 1);
  const needsScore =
    (site.needs.protection ? 1 : 0) +
    (site.needs.food ? 1 : 0) +
    (site.needs.health ? 1 : 0) +
    (site.needs.wash ? 1 : 0) +
    (site.needs.newArrivals ? 1 : 0);

  const communitySignals = alertFeed
    .filter((a) => a.site === site.name)
    .reduce((acc, a) => acc + severityWeight[a.severity], 0);

  const safetyPenalty = 1 - site.safety;

  const normalizedNeeds = needsScore / 5;
  const normalizedCommunity = Math.min(communitySignals / 3, 1);

  const composite =
    weights.displacement * displacementRisk +
    weights.health * healthRisk +
    weights.needs * normalizedNeeds +
    weights.community * normalizedCommunity;

  return {
    composite: Math.round(composite * 100),
    displacementRisk: Math.round(displacementRisk * 100),
    healthRisk: Math.round(healthRisk * 100),
    communitySignals: Math.round(normalizedCommunity * 100),
    needsScore: Math.round(normalizedNeeds * 100),
    safetyPenalty: Math.round(safetyPenalty * 100),
    missingHealthData: healthSignals.length < 2,
  };
}

export function rankSites(limit = 8) {
  return siteProfiles
    .map((site) => {
      const score = computeCompositeScore(site);
      return { ...site, score };
    })
    .sort((a, b) => b.score.composite - a.score.composite)
    .slice(0, limit);
}

export const serviceMix = [
  { label: "Health (vaccination)", predictive: 46, control: 31 },
  { label: "Nutrition (GAM)", predictive: 34, control: 22 },
  { label: "Protection/GBV", predictive: 29, control: 18 },
  { label: "WASH", predictive: 38, control: 25 },
];

export const vaccinationTrend = Array.from({ length: 6 }).map((_, idx) => {
  const weekDate = subDays(new Date("2026-02-24"), idx * 7);
  return {
    week: weekDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    predictive: 68 + idx * 1.2,
    control: 61 + idx * 0.6,
  };
}).reverse();

export const corridorSafety = [
  { name: "Dayniile → Kahda via Gubadley", safety: 0.54, lastIncident: "2026-02-22 (harassment reported)" },
  { name: "Hodan ring road", safety: 0.68, lastIncident: "2026-02-18 (roadblock cleared)" },
  { name: "Kahda night route", safety: 0.43, lastIncident: "2026-02-21 (theft, no injuries)" },
  { name: "Airport spur", safety: 0.76, lastIncident: "2026-02-10 (escort available)" },
];
