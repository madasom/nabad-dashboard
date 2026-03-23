import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  firstLogin: boolean;
  mustChangePassword: boolean;
} | null;

type AuthContextType = {
  user: User;
  token: string | null;
  login: (payload: { token: string; user: User }) => void;
  updateUser: (user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("authToken"));
  const [user, setUser] = useState<User>(() => {
    const raw = localStorage.getItem("authUser");
    return raw ? (JSON.parse(raw) as User) : null;
  });

  const login = ({ token, user }: { token: string; user: User }) => {
    setToken(token);
    setUser(user);
    localStorage.setItem("authToken", token);
    localStorage.setItem("authUser", JSON.stringify(user));
  };

  const updateUser = (user: User) => {
    setUser(user);
    if (user) {
      localStorage.setItem("authUser", JSON.stringify(user));
    } else {
      localStorage.removeItem("authUser");
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
  };

  useEffect(() => {
    // ensure token is cleared if absent
    if (!token) logout();
  }, [token]);

  const value = useMemo(() => ({ user, token, login, updateUser, logout }), [user, token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
