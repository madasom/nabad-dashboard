import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config/api";
import { useNavigate } from "react-router-dom";

const apiUrl = API_BASE;

export type CommunityResponse = {
  id: string;
  submittedAt: string;
  answers: Record<string, unknown>;
  form: {
    id: string;
    title: string;
    slug: string;
  };
};

export function useCommunityResponses() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  return useQuery({
    queryKey: ["community-responses"],
    enabled: !!token,
    queryFn: async (): Promise<CommunityResponse[]> => {
      const res = await fetch(`${apiUrl}/api/forms/responses/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        navigate("/login");
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed to fetch community responses");
      return res.json();
    },
  });
}
