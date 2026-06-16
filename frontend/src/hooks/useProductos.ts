import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { ApiResponse, PaginatedData } from '../api/axios';
import { Producto } from '../types/producto';

const API_URL = '/productos';

interface FetchProductosParams {
  page?: number;
  size?: number;
  categoria?: number;
  disponible?: boolean;
  search?: string;
}

const fetchProductos = async (params: FetchProductosParams = {}): Promise<Producto[]> => {
  const { page = 1, size = 100, ...filters } = params;
  const response = await apiClient.get<ApiResponse<PaginatedData<Producto>>>(API_URL, {
    params: { page, size, ...filters },
  });
  return response.data.data.items || [];
};

const fetchProducto = async (id: number): Promise<Producto> => {
  const response = await apiClient.get<ApiResponse<Producto>>(`${API_URL}/${id}`);
  return response.data.data;
};

const createProducto = async (
  data: Omit<Producto, 'id' | 'created_at' | 'updated_at'>
): Promise<Producto> => {
  const response = await apiClient.post<ApiResponse<Producto>>(API_URL, data);
  return response.data.data;
};

const updateProducto = async (
  id: number,
  data: Omit<Producto, 'id' | 'created_at' | 'updated_at'>
): Promise<Producto> => {
  const response = await apiClient.put<ApiResponse<Producto>>(`${API_URL}/${id}`, data);
  return response.data.data;
};

const deleteProducto = async (id: number): Promise<void> => {
  await apiClient.delete(`${API_URL}/${id}`);
};

export const useProductos = (params: FetchProductosParams = {}) => {
  return useQuery({
    queryKey: ['productos', params],
    queryFn: () => fetchProductos(params),
  });
};

export const useProducto = (id: number) => {
  return useQuery({
    queryKey: ['producto', id],
    queryFn: () => fetchProducto(id),
    enabled: !!id,
  });
};

export const useCreateProducto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Producto, 'id' | 'created_at' | 'updated_at'>) => createProducto(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['productos'] }),
  });
};

export const useUpdateProducto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Omit<Producto, 'id' | 'created_at' | 'updated_at'> }) =>
      updateProducto(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['productos'] }),
  });
};

export const useDeleteProducto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteProducto(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['productos'] }),
  });
};
