import { useMutation } from '@tanstack/react-query';
import apiClient, { ApiResponse } from '../api/axios';

interface PagoResponse {
  id: number;
  pedido_id: number;
  mp_status: string;
  transaction_amount: number;
  init_point: string | null;
  created_at: string;
  updated_at: string;
}

interface CrearPagoData {
  pedido_id: number;
  transaction_amount: number;
}

const crearPago = async (data: CrearPagoData): Promise<PagoResponse> => {
  const response = await apiClient.post<ApiResponse<PagoResponse>>('/pagos/crear', data);
  return response.data.data;
};

export const useCrearPago = () => {
  return useMutation({
    mutationFn: (data: CrearPagoData) => crearPago(data),
  });
};
