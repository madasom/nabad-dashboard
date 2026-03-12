import { useQuery } from "@tanstack/react-query";
import { computeCompositeScore, SiteProfile } from "@/data/nabad";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "@/config/api";

const apiUrl = API_BASE;

export type ScoredSite = SiteProfile & {
  id?: string;
  _score: ReturnType<typeof computeCompositeScore>;
  source?: "IOM" | "MOH";
  ochaRegionPcode?: string | null;
  ochaDistrictPcode?: string | null;
  operationalZone?: string | null;
  catchment?: string | null;
  classification?: string | null;
  locationType?: string | null;
  arrivalsMale?: number | null;
  arrivalsFemale?: number | null;
  arrivalsChildren?: number | null;
  departures14d?: number | null;
  mainCause?: string | null;
  hazardCause?: string | null;
  conflictCause?: string | null;
  mainNeed?: string | null;
  responses?: Record<string, boolean> | null;
  movementType?: string | null;
  displacementCount?: string | null;
  journeyTime?: string | null;
  originRegion?: string | null;
  originDistrict?: string | null;
  originLocation?: string | null;
  dataCollectionWeek?: string | null;
  raw?: Record<string, unknown> | null;
};

type ApiSite = {
  id: string;
  settlement_name: string;
  district: string | null;
  region: string | null;
  ochaRegionPcode?: string | null;
  ochaDistrictPcode?: string | null;
  operationalZone?: string | null;
  catchment?: string | null;
  classification?: string | null;
  locationType?: string | null;
  lat: number | null;
  lon: number | null;
  households: number | null;
  arrivals14d: number | null;
  arrivalsMale?: number | null;
  arrivalsFemale?: number | null;
  arrivalsChildren?: number | null;
  departures14d?: number | null;
  mainCause?: string | null;
  hazardCause?: string | null;
  conflictCause?: string | null;
  mainNeed?: string | null;
  needs: Record<string, boolean> | null;
  responses?: Record<string, boolean> | null;
  movementType?: string | null;
  displacementCount?: string | null;
  journeyTime?: string | null;
  originRegion?: string | null;
  originDistrict?: string | null;
  originLocation?: string | null;
  dataCollectionWeek?: string | null;
  penta3: number | null;
  gam: number | null;
  safety: number | null;
  raw?: Record<string, unknown> | null;
};

function isScopedDashboardSite(site: ApiSite) {
  return String(site.region ?? "").trim().toLowerCase() === "banadir";
}

const toProfile = (s: ApiSite) => {
  const source = s.raw?.__source === "MOH" ? "MOH" : "IOM";
  return {
    id: s.id,
    name: s.settlement_name,
    district: s.district ?? "Unknown",
    households: s.households,
    lat: s.lat,
    lon: s.lon,
    needs: {
      protection: s.needs?.protection ?? false,
      food: s.needs?.food ?? false,
      health: s.needs?.health ?? false,
      wash: s.needs?.wash ?? false,
      newArrivals: s.needs?.newArrivals ?? false,
    },
    penta3Coverage: s.penta3,
    gam: s.gam,
    newArrivals14d: s.arrivals14d ?? 0,
    safety: s.safety ?? 0.5,
    lastReport: new Date().toISOString(),
    ochaRegionPcode: s.ochaRegionPcode ?? undefined,
    ochaDistrictPcode: s.ochaDistrictPcode ?? undefined,
    operationalZone: s.operationalZone ?? undefined,
    catchment: s.catchment ?? undefined,
    classification: s.classification ?? undefined,
    locationType: s.locationType ?? undefined,
    arrivalsMale: s.arrivalsMale ?? undefined,
    arrivalsFemale: s.arrivalsFemale ?? undefined,
    arrivalsChildren: s.arrivalsChildren ?? undefined,
    departures14d: s.departures14d ?? undefined,
    mainCause: s.mainCause ?? s.hazardCause ?? s.conflictCause ?? undefined,
    hazardCause: s.hazardCause ?? undefined,
    conflictCause: s.conflictCause ?? undefined,
    mainNeed: s.mainNeed ?? undefined,
    responses: s.responses ?? undefined,
    movementType: s.movementType ?? undefined,
    displacementCount: s.displacementCount ?? undefined,
    journeyTime: s.journeyTime ?? undefined,
    originRegion: s.originRegion ?? undefined,
    originDistrict: s.originDistrict ?? undefined,
    originLocation: s.originLocation ?? undefined,
    dataCollectionWeek: s.dataCollectionWeek ?? undefined,
    source,
    raw: s.raw ?? undefined,
  };
};

export function useSitesData() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["sites"],
    enabled: !!token,
    queryFn: async (): Promise<SiteProfile[]> => {
      const res = await fetch(`${apiUrl}/api/sites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        navigate("/login");
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed to fetch sites");
      const data: ApiSite[] = await res.json();
      return data.filter(isScopedDashboardSite).map(toProfile);
    },
  });

  const data = query.data; // no static fallback
  const scored: ScoredSite[] = (data ?? []).map((s) => ({ ...s, _score: computeCompositeScore(s) }));
  return { data: scored, isLoading: query.isLoading, isError: query.isError };
}
