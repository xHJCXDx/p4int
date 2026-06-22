import type { Pedido } from "../models/Pedido";

const STORAGE_PREFIX = "pedidos_vistos_user_";
const STATUS_STORAGE_PREFIX = "pedidos_estado_visto_user_";
const OPERATOR_UNREAD_STATES = new Set(["PENDIENTE", "CONFIRMADO"]);
const CLIENT_UNREAD_STATES = new Set(["CONFIRMADO", "CANCELADO"]);

function buildKey(userId: number): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function buildStatusKey(userId: number): string {
  return `${STATUS_STORAGE_PREFIX}${userId}`;
}

function hasStorageKey(key: string): boolean {
  return window.localStorage.getItem(key) !== null;
}

export function readSeenPedidoIds(userId: number): Set<number> {
  try {
    const raw = window.localStorage.getItem(buildKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as number[];
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id) => Number.isFinite(id) && id > 0));
  } catch {
    return new Set();
  }
}

function readSeenPedidoStatuses(userId: number): Record<number, string> {
  try {
    const raw = window.localStorage.getItem(buildStatusKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (!parsed || typeof parsed !== "object") return {};
    const statuses: Record<number, string> = {};
    for (const [idRaw, status] of Object.entries(parsed)) {
      const id = Number(idRaw);
      if (Number.isFinite(id) && id > 0 && typeof status === "string") {
        statuses[id] = status;
      }
    }
    return statuses;
  } catch {
    return {};
  }
}

function persistSeenPedidoIds(userId: number, ids: Set<number>): void {
  window.localStorage.setItem(buildKey(userId), JSON.stringify(Array.from(ids)));
}

function persistSeenPedidoStatuses(userId: number, statuses: Record<number, string>): void {
  window.localStorage.setItem(buildStatusKey(userId), JSON.stringify(statuses));
}

export function markPedidoAsSeen(userId: number, pedidoId: number): void {
  const seen = readSeenPedidoIds(userId);
  seen.add(pedidoId);
  persistSeenPedidoIds(userId, seen);
}

export function markPedidosAsSeen(userId: number, pedidoIds: number[]): void {
  const seen = readSeenPedidoIds(userId);
  for (const pedidoId of pedidoIds) {
    if (Number.isFinite(pedidoId) && pedidoId > 0) seen.add(pedidoId);
  }
  persistSeenPedidoIds(userId, seen);
}

export function markPedidoStatusAsSeen(userId: number, pedido: Pedido): void {
  const seen = readSeenPedidoStatuses(userId);
  seen[pedido.id] = pedido.estado_codigo;
  persistSeenPedidoStatuses(userId, seen);
}

export function markPedidoStatusesAsSeen(userId: number, pedidos: Pedido[]): void {
  const seen = readSeenPedidoStatuses(userId);
  for (const pedido of pedidos) {
    seen[pedido.id] = pedido.estado_codigo;
  }
  persistSeenPedidoStatuses(userId, seen);
}

export function syncSeenPedidos(userId: number, pedidos: Pedido[]): void {
  const key = buildKey(userId);
  const existentes = new Set(pedidos.map((p) => p.id));
  if (!hasStorageKey(key)) {
    persistSeenPedidoIds(userId, new Set(pedidos.map((p) => p.id)));
    return;
  }
  const seen = readSeenPedidoIds(userId);
  const next = new Set(Array.from(seen).filter((id) => existentes.has(id)));
  persistSeenPedidoIds(userId, next);
}

export function syncClientPedidoStatuses(userId: number, pedidos: Pedido[]): void {
  const key = buildStatusKey(userId);
  const existentes = new Set(pedidos.map((p) => p.id));
  if (!hasStorageKey(key)) {
    const initial: Record<number, string> = {};
    for (const pedido of pedidos) {
      initial[pedido.id] = pedido.estado_codigo;
    }
    persistSeenPedidoStatuses(userId, initial);
    return;
  }
  const seen = readSeenPedidoStatuses(userId);
  const next: Record<number, string> = {};

  for (const [idRaw, status] of Object.entries(seen)) {
    const id = Number(idRaw);
    if (existentes.has(id)) next[id] = status;
  }

  persistSeenPedidoStatuses(userId, next);
}

export function getUnreadOperatorPedidoIds(userId: number, pedidos: Pedido[]): number[] {
  const seen = readSeenPedidoIds(userId);
  return pedidos
    .filter((pedido) => OPERATOR_UNREAD_STATES.has(pedido.estado_codigo) && !seen.has(pedido.id))
    .map((pedido) => pedido.id);
}

export function countUnreadOperatorPedidos(userId: number, pedidos: Pedido[]): number {
  return getUnreadOperatorPedidoIds(userId, pedidos).length;
}

export function getUnreadClientPedidoUpdateIds(userId: number, pedidos: Pedido[]): number[] {
  const seen = readSeenPedidoStatuses(userId);
  return pedidos.filter((pedido) => {
    const lastSeenStatus = seen[pedido.id];
    return Boolean(
      (!lastSeenStatus || lastSeenStatus !== pedido.estado_codigo) &&
      CLIENT_UNREAD_STATES.has(pedido.estado_codigo),
    );
  }).map((pedido) => pedido.id);
}

export function countUnreadClientPedidoUpdates(userId: number, pedidos: Pedido[]): number {
  return getUnreadClientPedidoUpdateIds(userId, pedidos).length;
}
