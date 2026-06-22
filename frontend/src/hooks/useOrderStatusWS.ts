import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

type WSStatus = "connecting" | "connected" | "disconnected";

function resolveWsUrl(token?: string | null): string {
  const configured = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
  const rawUrl = configured || `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:8000/api/v1/ws/pedidos`;
  const url = new URL(rawUrl);
  if (token) {
    url.searchParams.set("token", token);
  }
  return url.toString();
}

export function useOrderStatusWS(enabled: boolean, token?: string | null): WSStatus {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<WSStatus>("disconnected");

  useEffect(() => {
    if (!enabled) {
      setStatus("disconnected");
      return;
    }

    let ws: WebSocket | null = null;
    let closedByEffect = false;
    let retries = 0;
    let reconnectTimer: number | undefined;

    const connect = () => {
      setStatus("connecting");
      ws = new WebSocket(resolveWsUrl(token));

      ws.onopen = () => {
        retries = 0;
        setStatus("connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { event?: string };
          if (
            data.event === "estado_cambiado" ||
            data.event === "pedido_creado" ||
            data.event === "pago_confirmado"
          ) {
            // Pedidos del personal (PedidosPage / detalle / badge del navbar).
            queryClient.invalidateQueries({ queryKey: ["pedidos"] });
            // Pedidos del cliente (MisPedidosPage y badge del navbar del cliente).
            queryClient.invalidateQueries({ queryKey: ["mis-pedidos"] });
            queryClient.invalidateQueries({ queryKey: ["estadisticas"] });
          }
        } catch {
          // Ignoramos mensajes no JSON.
        }
      };

      ws.onclose = () => {
        setStatus("disconnected");
        if (closedByEffect) return;
        const delay = Math.min(1000 * 2 ** retries, 30000);
        retries += 1;
        reconnectTimer = window.setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      closedByEffect = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [enabled, queryClient, token]);

  return status;
}
