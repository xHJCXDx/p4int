import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[]; // Roles requeridos (si no se especifican, solo se requiere estar autenticado)
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, usuario } = useAuthStore();

  // Si no esta autenticado, redirigir a login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si se requieren roles especificos, validar
  if (roles && usuario) {
    const hasRequiredRole = roles.some((role) => usuario.roles.some((r) => r.codigo === role));
    if (!hasRequiredRole) {
      return <Navigate to="/403" replace />;
    }
  }

  return <>{children}</>;
}
