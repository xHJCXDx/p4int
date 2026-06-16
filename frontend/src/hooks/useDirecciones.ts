import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { ApiResponse, PaginatedData } from '../api/axios';
import { DireccionEntrega } from '../types/direccion';

const API_URL = '/direcciones';

type DireccionCreate = Omit<DireccionEntrega, 'id' | 'usuario_id' | 'created_at'>;

const fetchDirecciones = async (): Promise<DireccionEntrega[]> => {
  const response = await apiClient.get<ApiResponse<PaginatedData<DireccionEntrega>>>(API_URL);
  return response.data.data.items || [];
};

const createDireccion = async (data: DireccionCreate): Promise<DireccionEntrega> => {
  const response = await apiClient.post<ApiResponse<DireccionEntrega>>(API_URL, data);
  return response.data.data;
};

const updateDireccion = async (id: number, data: Partial<DireccionCreate>): Promise<DireccionEntrega> => {
  const response = await apiClient.put<ApiResponse<DireccionEntrega>>(`${API_URL}/${id}`, data);
  return response.data.data;
};

const setAsPrincipal = async (id: number): Promise<DireccionEntrega> => {
  const response = await apiClient.patch<ApiResponse<DireccionEntrega>>(`${API_URL}/${id}/principal`);
  return response.data.data;
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
    mutationFn: (data: DireccionCreate) => createDireccion(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['direcciones'] }),
  });
};

export const useUpdateDireccion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DireccionCreate> }) =>
      updateDireccion(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['direcciones'] }),
  });
};

export const useSetAsPrincipal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => setAsPrincipal(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['direcciones'] }),
  });
};
