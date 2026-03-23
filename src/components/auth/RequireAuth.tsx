import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ReactNode } from "react";

export const RequireAuth = ({
  children,
  allowPasswordChange = false,
}: {
  children: ReactNode;
  allowPasswordChange?: boolean;
}) => {
  const { token, user } = useAuth();
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if ((user?.mustChangePassword || user?.firstLogin) && !allowPasswordChange) {
    return <Navigate to="/change-password" replace />;
  }
  if (!user?.mustChangePassword && !user?.firstLogin && allowPasswordChange) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};
