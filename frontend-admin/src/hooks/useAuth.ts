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
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await apiClient.post('/auth/login', credentials);
      const result = response.data;

      if (!result.success) {
        throw new Error(result.message || 'Credenciales invalidas');
      }

      const { access_token, refresh_token } = result.data;

      // Fetch user profile with the new token
      const meResponse = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const user = meResponse.data.data;

      setAuth(user, access_token, refresh_token);
      return user;
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
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refresh_token: refreshToken });
      }
    },
    onSuccess: () => {
      logout();
    },
  });
}
