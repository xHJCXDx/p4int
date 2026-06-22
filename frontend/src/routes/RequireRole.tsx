import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface RequireRoleProps {
  allowed: string[];
}

export function RequireRole({ allowed }: RequireRoleProps) {
  const { isAuthenticated, isSessionLoading, user } = useAuth();

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm font-semibold text-gray-600">
        Cargando sesion...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user || !allowed.includes(user.rol)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
