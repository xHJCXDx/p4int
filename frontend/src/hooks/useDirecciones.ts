import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/axios';
import { DireccionEntrega } from '../types/direccion';

const API_URL = '/direcciones';

const fetchDirecciones = async (): Promise<DireccionEntrega[]> => {
  const response = await apiClient.get<any>(API_URL);
  return response.data.data.items || [];
};

const createDireccion = async (
  data: Omit<DireccionEntrega, 'id' | 'usuario_id' | 'created_at' | 'updated_at' | 'deleted_at'>
): Promise<DireccionEntrega> => {
  const response = await apiClient.post<any>(API_URL, data);
  return response.data.data || response.data;
};

const updateDireccion = async (
  id: number,
  data: Partial<Omit<DireccionEntrega, 'id' | 'usuario_id' | 'created_at' | 'updated_at' | 'deleted_at'>>
): Promise<DireccionEntrega> => {
  const response = await apiClient.put<any>(`${API_URL}/${id}`, data);
  return response.data.data || response.data;
};

const setAsPrincipal = async (id: number): Promise<DireccionEntrega> => {
  const response = await apiClient.patch<any>(`${API_URL}/${id}/principal`);
  return response.data.data || response.data;
};

export const useDirecciones = () => {
  return useQuery({
    queryKey: ['direcciones'],
    queryFn: fetchDirecciones,
  });
};

export const useCreateDireccion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<DireccionEntrega, 'id' | 'usuario_id' | 'created_at' | 'updated_at' | 'deleted_at'>) =>
      createDireccion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direcciones'] });
    },
  });
};

export const useUpdateDireccion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<Omit<DireccionEntrega, 'id' | 'usuario_id' | 'created_at' | 'updated_at' | 'deleted_at'>>;
    }) => updateDireccion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direcciones'] });
    },
  });
};

export const useSetAsPrincipal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => setAsPrincipal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direcciones'] });
    },
  });
};
