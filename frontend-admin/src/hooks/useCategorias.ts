import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { ApiResponse, PaginatedData } from '../api/axios';
import { Categoria } from '../types/categoria';

const API_URL = '/categorias';

const fetchCategorias = async (page = 1, size = 100, parentId?: number): Promise<Categoria[]> => {
  const params: Record<string, number> = { page, size };
  if (parentId !== undefined) {
    params.parent_id = parentId;
  }

  const response = await apiClient.get<ApiResponse<PaginatedData<Categoria>>>(API_URL, { params });
  return response.data.data.items || [];
};

const fetchCategoria = async (id: number): Promise<Categoria> => {
  const response = await apiClient.get<ApiResponse<Categoria>>(`${API_URL}/${id}`);
  return response.data.data;
};

const createCategoria = async (
  data: Omit<Categoria, 'id' | 'created_at' | 'updated_at'>
): Promise<Categoria> => {
  const response = await apiClient.post<ApiResponse<Categoria>>(API_URL, data);
  return response.data.data;
};

const updateCategoria = async (
  id: number,
  data: Omit<Categoria, 'id' | 'created_at' | 'updated_at'>
): Promise<Categoria> => {
  const response = await apiClient.put<ApiResponse<Categoria>>(`${API_URL}/${id}`, data);
  return response.data.data;
};

const deleteCategoria = async (id: number): Promise<void> => {
  await apiClient.delete(`${API_URL}/${id}`);
};

export const useCategorias = (page = 1, size = 100, parentId?: number) => {
  return useQuery({
    queryKey: ['categorias', page, size, parentId],
    queryFn: () => fetchCategorias(page, size, parentId),
  });
};

export const useCategoria = (id: number) => {
  return useQuery({
    queryKey: ['categoria', id],
    queryFn: () => fetchCategoria(id),
    enabled: !!id,
  });
};

export const useCreateCategoria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Categoria, 'id' | 'created_at' | 'updated_at'>) =>
      createCategoria(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
    },
  });
};

export const useUpdateCategoria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Omit<Categoria, 'id' | 'created_at' | 'updated_at'>;
    }) => updateCategoria(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
    },
  });
};

export const useDeleteCategoria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteCategoria(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
    },
  });
};
