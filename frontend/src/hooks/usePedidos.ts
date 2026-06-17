import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { ApiResponse, PaginatedData } from '../api/axios';
import { Pedido, PedidoCheckoutCreate } from '../types/pedido';

const API_URL = '/pedidos';

const fetchPedidos = async (page = 1, size = 100): Promise<Pedido[]> => {
  const response = await apiClient.get<ApiResponse<PaginatedData<Pedido>>>(API_URL, {
    params: { page, size },
  });
  return response.data.data.items || [];
};

const fetchPedido = async (id: number): Promise<Pedido> => {
  const response = await apiClient.get<ApiResponse<Pedido>>(`${API_URL}/${id}`);
  return response.data.data;
};

const createPedidoFromCheckout = async (data: PedidoCheckoutCreate): Promise<Pedido> => {
  const response = await apiClient.post<ApiResponse<Pedido>>(API_URL, data);
  return response.data.data;
};

const deletePedido = async (id: number, motivo?: string): Promise<void> => {
  await apiClient.delete(`${API_URL}/${id}`, { data: { motivo } });
};

const transitionEstado = async (
  pedido_id: number,
  nuevo_estado: string,
  motivo?: string
): Promise<Pedido> => {
  const response = await apiClient.patch<ApiResponse<Pedido>>(
    `${API_URL}/${pedido_id}/estado`,
    { nuevo_estado, motivo }
  );
  return response.data.data;
};

export const usePedidos = (page = 1, size = 100) => {
  return useQuery({
    queryKey: ['pedidos', page, size],
    queryFn: () => fetchPedidos(page, size),
  });
};

export const usePedido = (id: number) => {
  return useQuery({
    queryKey: ['pedido', id],
    queryFn: () => fetchPedido(id),
    enabled: !!id,
  });
};

export const useCreatePedido = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PedidoCheckoutCreate) => createPedidoFromCheckout(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pedidos'] }),
  });
};

export const useDeletePedido = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo?: string }) => deletePedido(id, motivo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pedidos'] }),
  });
};

export const useTransitionEstado = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pedido_id, nuevo_estado, motivo }: { pedido_id: number; nuevo_estado: string; motivo?: string }) =>
      transitionEstado(pedido_id, nuevo_estado, motivo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pedidos'] }),
  });
};
