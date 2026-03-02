import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config/api";

const apiUrl = API_BASE;

export type UserRow = {
  id: string;
  name: string;
  email: string;
};

export function useUsers() {
  const { token, logout } = useAuth();
  return useQuery({
    queryKey: ["users"],
    enabled: !!token,
    queryFn: async (): Promise<UserRow[]> => {
      const res = await fetch(`${apiUrl}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });
}
