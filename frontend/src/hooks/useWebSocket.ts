import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { useToast } from '../components/Toast';

const ESTADOS_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADO: 'Confirmado',
  EN_PREP: 'En preparacion',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

interface WsMessage {
  event: string;
  pedido_id: number;
  estado_anterior: string;
  estado_nuevo: string;
  usuario_id?: number | null;
  motivo?: string | null;
  timestamp?: string;
}

const MAX_RETRIES = 5;
const BASE_DELAY = 1000;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const connect = useCallback(() => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/pedidos?token=${token}`);

    ws.onopen = () => {
      retriesRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        if (msg.event === 'estado_cambiado' || msg.event === 'pedido_cancelado') {
          queryClient.invalidateQueries({ queryKey: ['pedidos'] });
          queryClient.invalidateQueries({ queryKey: ['pedido', msg.pedido_id] });
          const label = ESTADOS_LABEL[msg.estado_nuevo] ?? msg.estado_nuevo;
          showToast(`Pedido #${msg.pedido_id}: ${label}`, 'info');
        } else if (msg.event === 'pedido_creado') {
          queryClient.invalidateQueries({ queryKey: ['pedidos'] });
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = (event) => {
      wsRef.current = null;
      if (event.code === 4001 || event.code === 4003) return; // auth rejected, don't retry

      if (retriesRef.current < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retriesRef.current);
        retriesRef.current++;
        timerRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [queryClient, showToast]);

  const disconnect = useCallback(() => {
    clearTimeout(timerRef.current);
    retriesRef.current = MAX_RETRIES; // prevent reconnect
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  useEffect(() => {
    const unsub = useAuthStore.subscribe((state, prev) => {
      if (state.isAuthenticated && !prev.isAuthenticated) {
        connect();
      }
      if (!state.isAuthenticated && prev.isAuthenticated) {
        disconnect();
      }
    });

    // Connect if already authenticated
    if (useAuthStore.getState().isAuthenticated) {
      connect();
    }

    return () => {
      unsub();
      disconnect();
    };
  }, [connect, disconnect]);
}
