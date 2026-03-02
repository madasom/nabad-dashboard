import { useMutation, useQuery } from "@tanstack/react-query";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export type PublicForm = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  fields: any;
};

export function usePublicForm(slug: string) {
  return useQuery({
    queryKey: ["public-form", slug],
    enabled: !!slug,
    queryFn: async (): Promise<PublicForm> => {
      const res = await fetch(`${apiUrl}/api/forms/${slug}`);
      if (!res.ok) throw new Error("Form not found");
      return res.json();
    },
  });
}

export function useSubmitPublicForm(slug: string) {
  return useMutation({
    mutationFn: async (answers: Record<string, any>) => {
      const res = await fetch(`${apiUrl}/api/forms/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error("Failed to submit form");
      return res.json();
    },
  });
}
