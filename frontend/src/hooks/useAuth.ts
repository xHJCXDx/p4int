import { useMutation } from '@tanstack/react-query';
import apiClient from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  nombre: string;
  apellido: string;
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
        throw new Error(result.message || 'Credenciales inválidas');
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

export interface ProfileUpdate {
  nombre?: string;
  apellido?: string;
  celular?: string | null;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

export function useUpdateProfile() {
  const setUsuario = useAuthStore((state) => state.setUsuario);

  return useMutation({
    mutationFn: async (data: ProfileUpdate) => {
      const response = await apiClient.put('/auth/me', data);
      const result = response.data;

      if (!result.success) {
        throw new Error(result.message || 'Error al actualizar perfil');
      }

      const userData = result.data;
      setUsuario(userData);
      return userData;
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: PasswordChange) => {
      const response = await apiClient.put('/auth/me/password', data);
      const result = response.data;

      if (!result.success) {
        throw new Error(result.message || 'Error al cambiar contraseña');
      }

      return result;
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
