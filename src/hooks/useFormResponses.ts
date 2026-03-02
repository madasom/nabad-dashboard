import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config/api";

const apiUrl = API_BASE;

export function useFormResponses(formId?: string) {
  const { token, logout } = useAuth();
  return useQuery({
    queryKey: ["form-responses", formId],
    enabled: !!token && !!formId,
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/api/forms/${formId}/responses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed to load responses");
      return res.json() as Promise<{ id: string; answers: any; submittedAt: string }[]>;
    },
  });
}
