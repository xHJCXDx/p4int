import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function RequireAuth() {
  const { isAuthenticated, isSessionLoading } = useAuth();

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

  return <Outlet />;
}
