import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AvanzarEstadoPayload, Pedido } from "../models/Pedido";
import { ESTADOS } from "../models/Pedido";
import { avanzarEstado, fetchPedidos } from "../api/pedidosApi";
import { getApiErrorMessage } from "../api/http";
import { getUnreadClientPedidoUpdateIds, markPedidoStatusesAsSeen } from "../api/pedidosUnread";
import { Pagination } from "../components/Pagination";
import { useAuth } from "../hooks/useAuth";

const LIMIT = 100;
const PAGE_SIZE = 10;

type FiltroPedidos = "TODOS" | "EN_PROCESO" | "REALIZADOS" | "CANCELADOS";

const FILTROS: { id: FiltroPedidos; label: string; estados: string[] | null }[] = [
  { id: "TODOS", label: "Todos", estados: null },
  { id: "EN_PROCESO", label: "En proceso", estados: ["PENDIENTE", "CONFIRMADO", "EN_PREP"] },
  { id: "REALIZADOS", label: "Realizados", estados: ["ENTREGADO"] },
  { id: "CANCELADOS", label: "Cancelados", estados: ["CANCELADO"] },
];

const MOTIVOS_CANCELACION = [
  { id: "EQUIVOCACION", label: "Me equivoque al hacer el pedido", value: "Me equivoque al hacer el pedido." },
  { id: "CAMBIO", label: "Quiero cambiar productos del pedido", value: "Quiero cambiar productos del pedido." },
  { id: "TIEMPO", label: "Ya no lo necesito en este momento", value: "Ya no lo necesito en este momento." },
  { id: "PAGO", label: "Tuve un problema con el metodo de pago", value: "Tuve un problema con el metodo de pago." },
  { id: "OTRO", label: "Otro motivo (escribir)", value: "__OTRO__" },
  { id: "OMITIR", label: "Prefiero no indicar motivo", value: "__OMITIR__" },
] as const;

function currency(value: number | string): string {
  return Number(value).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function formatFecha(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("es-AR");
}

function formatFormaPago(codigo: string): string {
  const labels: Record<string, string> = {
    EFECTIVO: "Efectivo",
    TARJETA: "Tarjeta",
    TRANSFERENCIA: "Transferencia (Mercado Pago)",
    MERCADOPAGO: "Transferencia (Mercado Pago)",
  };
  return labels[codigo] ?? codigo;
}

export function MisPedidosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const [filtro, setFiltro] = useState<FiltroPedidos>("TODOS");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmPedido, setConfirmPedido] = useState<Pedido | null>(null);
  const [motivoPedido, setMotivoPedido] = useState<Pedido | null>(null);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<string>(MOTIVOS_CANCELACION[0].value);
  const [motivoLibre, setMotivoLibre] = useState("");
  const [motivoError, setMotivoError] = useState<string | null>(null);
  const [visibleHighlightedIds, setVisibleHighlightedIds] = useState<Set<number>>(new Set());

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["mis-pedidos"],
    queryFn: () => fetchPedidos({ offset: 0, limit: LIMIT }),
  });

  const pedidos = useMemo(() => data?.items ?? [], [data?.items]);
  const pedidosFiltrados = useMemo(() => {
    const filtroActivo = FILTROS.find((item) => item.id === filtro);
    if (!filtroActivo?.estados) return pedidos;
    return pedidos.filter((pedido) => filtroActivo.estados?.includes(pedido.estado_codigo));
  }, [filtro, pedidos]);
  const highlightedIds = useMemo(() => {
    if (!userId) return new Set<number>();
    return new Set(getUnreadClientPedidoUpdateIds(userId, pedidos));
  }, [pedidos, userId]);

  const totalPages = Math.max(1, Math.ceil(pedidosFiltrados.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const pedidosPagina = pedidosFiltrados.slice(offset, offset + PAGE_SIZE);
  const showing = Math.min(offset + pedidosPagina.length, pedidosFiltrados.length);

  useEffect(() => {
    setPage(1);
  }, [filtro]);

  useEffect(() => {
    if (currentPage !== page) setPage(currentPage);
  }, [currentPage, page]);

  useEffect(() => {
    if (!userId || highlightedIds.size === 0) return;
    const highlightedPedidos = pedidos.filter((pedido) => highlightedIds.has(pedido.id));
    setVisibleHighlightedIds(new Set(highlightedPedidos.map((pedido) => pedido.id)));
    markPedidoStatusesAsSeen(userId, highlightedPedidos);
    queryClient.invalidateQueries({ queryKey: ["mis-pedidos", "navbar"] });
    queryClient.invalidateQueries({ queryKey: ["mis-pedidos"] });
    const id = window.setTimeout(() => {
      setVisibleHighlightedIds(new Set());
    }, 3000);
    return () => window.clearTimeout(id);
  }, [highlightedIds, pedidos, queryClient, userId]);

  const estadoMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AvanzarEstadoPayload }) =>
      avanzarEstado(id, payload),
    onSuccess: () => {
      setActionError(null);
      setMotivoError(null);
      setConfirmPedido(null);
      setMotivoPedido(null);
      setMotivoLibre("");
      setMotivoSeleccionado(MOTIVOS_CANCELACION[0].value);
      queryClient.invalidateQueries({ queryKey: ["mis-pedidos"] });
    },
    onError: (err) => setActionError(getApiErrorMessage(err, "No se pudo cancelar el pedido")),
  });

  const handleCancelar = (pedido: Pedido, motivo: string) => {
    estadoMutation.mutate({
      id: pedido.id,
      payload: { estado_hacia: "CANCELADO", motivo },
    });
  };

  const openPedidoDetalle = (pedido: Pedido) => {
    navigate(`/mis-pedidos/${pedido.id}`, {
      state: { returnTo: "/mis-pedidos" },
    });
  };

  const handleContinuarConMotivo = () => {
    if (!motivoPedido) return;

    if (motivoSeleccionado === "__OTRO__") {
      const personalizado = motivoLibre.trim();
      if (!personalizado) {
        setMotivoError("Escribi el motivo para poder continuar.");
        return;
      }
      handleCancelar(motivoPedido, personalizado);
      return;
    }

    if (motivoSeleccionado === "__OMITIR__") {
      handleCancelar(motivoPedido, "El cliente prefirio no indicar un motivo de cancelacion.");
      return;
    }

    handleCancelar(motivoPedido, motivoSeleccionado);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tight">Mis pedidos</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {pedidos.length} pedido{pedidos.length === 1 ? "" : "s"}
            {isFetching && <span className="ml-2 text-blue-500 dark:text-blue-400">actualizando...</span>}
          </p>
        </div>
        <Link to="/hacer-pedido"
          className="inline-flex items-center gap-2 bg-gray-800 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Hacer pedido
        </Link>
      </div>

      {/* Filter Panel */}
      <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mr-1">Filtros</span>
          {FILTROS.map((item) => (
            <button key={item.id} type="button" onClick={() => setFiltro(item.id)}
              className={`inline-flex items-center px-3 py-1.5 text-sm font-semibold border rounded-full transition-all ${
                filtro === item.id
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-800 ring-2 ring-blue-500/20"
                  : "bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
              }`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <div className="text-sm text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-3">
          {actionError}
        </div>
      )}

      {!isLoading && !isError && pedidos.length > 0 && (
        <div className="flex justify-end">
          <div className="text-sm text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/60 rounded-lg px-3 py-1.5">
            {showing} de {pedidosFiltrados.length} pedidos
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-gray-800 dark:border-slate-300 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 dark:text-slate-400 font-medium">Cargando pedidos...</p>
          </div>
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center py-20">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl p-6 max-w-md text-center">
            <p className="text-red-700 dark:text-red-300 font-semibold">{getApiErrorMessage(error, "No se pudo cargar tus pedidos")}</p>
          </div>
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900/75 rounded-2xl border border-gray-100 dark:border-slate-700">
          <svg className="mx-auto w-12 h-12 text-gray-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
          <p className="text-gray-500 dark:text-slate-400 text-lg font-medium">No hay pedidos para este filtro.</p>
        </div>
      ) : (
        <>
          {/* Order Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pedidosPagina.map((pedido) => {
              const estado = ESTADOS[pedido.estado_codigo] ?? {
                label: pedido.estado_codigo,
                badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
              };
              const puedeCancelar = pedido.estado_codigo === "PENDIENTE";
              const isHighlighted = visibleHighlightedIds.has(pedido.id);

              return (
                <article
                  key={pedido.id}
                  onClick={() => openPedidoDetalle(pedido)}
                  className={`group relative rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer flex flex-col ${
                    isHighlighted
                      ? "border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 ring-2 ring-amber-200 dark:ring-amber-700 animate-pulse"
                      : "bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-700 hover:shadow-lg hover:-translate-y-0.5"
                  }`}
                >
                  {/* Top accent bar */}
                  <div className={`h-1 w-full ${
                    pedido.estado_codigo === "PENDIENTE" ? "bg-gray-300 dark:bg-slate-600" :
                    pedido.estado_codigo === "CONFIRMADO" ? "bg-sky-400" :
                    pedido.estado_codigo === "EN_PREP" ? "bg-amber-400" :
                    pedido.estado_codigo === "ENTREGADO" ? "bg-green-400" :
                    pedido.estado_codigo === "CANCELADO" ? "bg-red-400" : "bg-gray-300"
                  }`} />

                  <div className="p-4 flex flex-col flex-1 gap-3">
                    {/* Header: ID + Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-gray-900 dark:text-slate-100">#{pedido.id}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${estado.badgeClass}`}>
                        {estado.label}
                      </span>
                    </div>

                    {/* Info rows */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400">
                        <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                        {formatFecha(pedido.created_at)}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400">
                        <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>
                        {formatFormaPago(pedido.forma_pago_codigo)}
                      </div>
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-end mt-auto">
                      <span className="text-xl font-bold text-gray-900 dark:text-slate-100">{currency(pedido.total)}</span>
                    </div>

                    {/* Cancel action */}
                    {puedeCancelar && (
                      <div className="pt-1 border-t border-gray-100 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                        <button type="button" disabled={estadoMutation.isPending}
                          onClick={() => { setActionError(null); setMotivoError(null); setConfirmPedido(pedido); }}
                          className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors">
                          Cancelar pedido
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Confirm Cancel Modal */}
      {confirmPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" onClick={() => setConfirmPedido(null)} className="absolute inset-0 bg-slate-950/50" aria-label="Cerrar confirmacion de cancelacion" />
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">Confirmar cancelacion del pedido</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-5">
              Vas a cancelar el pedido <span className="font-semibold">#{confirmPedido.id}</span>. Esta accion no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmPedido(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700">
                Volver
              </button>
              <button type="button" onClick={() => {
                  setMotivoError(null); setMotivoSeleccionado(MOTIVOS_CANCELACION[0].value);
                  setMotivoLibre(""); setMotivoPedido(confirmPedido); setConfirmPedido(null);
                }} className="px-4 py-2 rounded-xl text-white bg-red-600 hover:bg-red-700">
                Si, cancelar pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Motivo Modal */}
      {motivoPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" onClick={() => { setMotivoPedido(null); setMotivoError(null); }}
            className="absolute inset-0 bg-slate-950/50" aria-label="Cerrar modal de motivo" />
          <div className="relative w-full max-w-xl rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">Motivo de cancelacion</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
              Si queres, podes elegir un motivo para cancelar el pedido <span className="font-semibold">#{motivoPedido.id}</span>.
            </p>

            <div className="space-y-1.5 mb-4">
              {MOTIVOS_CANCELACION.map((motivo) => (
                <label key={motivo.id} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-slate-200 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                  <input type="radio" name="motivo-cancelacion" checked={motivoSeleccionado === motivo.value}
                    onChange={() => { setMotivoSeleccionado(motivo.value); setMotivoError(null); }}
                    className="text-blue-600 border-gray-300 dark:border-slate-600" />
                  <span>{motivo.label}</span>
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

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setMotivoPedido(null); setMotivoError(null); }}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700">
                Cancelar
              </button>
              <button type="button" disabled={estadoMutation.isPending} onClick={handleContinuarConMotivo}
                className="px-4 py-2 rounded-xl text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {estadoMutation.isPending ? "Cancelando..." : "Confirmar cancelacion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
