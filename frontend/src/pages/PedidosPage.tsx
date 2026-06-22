import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";

import type { AvanzarEstadoPayload, Pedido } from "../models/Pedido";
import { CANCELABLES, ESTADOS, TRANSICIONES } from "../models/Pedido";
import { avanzarEstado, fetchPedidos } from "../api/pedidosApi";
import { Pagination } from "../components/Pagination";
import { getApiErrorMessage } from "../api/http";
import { getUnreadOperatorPedidoIds, markPedidosAsSeen } from "../api/pedidosUnread";
import { useAuth } from "../hooks/useAuth";
import { usePermissions } from "../hooks/useRoles";

const PAGE_SIZE = 10;
const FETCH_LIMIT = 100;

type DateFilterMode = "dia" | "rango";
type PedidosRestoreState = {
  dateMode?: DateFilterMode;
  fechaDia?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  estadoFiltro?: string;
  importeSearch?: string;
  selectedImportes?: string[];
};

function formatFecha(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("es-AR");
}

function formatImporte(value: number): string {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function parseImporte(raw: number | string): number {
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateInputKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function fetchAllPedidos(): Promise<Pedido[]> {
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  const all: Pedido[] = [];

  while (offset < total) {
    const response = await fetchPedidos({ offset, limit: FETCH_LIMIT });
    total = response.total ?? all.length;
    all.push(...(response.items ?? []));
    if (!response.items?.length) break;
    offset += FETCH_LIMIT;
  }

  return all;
}

export function PedidosPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const { canManagePedidos } = usePermissions();
  const isRestoringRef = useRef(false);
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelPedido, setCancelPedido] = useState<Pedido | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [dateMode, setDateMode] = useState<DateFilterMode>("dia");
  const [fechaDia, setFechaDia] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [importeSearch, setImporteSearch] = useState("");
  const [selectedImportes, setSelectedImportes] = useState<Set<string>>(new Set());
  const [visibleHighlightedIds, setVisibleHighlightedIds] = useState<Set<number>>(new Set());

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["pedidos", "all"],
    queryFn: fetchAllPedidos,
  });

  const pedidos = useMemo(() => data ?? [], [data]);
  const highlightedIds = useMemo(() => {
    if (!userId) return new Set<number>();
    return new Set(getUnreadOperatorPedidoIds(userId, pedidos));
  }, [pedidos, userId]);

  const importesDisponibles = useMemo(() => {
    const map = new Map<string, number>();
    for (const pedido of pedidos) {
      const amount = parseImporte(pedido.total);
      const key = amount.toFixed(2);
      if (!map.has(key)) map.set(key, amount);
    }
    return Array.from(map.entries())
      .map(([key, value]) => ({ key, value, label: formatImporte(value) }))
      .sort((a, b) => a.value - b.value);
  }, [pedidos]);

  const importesFiltrados = useMemo(() => {
    const search = importeSearch.trim().toLowerCase();
    if (!search) return importesDisponibles;
    return importesDisponibles.filter((importe) => {
      const normalized = importe.label.toLowerCase();
      return normalized.includes(search) || importe.key.includes(search.replace(",", "."));
    });
  }, [importeSearch, importesDisponibles]);

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((pedido) => {
      if (estadoFiltro && pedido.estado_codigo !== estadoFiltro) return false;

      const amount = parseImporte(pedido.total);
      if (selectedImportes.size > 0 && !selectedImportes.has(amount.toFixed(2))) return false;

      const fecha = new Date(pedido.created_at);
      if (Number.isNaN(fecha.getTime())) return false;
      const key = dateInputKey(fecha);

      if (dateMode === "dia") {
        if (fechaDia && key !== fechaDia) return false;
      } else {
        if (fechaDesde && key < fechaDesde) return false;
        if (fechaHasta && key > fechaHasta) return false;
      }

      return true;
    });
  }, [pedidos, estadoFiltro, selectedImportes, dateMode, fechaDia, fechaDesde, fechaHasta]);

  const totalFiltrados = pedidosFiltrados.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltrados / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const pedidosPagina = pedidosFiltrados.slice(offset, offset + PAGE_SIZE);
  const showing = Math.min(offset + pedidosPagina.length, totalFiltrados);

  const buildRestoreState = (): PedidosRestoreState => ({
    dateMode,
    fechaDia,
    fechaDesde,
    fechaHasta,
    estadoFiltro,
    importeSearch,
    selectedImportes: Array.from(selectedImportes),
  });

  useEffect(() => {
    const state = location.state as { restorePage?: number; restoreState?: PedidosRestoreState } | null;
    if (!state) return;

    isRestoringRef.current = true;

    const next = state.restoreState;
    if (next) {
      if (next.dateMode === "dia" || next.dateMode === "rango") setDateMode(next.dateMode);
      if (typeof next.fechaDia === "string") setFechaDia(next.fechaDia);
      if (typeof next.fechaDesde === "string") setFechaDesde(next.fechaDesde);
      if (typeof next.fechaHasta === "string") setFechaHasta(next.fechaHasta);
      if (typeof next.estadoFiltro === "string") setEstadoFiltro(next.estadoFiltro);
      if (typeof next.importeSearch === "string") setImporteSearch(next.importeSearch);
      if (Array.isArray(next.selectedImportes)) setSelectedImportes(new Set(next.selectedImportes));
    }

    if (typeof state.restorePage === "number" && Number.isFinite(state.restorePage) && state.restorePage > 0) {
      setPage(state.restorePage);
    }

    navigate(location.pathname, { replace: true });
    queueMicrotask(() => {
      isRestoringRef.current = false;
    });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (isRestoringRef.current) return;
    setPage(1);
  }, [dateMode, fechaDia, fechaDesde, fechaHasta, estadoFiltro, selectedImportes]);

  useEffect(() => {
    if (currentPage !== page) setPage(currentPage);
  }, [currentPage, page]);

  useEffect(() => {
    if (!userId || highlightedIds.size === 0) return;
    const highlightedPedidoIds = Array.from(highlightedIds);
    setVisibleHighlightedIds(new Set(highlightedPedidoIds));
    markPedidosAsSeen(userId, highlightedPedidoIds);
    queryClient.invalidateQueries({ queryKey: ["pedidos", "all", "navbar"] });
    queryClient.invalidateQueries({ queryKey: ["pedidos"] });
    const id = window.setTimeout(() => setVisibleHighlightedIds(new Set()), 3000);
    return () => window.clearTimeout(id);
  }, [highlightedIds, queryClient, userId]);

  const estadoMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AvanzarEstadoPayload }) =>
      avanzarEstado(id, payload),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
    },
    onError: (err) => setActionError(getApiErrorMessage(err, "No se pudo cambiar el estado")),
  });

  const handleAvanzar = (pedido: Pedido, hacia: string) => {
    estadoMutation.mutate({ id: pedido.id, payload: { estado_hacia: hacia } });
  };

  const handleCancelar = (pedido: Pedido) => {
    setCancelPedido(pedido);
    setCancelMotivo("");
    setCancelError(null);
  };

  const confirmarCancelacion = () => {
    if (!cancelPedido) return;
    const motivo = cancelMotivo.trim();
    if (!motivo) {
      setCancelError("El motivo es obligatorio para cancelar un pedido.");
      return;
    }
    estadoMutation.mutate({
      id: cancelPedido.id,
      payload: { estado_hacia: "CANCELADO", motivo },
    });
    setCancelPedido(null);
    setCancelMotivo("");
    setCancelError(null);
  };

  const toggleImporte = (importeKey: string) => {
    setSelectedImportes((prev) => {
      const next = new Set(prev);
      if (next.has(importeKey)) next.delete(importeKey);
      else next.add(importeKey);
      return next;
    });
  };

  const clearAllFilters = () => {
    setDateMode("dia");
    setFechaDia("");
    setFechaDesde("");
    setFechaHasta("");
    setEstadoFiltro("");
    setImporteSearch("");
    setSelectedImportes(new Set());
  };

  const activeFilterCount =
    (fechaDia ? 1 : 0) +
    ((fechaDesde || fechaHasta) ? 1 : 0) +
    (estadoFiltro ? 1 : 0) +
    (selectedImportes.size > 0 ? 1 : 0);

  const openPedidoDetalle = (pedido: Pedido) => {
    navigate(`/pedidos/${pedido.id}`, {
      state: {
        returnTo: "/pedidos",
        returnPage: currentPage,
        returnState: buildRestoreState(),
      },
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tight">Gestion de pedidos</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Administra y gestiona los pedidos del negocio</p>
      </div>

      {/* Search & Filters Panel */}
      <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mr-1">Filtros</span>

          {/* Date filter chip */}
          <div className="relative inline-flex items-center gap-1.5">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-all ${(fechaDia || fechaDesde || fechaHasta) ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-200" : "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300"}`}>
              <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
              <select
                value={dateMode}
                onChange={(e) => setDateMode(e.target.value as DateFilterMode)}
                className="appearance-none bg-transparent text-sm font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="dia">Dia</option>
                <option value="rango">Rango</option>
              </select>
            </div>
            {dateMode === "dia" ? (
              <input type="date" value={fechaDia} onChange={(e) => setFechaDia(e.target.value)}
                className="px-2.5 py-1.5 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
            ) : (
              <>
                <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
                  className="px-2.5 py-1.5 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                <span className="text-xs text-gray-400 dark:text-slate-500">a</span>
                <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
                  className="px-2.5 py-1.5 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </>
            )}
          </div>

          {/* Importe multi-select chip */}
          <details className="relative group">
            <summary className={`list-none cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-all ${selectedImportes.size > 0 ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-200" : "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600"} group-open:border-blue-500 group-open:ring-2 group-open:ring-blue-500/20`}>
              <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
              <span>{selectedImportes.size > 0 ? `${selectedImportes.size} importe(s)` : "Importe"}</span>
              <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5 opacity-60 transition-transform group-open:rotate-180" aria-hidden="true"><path d="M5 7.5 10 12.5l5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </summary>
            <div className="absolute z-40 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl p-3 space-y-2">
              <input type="text" value={importeSearch} onChange={(e) => setImporteSearch(e.target.value)}
                placeholder="Buscar importe..." className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-950/80 text-gray-700 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              <div className="max-h-44 overflow-y-auto space-y-0.5">
                {importesFiltrados.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-slate-500 py-2">Sin coincidencias.</p>
                ) : (
                  importesFiltrados.map((importe) => (
                    <label key={importe.key} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 text-sm text-gray-700 dark:text-slate-200 cursor-pointer">
                      <input type="checkbox" checked={selectedImportes.has(importe.key)} onChange={() => toggleImporte(importe.key)}
                        className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
                      {importe.label}
                    </label>
                  ))
                )}
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-slate-700">
                <button type="button" onClick={() => {
                    const allVisible = importesFiltrados.every((i) => selectedImportes.has(i.key));
                    setSelectedImportes((prev) => {
                      const next = new Set(prev);
                      if (allVisible) { for (const i of importesFiltrados) next.delete(i.key); }
                      else { for (const i of importesFiltrados) next.add(i.key); }
                      return next;
                    });
                  }} className="text-[11px] font-medium text-blue-600 dark:text-blue-300 hover:underline">Seleccionar visibles</button>
                {selectedImportes.size > 0 && (
                  <button type="button" onClick={() => setSelectedImportes(new Set())} className="text-[11px] font-medium text-gray-500 dark:text-slate-400 hover:underline">Limpiar</button>
                )}
              </div>
            </div>
          </details>

          {/* Estado filter chips */}
          {Object.entries(ESTADOS).map(([codigo, meta]) => (
            <button key={codigo} type="button"
              onClick={() => setEstadoFiltro(estadoFiltro === codigo ? "" : codigo)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border rounded-full transition-all ${estadoFiltro === codigo ? `${meta.badgeClass} ring-2 ring-offset-1 ring-current/20` : "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600"}`}>
              {meta.label}
            </button>
          ))}

          {/* Clear */}
          {activeFilterCount > 0 && (
            <button type="button" onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>
              Limpiar ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {!isLoading && !isError && pedidos.length > 0 && (
        <div className="flex justify-end">
          <div className="text-sm text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/60 rounded-lg px-3 py-1.5">
            {showing} de {totalFiltrados} pedidos
            {isFetching && <span className="ml-2 text-blue-500 dark:text-blue-400">actualizando...</span>}
          </div>
        </div>
      )}

      {actionError && (
        <div className="text-sm text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-3">
          {actionError}
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
            <p className="text-red-700 dark:text-red-300 font-semibold">{getApiErrorMessage(error, "No se pudo cargar el listado de pedidos")}</p>
          </div>
        </div>
      ) : pedidosPagina.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900/75 rounded-2xl border border-gray-100 dark:border-slate-700">
          <svg className="mx-auto w-12 h-12 text-gray-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
          <p className="text-gray-500 dark:text-slate-400 text-lg font-medium">No hay pedidos para los filtros seleccionados.</p>
        </div>
      ) : (
        <>
          {/* Order Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pedidosPagina.map((p) => {
              const estado = ESTADOS[p.estado_codigo] ?? {
                label: p.estado_codigo,
                badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
              };
              const transiciones = canManagePedidos ? (TRANSICIONES[p.estado_codigo] ?? []) : [];
              const puedeCancelar = canManagePedidos && CANCELABLES.includes(p.estado_codigo);
              const isHighlighted = visibleHighlightedIds.has(p.id);

              return (
                <article
                  key={p.id}
                  onClick={() => openPedidoDetalle(p)}
                  className={`group relative rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer flex flex-col ${
                    isHighlighted
                      ? "border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 ring-2 ring-amber-200 dark:ring-amber-700 animate-pulse"
                      : "bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-700 hover:shadow-lg hover:-translate-y-0.5"
                  }`}
                >
                  {/* Top accent bar */}
                  <div className={`h-1 w-full ${
                    p.estado_codigo === "PENDIENTE" ? "bg-gray-300 dark:bg-slate-600" :
                    p.estado_codigo === "CONFIRMADO" ? "bg-sky-400" :
                    p.estado_codigo === "EN_PREP" ? "bg-amber-400" :
                    p.estado_codigo === "ENTREGADO" ? "bg-green-400" :
                    p.estado_codigo === "CANCELADO" ? "bg-red-400" : "bg-gray-300"
                  }`} />

                  <div className="p-4 flex flex-col flex-1 gap-3">
                    {/* Header: ID + Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-gray-900 dark:text-slate-100">#{p.id}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${estado.badgeClass}`}>
                        {estado.label}
                      </span>
                    </div>

                    {/* Date + Total */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400">
                        <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                        {formatFecha(p.created_at)}
                      </div>
                      <span className="text-lg font-bold text-gray-900 dark:text-slate-100">{formatImporte(parseImporte(p.total))}</span>
                    </div>

                    {/* Actions */}
                    {(transiciones.length > 0 || puedeCancelar) && (
                      <div className="flex flex-wrap gap-2 pt-1 mt-auto border-t border-gray-100 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                        {transiciones.map((t) => (
                          <button key={t.hacia} type="button" disabled={estadoMutation.isPending}
                            onClick={() => handleAvanzar(p, t.hacia)}
                            className="flex-1 min-w-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors">
                            {t.label}
                          </button>
                        ))}
                        {puedeCancelar && (
                          <button type="button" disabled={estadoMutation.isPending}
                            onClick={() => handleCancelar(p)}
                            className="bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors">
                            Cancelar
                          </button>
                        )}
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

      {/* Cancel Modal */}
      {cancelPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" onClick={() => setCancelPedido(null)} className="absolute inset-0 bg-slate-950/50" aria-label="Cerrar cancelacion" />
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Cancelar pedido #{cancelPedido.id}</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">Indica el motivo para registrar la cancelacion.</p>
              </div>
              <button type="button" onClick={() => setCancelPedido(null)}
                className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700" aria-label="Cerrar">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <label className="mt-5 block text-sm font-semibold text-gray-700 dark:text-slate-200" htmlFor="motivo-cancelacion-admin">
              Motivo de cancelacion
            </label>
            <textarea
              id="motivo-cancelacion-admin"
              value={cancelMotivo}
              onChange={(event) => { setCancelMotivo(event.target.value); setCancelError(null); }}
              rows={4}
              className="mt-2 w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-950/80 px-3 py-2 text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ejemplo: sin stock, pedido duplicado, solicitud del cliente..."
            />
            {cancelError && <p className="mt-2 text-sm text-red-700 dark:text-red-300">{cancelError}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setCancelPedido(null)}
                className="rounded-xl bg-gray-100 dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700">
                Volver
              </button>
              <button type="button" onClick={confirmarCancelacion} disabled={estadoMutation.isPending}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                Confirmar cancelacion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
