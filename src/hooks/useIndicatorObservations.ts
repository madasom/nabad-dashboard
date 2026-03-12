import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "@/config/api";

const apiUrl = API_BASE;

export type IndicatorObservation = {
  id: string;
  source: string;
  dataset: string;
  indicator: "penta3" | "gam";
  locationName: string;
  district: string | null;
  region: string | null;
  periodLabel: string;
  periodDate: string | null;
  numerator: number | null;
  denominator: number | null;
  value: number;
  notes: string | null;
};

export function useIndicatorObservations(indicator?: "penta3" | "gam") {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  return useQuery({
    queryKey: ["indicator-observations", indicator ?? "all"],
    enabled: !!token,
    queryFn: async (): Promise<IndicatorObservation[]> => {
      const url = new URL(`${apiUrl}/api/sites/indicators`);
      if (indicator) url.searchParams.set("indicator", indicator);
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        navigate("/login");
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed to fetch indicator observations");
      return res.json();
    },
  });
}
