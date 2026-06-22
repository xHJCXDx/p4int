import { useAuth } from "./useAuth";

export const ROLES = {
  ADMIN: "ADMIN",
  STOCK: "STOCK",
  PEDIDOS: "PEDIDOS",
  CLIENT: "CLIENT",
} as const;

export type Rol = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  STOCK: "Gestor de Stock",
  PEDIDOS: "Gestor de Pedidos",
  CLIENT: "Cliente",
};

export function usePermissions() {
  const { user } = useAuth();
  const rol = user?.rol ?? null;

  const isAdmin = rol === ROLES.ADMIN;
  const isStock = rol === ROLES.STOCK;
  const isPedidos = rol === ROLES.PEDIDOS;
  const isClient = rol === ROLES.CLIENT;

  return {
    rol,
    roleLabel: rol ? ROLE_LABELS[rol] ?? rol : "",
    isAdmin,
    isStock,
    isPedidos,
    isClient,
    canManageCatalogo: isAdmin,
    canManageUsuarios: isAdmin,
    canManagePedidos: isAdmin || isPedidos,
    canViewPedidos: isAdmin || isPedidos || isStock,
    canUseCarrito: isClient,
  };
}
