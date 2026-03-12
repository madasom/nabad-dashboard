import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config/api";
import { useNavigate } from "react-router-dom";

const apiUrl = API_BASE;

export type ImportJob = {
  id: string;
  filename: string;
  source?: "IOM" | "MOH" | "FSNAU";
  dataset?: "IOM_ETT" | "MOH_ETT" | "MOH_PENTA3_YEARLY" | "MOH_PENTA3_MONTHLY" | "IDP_SITE_REGISTRY" | "FSNAU_GAM";
  status: "pending" | "failed" | "done" | string;
  message?: string | null;
  totalRows?: number | null;
  importedRows?: number;
  createdAt: string;
  finishedAt?: string | null;
};

export function useImportsData() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["imports"],
    enabled: !!token,
    refetchInterval: 10000,
    queryFn: async (): Promise<ImportJob[]> => {
      const res = await fetch(`${apiUrl}/api/imports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        navigate("/login");
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed to fetch imports");
      const jobs = (await res.json()) as ImportJob[];
      return jobs.map((job) => ({
        ...job,
        dataset: job.filename.match(/^\[([A-Z0-9_]+)\]\s/)?.[1] as ImportJob["dataset"] | undefined,
        source: job.filename.startsWith("[MOH")
          ? "MOH"
          : job.filename.startsWith("[FSNAU")
            ? "FSNAU"
            : "IOM",
      }));
    },
  });
  return query;
}
