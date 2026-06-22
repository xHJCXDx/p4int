import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Categoria } from "../../models/Categoria";
import { useCategorias } from "../../hooks/useCategoria";
import { usePermissions } from "../../hooks/useRoles";
import { SearchBar } from "../../components/SearchBar";
import { CategoriaProductoModal } from "./CategoriaProductoModal";

interface GrillaCategoriasProps {
  onEditar: (
    categoria: Categoria,
    context?: {
      returnPage: number;
      returnState: {
        searchTerm: string;
        categoriaFiltroId: number | "";
        estadoFiltro: "" | "activo" | "inactivo";
        expandedIds?: number[];
        sortBy: "" | "categoria" | "subcategoria" | "subcategoria2";
        sortDir: "" | "asc" | "desc";
      };
    },
  ) => void;
  action?: ReactNode;
}

type ConfirmModalState = {
  kind: "desactivar" | "reactivar" | "eliminar_definitivo";
  total: number;
};

export function GrillaCategorias({ onEditar, action }: GrillaCategoriasProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { eliminarDefinitivo, cambiarEstado, categorias: todasLasCategorias } = useCategorias();
  const { canManageCatalogo, isAdmin } = usePermissions();

  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<"" | "activo" | "inactivo">("");
  const [estadoDropdownOpen, setEstadoDropdownOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [highlightedCategoryId, setHighlightedCategoryId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [productoPopup, setProductoPopup] = useState<{ categoriaNombre: string; total: number; items: string[] } | null>(null);
  const estadoDropdownRef = useRef<HTMLDivElement | null>(null);

  const categoriasPorId = useMemo(
    () => new Map(todasLasCategorias.filter((cat) => cat.id).map((cat) => [Number(cat.id), cat])),
    [todasLasCategorias],
  );

  const hijosAllPorParentId = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const cat of todasLasCategorias) {
      if (!cat.id || cat.parent_id === null) continue;
      const arr = map.get(Number(cat.parent_id)) || [];
      arr.push(Number(cat.id));
      map.set(Number(cat.parent_id), arr);
    }
    return map;
  }, [todasLasCategorias]);

  const categoriasVisibles = useMemo(() => {
    return todasLasCategorias.filter((cat) => {
      if (!cat.id) return false;
      if (!canManageCatalogo) return cat.is_active !== false;
      if (estadoFiltro === "activo") return cat.is_active !== false;
      if (estadoFiltro === "inactivo") return cat.is_active === false;
      return true;
    });
  }, [todasLasCategorias, canManageCatalogo, estadoFiltro]);

  const hijosVisiblesPorParent = useMemo(() => {
    const map = new Map<number | null, Categoria[]>();
    for (const cat of categoriasVisibles) {
      if (!cat.id) continue;
      const key = cat.parent_id ?? null;
      const arr = map.get(key) || [];
      arr.push(cat);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return map;
  }, [categoriasVisibles]);

  const productosPorCategoria = useMemo(() => {
    const byCat = new Map<number, { total: number; items: string[] }>();
    const collect = (categoriaId: number) => {
      const subtree = new Set<number>();
      const queue = [categoriaId];
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (subtree.has(current)) continue;
        subtree.add(current);
        queue.push(...(hijosAllPorParentId.get(current) || []));
      }
      const productos = new Map<number, string>();
      for (const id of subtree) {
        const cat = categoriasPorId.get(id);
        for (const p of cat?.productos || []) {
          if (!p.id || p.is_active === false) continue;
          productos.set(p.id, p.nombre);
        }
      }
      const items = Array.from(productos.values()).sort((a, b) => a.localeCompare(b, "es"));
      byCat.set(categoriaId, { total: items.length, items });
    };
    for (const cat of todasLasCategorias) { if (cat.id) collect(Number(cat.id)); }
    return byCat;
  }, [todasLasCategorias, categoriasPorId, hijosAllPorParentId]);

  const collectDescendantIds = (rootId: number) => {
    const ids: number[] = [rootId];
    const queue: number[] = [rootId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = hijosAllPorParentId.get(current) || [];
      for (const childId of children) { ids.push(childId); queue.push(childId); }
    }
    return ids;
  };

  const pathFromRoot = (catId: number): Categoria[] => {
    const path: Categoria[] = [];
    let current: Categoria | undefined = categoriasPorId.get(catId);
    const guard = new Set<number>();
    while (current && current.id && !guard.has(Number(current.id))) {
      guard.add(Number(current.id));
      path.unshift(current);
      current = current.parent_id != null ? categoriasPorId.get(Number(current.parent_id)) : undefined;
    }
    return path;
  };

  const term = searchTerm.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!term) return [];
    return categoriasVisibles
      .filter((cat) => cat.nombre.toLowerCase().includes(term))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [term, categoriasVisibles]);

  const rootCategories = hijosVisiblesPorParent.get(null) ?? [];
  const estadoLabel = estadoFiltro === "activo" ? "Activas" : estadoFiltro === "inactivo" ? "Inactivas" : "Todos los estados";

  const isHighlighted = (categoriaId?: number) =>
    Boolean(categoriaId && highlightedCategoryId && Number(categoriaId) === highlightedCategoryId);

  const buildRestoreState = () => ({
    searchTerm,
    categoriaFiltroId: "" as number | "",
    estadoFiltro,
    expandedIds: Array.from(expandedIds),
    sortBy: "" as "" | "categoria" | "subcategoria" | "subcategoria2",
    sortDir: "" as "" | "asc" | "desc",
  });

  const toggleExpanded = useCallback((catId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allWithChildren = new Set<number>();
    for (const cat of categoriasVisibles) {
      if (cat.id && (hijosVisiblesPorParent.get(Number(cat.id))?.length ?? 0) > 0) {
        allWithChildren.add(Number(cat.id));
      }
    }
    setExpandedIds(allWithChildren);
  }, [categoriasVisibles, hijosVisiblesPorParent]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const openProductosPopup = (categoriaId?: number) => {
    if (!categoriaId) return;
    const categoria = categoriasPorId.get(categoriaId);
    if (!categoria) return;
    const productos = productosPorCategoria.get(categoriaId) || { total: 0, items: [] };
    setProductoPopup({ categoriaNombre: categoria.nombre, total: productos.total, items: productos.items });
  };

  const toggleSeleccion = (categoriaId: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const hierarchyIds = collectDescendantIds(categoriaId);
      for (const id of hierarchyIds) { if (checked) next.add(id); else next.delete(id); }
      return next;
    });
  };

  const selectedCategorias = Array.from(selectedIds).map((id) => categoriasPorId.get(id)).filter((cat): cat is Categoria => Boolean(cat));
  const selectedActivas = selectedCategorias.filter((cat) => cat.is_active);
  const selectedInactivas = selectedCategorias.filter((cat) => !cat.is_active);

  const executeBulkAction = (kind: ConfirmModalState["kind"]) => {
    if (kind === "desactivar") {
      for (const cat of selectedActivas) { if (cat.id) cambiarEstado(cat.id, false); }
    } else if (kind === "reactivar") {
      for (const cat of selectedInactivas) { if (cat.id) cambiarEstado(cat.id, true); }
    } else {
      for (const cat of selectedInactivas) { if (cat.id) eliminarDefinitivo(cat.id); }
    }
    setSelectedIds(new Set());
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setEstadoFiltro("");
    setExpandedIds(new Set());
  };

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => categoriasPorId.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [categoriasPorId]);

  useEffect(() => {
    const state = location.state as {
      highlightCategoryId?: number;
      restoreState?: { searchTerm?: string; estadoFiltro?: "" | "activo" | "inactivo"; expandedIds?: number[] };
    } | null;
    if (!state) return;
    let consumed = false;
    if (state.restoreState) {
      const { searchTerm: ns, estadoFiltro: ne } = state.restoreState;
      if (typeof ns === "string") { setSearchTerm(ns); consumed = true; }
      if (ne === "" || ne === "activo" || ne === "inactivo") { setEstadoFiltro(ne); consumed = true; }
      if (Array.isArray(state.restoreState.expandedIds)) {
        setExpandedIds(new Set(state.restoreState.expandedIds.filter((id) => Number.isFinite(id))));
        consumed = true;
      }
    }
    if (typeof state.highlightCategoryId === "number" && Number.isFinite(state.highlightCategoryId) && state.highlightCategoryId > 0) {
      setHighlightedCategoryId(state.highlightCategoryId);
      const cat = categoriasPorId.get(state.highlightCategoryId);
      if (cat) {
        const ancestors = pathFromRoot(state.highlightCategoryId);
        setExpandedIds((prev) => {
          const next = new Set(prev);
          for (const a of ancestors.slice(0, -1)) { if (a.id) next.add(Number(a.id)); }
          return next;
        });
      }
      consumed = true;
    }
    if (consumed) navigate(location.pathname, { replace: true });
  }, [location.pathname, location.state, navigate, categoriasPorId]);

  useEffect(() => {
    if (!highlightedCategoryId) return;
    const id = window.setTimeout(() => setHighlightedCategoryId(null), 3000);
    return () => window.clearTimeout(id);
  }, [highlightedCategoryId]);

  useEffect(() => {
    if (!estadoDropdownOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!estadoDropdownRef.current?.contains(event.target as Node)) setEstadoDropdownOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEstadoDropdownOpen(false);
    };
    window.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onEscape);
    };
  }, [estadoDropdownOpen]);

  const renderTreeNode = (cat: Categoria, depth: number): ReactNode => {
    const catId = Number(cat.id);
    const hijos = hijosVisiblesPorParent.get(catId) ?? [];
    const tieneHijos = hijos.length > 0;
    const isExpanded = expandedIds.has(catId);
    const info = productosPorCategoria.get(catId) ?? { total: 0, items: [] };
    const inactiva = cat.is_active === false;
    const selected = selectedIds.has(catId);
    const highlighted = isHighlighted(catId);

    return (
      <div key={catId}>
        <div
          className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all ${
            highlighted
              ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20 ring-2 ring-amber-200 animate-pulse"
              : inactiva
                ? "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60"
                : "border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-900/80 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-sm"
          }`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          {/* Expand/collapse toggle */}
          <button
            type="button"
            onClick={() => tieneHijos && toggleExpanded(catId)}
            className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
              tieneHijos
                ? "text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-slate-200 cursor-pointer"
                : "text-transparent cursor-default"
            }`}
            aria-label={tieneHijos ? (isExpanded ? "Colapsar" : "Expandir") : undefined}
            tabIndex={tieneHijos ? 0 : -1}
          >
            {tieneHijos && (
              <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Selection checkbox */}
          {selectionMode && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => toggleSeleccion(catId, e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-gray-800 focus:ring-gray-500 flex-shrink-0"
              aria-label={`Seleccionar ${cat.nombre}`}
            />
          )}

          {/* Category info */}
          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">{cat.nombre}</span>
            {inactiva ? (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800/50">Inactiva</span>
            ) : (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800/50">Activa</span>
            )}
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {info.total} prod.{tieneHijos ? ` · ${hijos.length} sub.` : ""}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => openProductosPopup(catId)}
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline px-1.5 py-1"
            >
              Productos
            </button>
            {tieneHijos && (
              <button
                type="button"
                onClick={() => toggleExpanded(catId)}
                className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/60 rounded-lg px-2 py-1 hover:bg-blue-100 dark:hover:bg-blue-900/50"
              >
                {isExpanded ? "Colapsar" : `${hijos.length} sub.`}
              </button>
            )}
          </div>
        </div>

        {/* Children (expanded) */}
        {tieneHijos && isExpanded && (
          <div className="mt-1 space-y-1">
            {hijos.map((hijo) => renderTreeNode(hijo, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderSearchResult = (cat: Categoria): ReactNode => {
    const catId = Number(cat.id);
    const info = productosPorCategoria.get(catId) ?? { total: 0, items: [] };
    const inactiva = cat.is_active === false;
    const selected = selectedIds.has(catId);
    const highlighted = isHighlighted(catId);
    const ruta = pathFromRoot(catId);
    const rutaLabel = ruta.slice(0, -1).map((c) => c.nombre).join(" › ");

    return (
      <div
        key={catId}
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
          highlighted
            ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20 ring-2 ring-amber-200 animate-pulse"
            : inactiva
              ? "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60"
              : "border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-900/80 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-sm"
        }`}
      >
        {selectionMode && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => toggleSeleccion(catId, e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-gray-800 focus:ring-gray-500 flex-shrink-0"
            aria-label={`Seleccionar ${cat.nombre}`}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">{cat.nombre}</span>
            {inactiva ? (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800/50">Inactiva</span>
            ) : (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800/50">Activa</span>
            )}
          </div>
          {rutaLabel && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{rutaLabel}</p>}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{info.total} producto{info.total === 1 ? "" : "s"}</p>
        </div>
        <button
          type="button"
          onClick={() => openProductosPopup(catId)}
          className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex-shrink-0"
        >
          Productos
        </button>
      </div>
    );
  };

  return (
    <div className="mt-2">
      <div className="flex justify-between items-start mb-6 gap-3 flex-wrap">
        <h2 className="text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tight">Catalogo de Categorias</h2>
        {action && <div className="pt-2">{action}</div>}
      </div>

      {/* Search & Filters Panel */}
      <div className="mb-5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-4 space-y-3">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar categoria por nombre..." />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mr-1">Filtros</span>

          {/* Estado dropdown */}
          <div ref={estadoDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setEstadoDropdownOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-all ${estadoDropdownOpen ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200" : estadoFiltro ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-200" : "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600"}`}
              aria-haspopup="listbox"
              aria-expanded={estadoDropdownOpen}
            >
              <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
              <span>{estadoLabel}</span>
              <svg viewBox="0 0 20 20" fill="none" className={`h-3.5 w-3.5 opacity-60 transition-transform ${estadoDropdownOpen ? "rotate-180" : ""}`} aria-hidden="true">
                <path d="M5 7.5 10 12.5l5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {estadoDropdownOpen && (
              <div className="absolute top-full left-0 z-40 mt-1.5 w-48 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl" role="listbox">
                {[
                  { value: "" as "" | "activo" | "inactivo", label: "Todos los estados" },
                  { value: "activo" as "" | "activo" | "inactivo", label: "Activas" },
                  { value: "inactivo" as "" | "activo" | "inactivo", label: "Inactivas" },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => {
                      setEstadoFiltro(option.value);
                      setEstadoDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                      estadoFiltro === option.value
                        ? "bg-blue-50 dark:bg-blue-900/35 text-blue-700 dark:text-blue-200 font-semibold"
                        : "text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800"
                    }`}
                    role="option"
                    aria-selected={estadoFiltro === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tree controls */}
          {!term && rootCategories.length > 0 && (
            <>
              <button type="button" onClick={expandAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600 transition-all">
                <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
                Expandir
              </button>
              <button type="button" onClick={collapseAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600 transition-all">
                <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" /></svg>
                Colapsar
              </button>
            </>
          )}

          {/* Clear all */}
          <button type="button" onClick={clearAllFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>
            Reiniciar
          </button>
        </div>
      </div>

      {canManageCatalogo && (
        <div className="mb-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/75 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setSelectionMode((prev) => { const next = !prev; if (!next) setSelectedIds(new Set()); return next; }); }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selectionMode ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800"}`}
            >

              Seleccionar
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectionMode && <span className="text-xs text-gray-600 dark:text-slate-300">{selectedIds.size} seleccionado{selectedIds.size === 1 ? "" : "s"}</span>}
            <button
              type="button"
              onClick={() => { if (selectedIds.size !== 1) return; const cat = categoriasPorId.get(Array.from(selectedIds)[0]); if (cat) onEditar(cat, { returnPage: 1, returnState: buildRestoreState() }); }}
              disabled={!selectionMode || selectedIds.size !== 1}
              className="inline-flex items-center gap-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-medium"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => { if (!selectedActivas.length) return; setConfirmModal({ kind: "desactivar", total: selectedActivas.length }); }}
              disabled={!selectionMode || selectedActivas.length === 0 || selectedIds.size === 0}
              className="inline-flex items-center gap-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-medium"
            >
              Desactivar
            </button>
            <button
              type="button"
              onClick={() => { if (!selectedInactivas.length) return; setConfirmModal({ kind: "reactivar", total: selectedInactivas.length }); }}
              disabled={!selectionMode || selectedInactivas.length === 0 || selectedIds.size === 0}
              className="inline-flex items-center gap-1 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-medium"
            >
              Reactivar
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => { if (!selectedInactivas.length) return; setConfirmModal({ kind: "eliminar_definitivo", total: selectedInactivas.length }); }}
                disabled={!selectionMode || selectedInactivas.length === 0 || selectedIds.size === 0}
                className="inline-flex items-center gap-1 bg-black hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-medium"
              >
                Eliminar definitivo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tree view / Search results */}
      {term ? (
        searchResults.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900/75 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <p className="text-gray-500 dark:text-slate-300 text-lg">No se encontraron categorias que coincidan con la busqueda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              {searchResults.length} resultado{searchResults.length === 1 ? "" : "s"} para "{searchTerm.trim()}"
            </p>
            {searchResults.map((cat) => renderSearchResult(cat))}
          </div>
        )
      ) : rootCategories.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900/75 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-gray-500 dark:text-slate-300 text-lg">Todavia no hay categorias cargadas.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {rootCategories.map((cat) => renderTreeNode(cat, 0))}
        </div>
      )}

      <CategoriaProductoModal popup={productoPopup} onClose={() => setProductoPopup(null)} />

      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" onClick={() => setConfirmModal(null)} className="absolute inset-0 bg-slate-950/50" aria-label="Cerrar confirmacion" />
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">
              {confirmModal.kind === "desactivar" && "Confirmar desactivacion"}
              {confirmModal.kind === "reactivar" && "Confirmar reactivacion"}
              {confirmModal.kind === "eliminar_definitivo" && "Confirmar eliminacion definitiva"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-5">
              {confirmModal.kind === "desactivar" && `Vas a desactivar ${confirmModal.total} categoria(s) seleccionada(s).`}
              {confirmModal.kind === "reactivar" && `Vas a reactivar ${confirmModal.total} categoria(s) seleccionada(s).`}
              {confirmModal.kind === "eliminar_definitivo" && `Vas a eliminar definitivamente ${confirmModal.total} categoria(s) inactiva(s). Verifica antes que no tengan hijas ni productos asociados.`}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700">Cancelar</button>
              <button type="button"
                onClick={() => { executeBulkAction(confirmModal.kind); setConfirmModal(null); }}
                className={`px-4 py-2 rounded-lg text-white ${confirmModal.kind === "eliminar_definitivo" ? "bg-black hover:bg-gray-900" : confirmModal.kind === "desactivar" ? "bg-red-600 hover:bg-red-700" : "bg-gray-800 hover:bg-gray-700"}`}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

