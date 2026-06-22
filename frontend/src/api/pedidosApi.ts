import { api } from "./http";
import type {
  AvanzarEstadoPayload,
  PedidoCreatePayload,
  PedidoFull,
  Pedido,
  PedidoPaginatedResponse,
} from "../models/Pedido";

interface ListPedidosParams {
  offset?: number;
  limit?: number;
}

export async function fetchPedidos(
  params: ListPedidosParams,
): Promise<PedidoPaginatedResponse> {
  const { data } = await api.get<PedidoPaginatedResponse>("/pedidos", {
    params: {
      offset: params.offset ?? 0,
      limit: params.limit ?? 10,
    },
  });
  return data;
}

export async function createPedido(payload: PedidoCreatePayload): Promise<PedidoFull> {
  const { data } = await api.post<PedidoFull>("/pedidos", payload);
  return data;
}

export async function avanzarEstado(
  id: number,
  payload: AvanzarEstadoPayload,
): Promise<Pedido> {
  const { data } = await api.patch<Pedido>(`/pedidos/${id}/estado`, payload);
  return data;
}

export async function fetchPedidoById(id: number): Promise<PedidoFull> {
  const { data } = await api.get<PedidoFull>(`/pedidos/${id}`);
  return data;
}

export async function crearPreferenciaMP(
  pedidoId: number,
): Promise<{ pedido_id: number; init_point: string }> {
  const { data } = await api.post<{ pedido_id: number; init_point: string }>(
    `/pagos/preferencia/${pedidoId}`,
  );
  return data;
}
