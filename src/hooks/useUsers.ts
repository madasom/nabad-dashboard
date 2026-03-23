import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config/api";

const apiUrl = API_BASE;

export type UserRow = {
  id: string;
  name: string;
  email: string;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
};

export type UpdateUserPayload = {
  id: string;
  name: string;
  email: string;
  password?: string;
};

async function parseError(res: Response, fallback: string) {
  const payload = await res.json().catch(() => null);
  return payload?.message ?? fallback;
}

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

export function useCreateUser() {
  const { token, logout } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateUserPayload): Promise<UserRow> => {
      const res = await fetch(`${apiUrl}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        logout();
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error(await parseError(res, "Failed to create user"));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const { token, logout } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateUserPayload): Promise<UserRow> => {
      const res = await fetch(`${apiUrl}/api/users/${payload.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        logout();
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error(await parseError(res, "Failed to update user"));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteUser() {
  const { token, logout } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${apiUrl}/api/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.status === 401) {
        logout();
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error(await parseError(res, "Failed to delete user"));
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
