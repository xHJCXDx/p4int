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
  type: string;
  pedido_id: number;
  estado_desde: string;
  estado_hacia: string;
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
        if (msg.type === 'pedido_estado') {
          queryClient.invalidateQueries({ queryKey: ['pedidos'] });
          queryClient.invalidateQueries({ queryKey: ['pedido', msg.pedido_id] });
          const label = ESTADOS_LABEL[msg.estado_hacia] ?? msg.estado_hacia;
          showToast(`Pedido #${msg.pedido_id}: ${label}`, 'info');
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
