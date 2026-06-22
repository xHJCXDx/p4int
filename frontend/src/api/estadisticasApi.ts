import { api } from "./http";
import type {
  EstadisticasResumen,
  IngresoPorFormaPago,
  PedidoPorEstado,
  ProductoTop,
  VentaPorPeriodo,
} from "../models/Estadisticas";

export async function fetchEstadisticasResumen(): Promise<EstadisticasResumen> {
  const { data } = await api.get<EstadisticasResumen>("/estadisticas/resumen");
  return data;
}

export async function fetchVentas(): Promise<VentaPorPeriodo[]> {
  const { data } = await api.get<VentaPorPeriodo[]>("/estadisticas/ventas");
  return data;
}

export async function fetchProductosTop(): Promise<ProductoTop[]> {
  const { data } = await api.get<ProductoTop[]>("/estadisticas/productos-top", { params: { limit: 10 } });
  return data;
}

export async function fetchPedidosPorEstado(): Promise<PedidoPorEstado[]> {
  const { data } = await api.get<PedidoPorEstado[]>("/estadisticas/pedidos-por-estado");
  return data;
}

export async function fetchIngresos(): Promise<IngresoPorFormaPago[]> {
  const { data } = await api.get<IngresoPorFormaPago[]>("/estadisticas/ingresos");
  return data;
}
