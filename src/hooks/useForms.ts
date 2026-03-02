import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export type Form = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  headerImage?: string | null;
  fields: any;
  sections?: any;
  createdAt: string;
  _count?: { responses: number };
};

export function useForms() {
  const { token, logout } = useAuth();
  return useQuery({
    queryKey: ["forms"],
    enabled: !!token,
    queryFn: async (): Promise<Form[]> => {
      const res = await fetch(`${apiUrl}/api/forms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed to fetch forms");
      return res.json();
    },
  });
}

export function useCreateForm() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; slug: string; description?: string; headerImage?: string; fields: any; sections?: any }) => {
      const res = await fetch(`${apiUrl}/api/forms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create form");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forms"] });
    },
  });
}

export function useUpdateForm() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; title: string; slug: string; description?: string; headerImage?: string; fields: any; sections?: any }) => {
      const res = await fetch(`${apiUrl}/api/forms/${payload.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update form");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forms"] });
    },
  });
}
