import { useMutation } from '@tanstack/react-query';
import apiClient from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  nombre: string;
  email: string;
  password: string;
}

export function useLogin() {
  const setUsuario = useAuthStore((state) => state.setUsuario);

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await apiClient.post('/auth/login', credentials);
      const result = response.data;

      if (!result.success) {
        throw new Error(result.message || 'Credenciales invalidas');
      }

      const userData = result.data;
      setUsuario(userData);
      return userData;
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      const response = await apiClient.post('/auth/register', credentials);
      return response.data;
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout');
    },
    onSuccess: () => {
      logout();
    },
  });
}
