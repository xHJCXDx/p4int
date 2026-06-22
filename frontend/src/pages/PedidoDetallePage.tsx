import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ESTADOS, TRANSICIONES } from "../models/Pedido";
import { avanzarEstado, crearPreferenciaMP, fetchPedidoById } from "../api/pedidosApi";
import { useAuth } from "../hooks/useAuth";
import { useProductos } from "../hooks/useProducto";
import { getApiErrorMessage } from "../api/http";
import { usePermissions } from "../hooks/useRoles";
import { markPedidoAsSeen, markPedidoStatusAsSeen } from "../api/pedidosUnread";

function formatFechaHora(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("es-AR");
}

function formatFecha(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("es-AR");
}

function formatHora(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatImporte(value: number | string): string {
  const parsed = typeof value === "number" ? value : Number(value);
  const amount = Number.isFinite(parsed) ? parsed : 0;
  return amount.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function formatEstadoLabel(codigo: string): string {
  if (ESTADOS[codigo]) return ESTADOS[codigo].label;
  return codigo
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (s) => s.toUpperCase());
}

function formatFormaPago(codigo: string): string {
  const labels: Record<string, string> = {
    EFECTIVO: "Efectivo",
    TRANSFERENCIA: "Transferencia (Mercado Pago)",
    MERCADOPAGO: "Transferencia (Mercado Pago)",
    TARJETA: "Tarjeta",
  };
  return labels[codigo] ?? codigo;
}

function getItemNote(item: Record<string, unknown>): string | null {
  const candidates = ["nota", "notas", "comentario", "observacion", "observaciones"];
  for (const key of candidates) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function PedidoDetallePage() {
  const { id } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { canManagePedidos, canViewPedidos } = usePermissions();
  const { user } = useAuth();
  const { productos } = useProductos();
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [motivoModalOpen, setMotivoModalOpen] = useState(false);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState("Me equivoque al hacer el pedido.");
  const [motivoLibre, setMotivoLibre] = useState("");
  const [motivoError, setMotivoError] = useState<string | null>(null);

  const pedidoId = id ? Number(id) : NaN;
  const [isRedirectingMP, setIsRedirectingMP] = useState(false);
  const [mpError, setMpError] = useState<string | null>(null);
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  const returnPage = (location.state as { returnPage?: number } | null)?.returnPage;
  const returnState = (location.state as { returnState?: unknown } | null)?.returnState;
  const fallbackReturnTo = canViewPedidos ? "/pedidos" : "/mis-pedidos";
  const resolvedReturnTo = returnTo || fallbackReturnTo;
  const volverAlListadoState = returnTo ? { restorePage: returnPage, restoreState: returnState } : undefined;

  const { data: pedido, isLoading, isError, error } = useQuery({
    queryKey: ["pedidos", "detalle", pedidoId],
    queryFn: () => fetchPedidoById(pedidoId),
    enabled: Number.isFinite(pedidoId) && pedidoId > 0,
  });

  const avanzarMutation = useMutation({
    mutationFn: (estadoHacia: string) => avanzarEstado(pedidoId, { estado_hacia: estadoHacia }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      queryClient.invalidateQueries({ queryKey: ["pedidos", "detalle", pedidoId] });
    },
  });

  const cancelarMutation = useMutation({
    mutationFn: (motivo: string) =>
      avanzarEstado(pedidoId, { estado_hacia: "CANCELADO", motivo }),
    onSuccess: () => {
      setConfirmCancelOpen(false);
      setMotivoModalOpen(false);
      setMotivoLibre("");
      setMotivoError(null);
      queryClient.invalidateQueries({ queryKey: ["mis-pedidos"] });
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      queryClient.invalidateQueries({ queryKey: ["pedidos", "detalle", pedidoId] });
    },
  });

  const productosById = useMemo(
    () => new Map(productos.filter((p) => p.id).map((p) => [Number(p.id), p])),
    [productos],
  );

  const siguienteEtapa = useMemo(() => {
    if (!pedido) return null;
    const transiciones = TRANSICIONES[pedido.estado_codigo] ?? [];
    return transiciones[0] ?? null;
  }, [pedido]);

  // Cliente puede reintentar el pago si el pedido está PENDIENTE y eligió MERCADOPAGO
  const puedeReintentarPagoMP =
    !canManagePedidos &&
    pedido?.estado_codigo === "PENDIENTE" &&
    pedido?.forma_pago_codigo === "MERCADOPAGO";

  const handlePagarMP = async () => {
    if (!pedido?.id) return;
    setIsRedirectingMP(true);
    setMpError(null);
    try {
      const { init_point } = await crearPreferenciaMP(pedido.id);
      window.location.href = init_point;
    } catch (err) {
      setMpError(getApiErrorMessage(err, "No se pudo iniciar el pago. Intentá de nuevo."));
      setIsRedirectingMP(false);
    }
  };

  const puedeCancelarCliente = !canManagePedidos && pedido?.estado_codigo === "PENDIENTE";

  const motivosCancelacion = [
    "Me equivoque al hacer el pedido.",
    "Quiero cambiar productos del pedido.",
    "Ya no lo necesito en este momento.",
    "Tuve un problema con el metodo de pago.",
    "__OTRO__",
    "__OMITIR__",
  ];

  const resolverPersonalizacion = (productoId: number, personalizacion: number[]) => {
    if (!personalizacion.length) return [];
    const producto = productosById.get(productoId);
    if (!producto) return personalizacion.map((id) => `Ingrediente #${id}`);
    const nombres = personalizacion.map((id) => {
      const ing = (producto.ingredientes || []).find((item) => Number(item.id) === id);
      return ing?.nombre ?? `Ingrediente #${id}`;
    });
    return Array.from(new Set(nombres));
  };

  const handleConfirmarCancelacion = () => {
    if (motivoSeleccionado === "__OTRO__") {
      const motivo = motivoLibre.trim();
      if (!motivo) {
        setMotivoError("Escribi el motivo para continuar.");
        return;
      }
      cancelarMutation.mutate(motivo);
      return;
    }
    if (motivoSeleccionado === "__OMITIR__") {
      cancelarMutation.mutate("El cliente prefirio no indicar un motivo de cancelacion.");
      return;
    }
    cancelarMutation.mutate(motivoSeleccionado);
  };

  useEffect(() => {
    if (!canViewPedidos || !user?.id || !Number.isFinite(pedidoId) || pedidoId <= 0) return;
    markPedidoAsSeen(user.id, pedidoId);
  }, [canViewPedidos, pedidoId, user?.id]);

  useEffect(() => {
    if (canViewPedidos || !user?.id || !pedido) return;
    markPedidoStatusAsSeen(user.id, pedido);
    queryClient.invalidateQueries({ queryKey: ["mis-pedidos", "navbar"] });
  }, [canViewPedidos, pedido, queryClient, user?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gray-800 dark:border-slate-300 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-slate-400 font-medium">Cargando detalle del pedido...</p>
        </div>
      </div>
    );
  }

  if (isError || !pedido) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl p-6 max-w-md text-center space-y-4">
          <p className="text-red-700 dark:text-red-300 font-semibold">{getApiErrorMessage(error, "No se pudo cargar el detalle del pedido.")}</p>
          <Link to={resolvedReturnTo} state={volverAlListadoState}
            className="inline-block bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            Volver al listado
          </Link>
        </div>
      </div>
    );
  }

  const estado = ESTADOS[pedido.estado_codigo] ?? {
    label: pedido.estado_codigo,
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
  };

  const accentColor =
    pedido.estado_codigo === "PENDIENTE" ? "bg-gray-400" :
    pedido.estado_codigo === "CONFIRMADO" ? "bg-sky-500" :
    pedido.estado_codigo === "EN_PREP" ? "bg-amber-500" :
    pedido.estado_codigo === "ENTREGADO" ? "bg-green-500" :
    pedido.estado_codigo === "CANCELADO" ? "bg-red-500" : "bg-gray-400";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tight">Pedido #{pedido.id}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Detalle completo del pedido</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {puedeReintentarPagoMP && (
            <button type="button" onClick={() => { void handlePagarMP(); }} disabled={isRedirectingMP}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>
              {isRedirectingMP ? "Redirigiendo..." : "Pagar con MercadoPago"}
            </button>
          )}
          {puedeCancelarCliente && (
            <button type="button" onClick={() => setConfirmCancelOpen(true)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
              Cancelar pedido
            </button>
          )}
          <Link to={resolvedReturnTo} state={volverAlListadoState}
            className="inline-flex items-center gap-2 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
            Volver
          </Link>
        </div>
      </div>

      {mpError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4 text-sm text-red-700 dark:text-red-200">
          {mpError}
        </div>
      )}

      {/* Info Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-5">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Fecha</p>
              <p className="mt-2 text-2xl font-black text-gray-900 dark:text-slate-100 tracking-tight">{formatFecha(pedido.created_at)}</p>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-800">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-5">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Hora</p>
              <p className="mt-2 text-2xl font-black text-gray-900 dark:text-slate-100 tracking-tight">{formatHora(pedido.created_at)}</p>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 dark:bg-slate-800">
              <svg className="w-5 h-5 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-5">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-600" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Forma de pago</p>
              <p className="mt-2 text-lg font-bold text-gray-900 dark:text-slate-100">{formatFormaPago(pedido.forma_pago_codigo)}</p>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-purple-50 dark:bg-slate-800">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-5">
          <div className={`absolute top-0 left-0 w-1 h-full ${accentColor}`} />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Estado</p>
              <span className={`inline-flex mt-2 text-sm font-semibold px-3 py-1.5 rounded-full border ${estado.badgeClass}`}>
                {estado.label}
              </span>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-gray-50 dark:bg-slate-800">
              <svg className="w-5 h-5 text-gray-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Operator Actions */}
      {canManagePedidos && (
        <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-4 flex flex-wrap items-center gap-3">
          {siguienteEtapa ? (
            <button type="button" onClick={() => avanzarMutation.mutate(siguienteEtapa.hacia)}
              disabled={avanzarMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
              {avanzarMutation.isPending ? "Actualizando..." : `Pasar a ${formatEstadoLabel(siguienteEtapa.hacia)}`}
            </button>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
              Este pedido ya no tiene etapas pendientes.
            </span>
          )}
          {avanzarMutation.isError && (
            <span className="text-sm text-red-700 dark:text-red-300">{getApiErrorMessage(avanzarMutation.error, "No se pudo avanzar el estado.")}</span>
          )}
        </div>
      )}

      {/* Financials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Subtotal</p>
          <p className="text-2xl font-black text-gray-900 dark:text-slate-100 mt-1">{formatImporte(pedido.subtotal)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Descuento</p>
          <p className="text-2xl font-black text-gray-900 dark:text-slate-100 mt-1">{formatImporte(pedido.descuento)}</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-5">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Total</p>
          <p className="text-2xl font-black text-gray-900 dark:text-slate-100 mt-1">{formatImporte(pedido.total)}</p>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-5">
        <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-4">Items del pedido</h2>
        {pedido.detalles.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">No hay items cargados para este pedido.</p>
        ) : (
          <div className="space-y-3">
            {pedido.detalles.map((item) => {
              const rowKey = `${item.pedido_id}-${item.producto_id}-${item.created_at}`;
              const itemNote = getItemNote(item as unknown as Record<string, unknown>);
              const isExpanded = Boolean(expandedNotes[rowKey]);

              return (
                <div key={rowKey} className="flex items-start gap-4 p-3 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{item.nombre_snapshot}</p>
                    {item.personalizacion.length > 0 && (
                      <div className="inline-flex text-[11px] rounded-md border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 px-2 py-0.5">
                        Sin: {resolverPersonalizacion(item.producto_id, item.personalizacion).join(", ")}
                      </div>
                    )}
                    {itemNote && (
                      <>
                        <button type="button" onClick={() => setExpandedNotes((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }))}
                          className="text-[11px] font-semibold text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200">
                          {isExpanded ? "Ocultar nota" : "Ver nota"}
                        </button>
                        {isExpanded && (
                          <p className="text-xs text-gray-600 dark:text-slate-400 rounded-lg border border-blue-100 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20 p-2">
                            {itemNote}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-slate-300 flex-shrink-0">
                    <span className="text-gray-500 dark:text-slate-400">x{item.cantidad}</span>
                    <span>{formatImporte(item.precio_snapshot)}</span>
                    <span className="font-bold text-gray-900 dark:text-slate-100">{formatImporte(item.subtotal_snap)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notes */}
      {pedido.notas && (
        <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-2">Nota general</h2>
          <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">{pedido.notas}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-5">
        <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-4">Historial de estados</h2>
        {pedido.historial.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">No hay historial registrado.</p>
        ) : (
          <div className="space-y-0">
            {pedido.historial.map((h, index) => {
              const fromLabel = h.estado_desde ? formatEstadoLabel(h.estado_desde) : null;
              const toLabel = formatEstadoLabel(h.estado_hacia);
              const transitionText = fromLabel ? `${fromLabel} \u2192 ${toLabel}` : `Estado inicial: ${toLabel}`;
              const isLast = index === pedido.historial.length - 1;
              const dotColor = ESTADOS[h.estado_hacia]
                ? (h.estado_hacia === "CANCELADO" ? "bg-red-500" : h.estado_hacia === "ENTREGADO" ? "bg-green-500" : "bg-blue-600")
                : "bg-blue-600";

              return (
                <div key={h.id} className="relative pl-8 pb-6 last:pb-0">
                  {!isLast && (
                    <span className="absolute left-[13px] top-6 h-[calc(100%-8px)] w-0.5 bg-gray-200 dark:bg-slate-700" />
                  )}
                  <span className={`absolute left-1.5 top-1.5 h-4 w-4 rounded-full ${dotColor} ring-4 ring-white dark:ring-slate-900`} />
                  <div className="rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-3.5 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                    <p className="font-semibold text-sm text-gray-900 dark:text-slate-100">{transitionText}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{formatFechaHora(h.created_at)}</p>
                    {h.motivo && <p className="text-xs text-gray-600 dark:text-slate-400 mt-2 italic">Motivo: {h.motivo}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm Cancel Modal */}
      {confirmCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" onClick={() => setConfirmCancelOpen(false)} className="absolute inset-0 bg-slate-950/50" aria-label="Cerrar confirmacion de cancelacion" />
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">Confirmar cancelacion del pedido</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-5">
              Vas a cancelar el pedido <span className="font-semibold">#{pedido.id}</span>. Esta accion no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmCancelOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700">
                Volver
              </button>
              <button type="button" onClick={() => { setMotivoModalOpen(true); setConfirmCancelOpen(false); setMotivoError(null); setMotivoLibre(""); }}
                className="px-4 py-2 rounded-xl text-white bg-red-600 hover:bg-red-700">
                Si, cancelar pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Motivo Modal */}
      {motivoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" onClick={() => setMotivoModalOpen(false)} className="absolute inset-0 bg-slate-950/50" aria-label="Cerrar modal de motivo" />
          <div className="relative w-full max-w-xl rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">Motivo de cancelacion</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">Si queres, podes indicar el motivo.</p>

            <div className="space-y-1.5 mb-4">
              {motivosCancelacion.map((motivo) => (
                <label key={motivo} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-slate-200 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                  <input type="radio" name="motivo-cancelacion-detalle" checked={motivoSeleccionado === motivo}
                    onChange={() => { setMotivoSeleccionado(motivo); setMotivoError(null); }}
                    className="text-blue-600 border-gray-300 dark:border-slate-600" />
                  <span>{motivo === "__OTRO__" ? "Otro motivo (escribir)" : motivo === "__OMITIR__" ? "Prefiero no indicar motivo" : motivo}</span>
                </label>
              ))}
            </div>

            {motivoSeleccionado === "__OTRO__" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Escribi tu motivo</label>
                <textarea value={motivoLibre} onChange={(e) => { setMotivoLibre(e.target.value); setMotivoError(null); }}
                  rows={3} className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-950/80 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contanos brevemente el motivo..." />
              </div>
            )}

            {motivoError && (
              <div className="mb-4 text-sm text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-3">
                {motivoError}
              </div>
            )}

            {cancelarMutation.isError && (
              <div className="mb-4 text-sm text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-3">
                {getApiErrorMessage(cancelarMutation.error, "No se pudo cancelar el pedido")}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setMotivoModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700">
                Volver
              </button>
              <button type="button" disabled={cancelarMutation.isPending} onClick={handleConfirmarCancelacion}
                className="px-4 py-2 rounded-xl text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {cancelarMutation.isPending ? "Cancelando..." : "Confirmar cancelacion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
