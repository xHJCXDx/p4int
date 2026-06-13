import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { ApiResponse, PaginatedData } from '../api/axios';
import { Ingrediente, UnidadMedida } from '../types/ingrediente';

const API_URL = '/ingredientes';
const CATALOGO_URL = '/catalogo';

const fetchIngredientes = async (limit = 100, offset = 0): Promise<Ingrediente[]> => {
  const response = await apiClient.get<ApiResponse<PaginatedData<Ingrediente>>>(API_URL, {
    params: { limit, offset },
  });
  return response.data.data.items || [];
};

const fetchIngrediente = async (id: number): Promise<Ingrediente> => {
  const response = await apiClient.get<ApiResponse<Ingrediente>>(`${API_URL}/${id}`);
  return response.data.data;
};

const createIngrediente = async (
  data: Omit<Ingrediente, 'id' | 'created_at' | 'updated_at'>
): Promise<Ingrediente> => {
  const response = await apiClient.post<ApiResponse<Ingrediente>>(API_URL, data);
  return response.data.data;
};

const updateIngrediente = async (
  id: number,
  data: Omit<Ingrediente, 'id' | 'created_at' | 'updated_at'>
): Promise<Ingrediente> => {
  const response = await apiClient.put<ApiResponse<Ingrediente>>(`${API_URL}/${id}`, data);
  return response.data.data;
};

const deleteIngrediente = async (id: number): Promise<void> => {
  await apiClient.delete(`${API_URL}/${id}`);
};

const fetchUnidadesMedida = async (): Promise<UnidadMedida[]> => {
  const response = await apiClient.get<ApiResponse<UnidadMedida[]>>(`${CATALOGO_URL}/unidades-medida`);
  return response.data.data || [];
};

const createUnidadMedida = async (data: UnidadMedida): Promise<UnidadMedida> => {
  const response = await apiClient.post<ApiResponse<UnidadMedida>>(`${CATALOGO_URL}/unidades-medida`, data);
  return response.data.data;
};

const deleteUnidadMedida = async (codigo: string): Promise<void> => {
  await apiClient.delete(`${CATALOGO_URL}/unidades-medida/${codigo}`);
};

export const useIngredientes = (limit = 100, offset = 0) => {
  return useQuery({
    queryKey: ['ingredientes', limit, offset],
    queryFn: () => fetchIngredientes(limit, offset),
  });
};

export const useIngrediente = (id: number) => {
  return useQuery({
    queryKey: ['ingrediente', id],
    queryFn: () => fetchIngrediente(id),
    enabled: !!id,
  });
};

export const useCreateIngrediente = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Ingrediente, 'id' | 'created_at' | 'updated_at'>) =>
      createIngrediente(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredientes'] });
    },
  });
};

export const useUpdateIngrediente = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Omit<Ingrediente, 'id' | 'created_at' | 'updated_at'>;
    }) => updateIngrediente(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredientes'] });
    },
  });
};

export const useDeleteIngrediente = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteIngrediente(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredientes'] });
    },
  });
};

export const useUnidadesMedida = () => {
  return useQuery({
    queryKey: ['unidades-medida'],
    queryFn: fetchUnidadesMedida,
  });
};

export const useCreateUnidadMedida = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UnidadMedida) => createUnidadMedida(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades-medida'] });
    },
  });
};

export const useDeleteUnidadMedida = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (codigo: string) => deleteUnidadMedida(codigo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades-medida'] });
    },
  });
};
