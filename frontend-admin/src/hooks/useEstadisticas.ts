import { useQuery } from '@tanstack/react-query';
import apiClient, { ApiResponse } from '../api/axios';

const API_URL = '/estadisticas';

export interface Resumen {
  ventas_hoy: number;
  ticket_promedio: number;
  pedidos_activos: number;
  ventas_mes_actual: number;
}

export interface VentasPeriodo {
  periodo: string;
  total_ventas: number;
  cantidad_pedidos: number;
}

export interface ProductoTop {
  producto_id: number;
  nombre: string;
  ingresos: number;
  cantidad_vendida: number;
}

export interface PedidosEstado {
  estado_codigo: string;
  cantidad: number;
}

export interface IngresosFormaPago {
  forma_pago_codigo: string;
  total: number;
  cantidad: number;
}

export const useResumen = () => {
  return useQuery({
    queryKey: ['estadisticas', 'resumen'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Resumen>>(`${API_URL}/resumen`);
      return res.data.data;
    },
  });
};

export const useVentas = (desde?: string, hasta?: string, agrupacion = 'day') => {
  return useQuery({
    queryKey: ['estadisticas', 'ventas', desde, hasta, agrupacion],
    queryFn: async () => {
      const params: Record<string, string> = { agrupacion };
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;
      const res = await apiClient.get<ApiResponse<VentasPeriodo[]>>(`${API_URL}/ventas`, { params });
      return res.data.data;
    },
  });
};

export const useProductosTop = (limit = 10) => {
  return useQuery({
    queryKey: ['estadisticas', 'productos-top', limit],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ProductoTop[]>>(`${API_URL}/productos-top`, {
        params: { limit },
      });
      return res.data.data;
    },
  });
};

export const usePedidosPorEstado = () => {
  return useQuery({
    queryKey: ['estadisticas', 'pedidos-por-estado'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PedidosEstado[]>>(`${API_URL}/pedidos-por-estado`);
      return res.data.data;
    },
  });
};

export const useIngresos = (desde?: string, hasta?: string) => {
  return useQuery({
    queryKey: ['estadisticas', 'ingresos', desde, hasta],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;
      const res = await apiClient.get<ApiResponse<IngresosFormaPago[]>>(`${API_URL}/ingresos`, { params });
      return res.data.data;
    },
  });
};
