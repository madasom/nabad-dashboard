import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config/api";

const apiUrl = API_BASE;

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
