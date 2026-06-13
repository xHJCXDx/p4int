import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  celular: string | null;
  roles: { codigo: string; nombre: string; descripcion: string }[];
  created_at: string;
}

interface AuthState {
  usuario: Usuario | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (usuario: Usuario, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      usuario: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (usuario, accessToken, refreshToken) => {
        set({
          usuario,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          usuario: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      hasRole: (role: string) => {
        const state = get();
        return state.usuario?.roles.some((r) => r.codigo === role) ?? false;
      },
    }),
    {
      name: 'admin-auth-storage',
    }
  )
);
