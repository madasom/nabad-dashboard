import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "@/config/api";

const apiUrl = API_BASE;

export type Alert = {
  id: string;
  siteName: string;
  district: string | null;
  channel: string | null;
  category: string | null;
  severity: string | null;
  message: string;
  reportedAt: string;
};

export function useAlertsData() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["alerts"],
    enabled: !!token,
    queryFn: async (): Promise<Alert[]> => {
      const res = await fetch(`${apiUrl}/api/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        navigate("/login");
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return await res.json();
    },
  });

  return { data: query.data, isLoading: query.isLoading, isError: query.isError };
}
