import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export function useDeleteForm() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${apiUrl}/api/forms/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete form");
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forms"] });
    },
  });
}
