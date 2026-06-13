import { useQuery } from '@tanstack/react-query';
import apiClient, { ApiResponse } from '../api/axios';

export interface FormaPago {
  codigo: string;
  descripcion: string;
  habilitado: boolean;
}

export interface EstadoPedido {
  codigo: string;
  descripcion: string;
  orden: number;
  es_terminal: boolean;
}

const CATALOGO_URL = '/catalogo';

const fetchFormasPago = async (): Promise<FormaPago[]> => {
  const response = await apiClient.get<ApiResponse<FormaPago[]>>(`${CATALOGO_URL}/formas-pago`);
  return response.data.data || [];
};

const fetchEstadosPedido = async (): Promise<EstadoPedido[]> => {
  const response = await apiClient.get<ApiResponse<EstadoPedido[]>>(`${CATALOGO_URL}/estados-pedido`);
  return response.data.data || [];
};

export const useFormasPago = () => {
  return useQuery({
    queryKey: ['formas-pago'],
    queryFn: fetchFormasPago,
    staleTime: 5 * 60 * 1000,
  });
};

export const useEstadosPedido = () => {
  return useQuery({
    queryKey: ['estados-pedido'],
    queryFn: fetchEstadosPedido,
    staleTime: 5 * 60 * 1000,
  });
};
