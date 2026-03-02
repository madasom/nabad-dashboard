import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config/api";
import { useNavigate } from "react-router-dom";

const apiUrl = API_BASE;

export type ImportJob = {
  id: string;
  filename: string;
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
      return res.json();
    },
  });
  return query;
}
