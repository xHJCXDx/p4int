import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/useAuthStore';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
  status_code: number;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export function getApiErrorMessage(error: unknown, fallback = 'Error inesperado'): string {
  const axiosErr = error as AxiosError<{ message?: string; detail?: string }>;
  return axiosErr.response?.data?.message || axiosErr.response?.data?.detail || fallback;
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

let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const url = originalRequest?.url || '';
    const isAuthRoute = url.includes('/auth/');

    if (error.response?.status !== 401 || isAuthRoute || originalRequest._retry) {
      if (error.response?.status === 401 && !isAuthRoute) {
        useAuthStore.getState().logout();
      }
      return Promise.reject(error);
    }

    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = axios
        .post<ApiResponse<{ access_token: string; refresh_token: string }>>(
          '/api/v1/auth/refresh/',
          { refresh_token: refreshToken }
        )
        .then((res) => {
          const { access_token, refresh_token: newRefresh } = res.data.data;
          useAuthStore.getState().setTokens(access_token, newRefresh);
          return access_token;
        })
        .catch((refreshError) => {
          useAuthStore.getState().logout();
          return Promise.reject(refreshError);
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    const newAccessToken = await refreshPromise;
    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
    return apiClient(originalRequest);
  }
);

export default apiClient;
