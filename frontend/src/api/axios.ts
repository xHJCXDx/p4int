import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/useAuthStore';

/** Shape of every backend response via success_response / error_response */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
  status_code: number;
}

/** Paginated list wrapper */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/** Extract error message from an AxiosError with backend shape */
export function getApiErrorMessage(error: unknown, fallback = 'Error inesperado'): string {
  const axiosErr = error as AxiosError<{ message?: string; detail?: string }>;
  return axiosErr.response?.data?.message
    || axiosErr.response?.data?.detail
    || fallback;
}

const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (config.url && !config.url.endsWith('/') && !config.url.includes('?')) {
    config.url = `${config.url}/`;
  }
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthRoute = url.includes('/auth/');
    const isOnLoginPage = window.location.pathname === '/login';

    if (error.response?.status === 401 && !isAuthRoute && !isOnLoginPage) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
