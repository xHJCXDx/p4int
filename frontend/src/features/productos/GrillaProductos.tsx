import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";

import { Producto } from "../../models/Producto";
import { fetchProductosPage } from "../../api/catalogoApi";
import { useProductos } from "../../hooks/useProducto";
import { useCategorias } from "../../hooks/useCategoria";
import { useIngredientes } from "../../hooks/useIngrediente";
import { useCarrito } from "../../hooks/useCarrito";
import { usePermissions } from "../../hooks/useRoles";
import { api } from "../../api/http";
import { SearchBar } from "../../components/SearchBar";
import { ProductoTable } from "./ProductoTable";
import { useToast } from "../../context/ToastContext";

interface GrillaProductosProps {
  onEditar: (
    producto: Producto,
    context?: {
      returnPage: number;
      returnState: {
        searchTerm: string;
        categoriaFiltroId: number | "";
        ingredientesFiltro: number[];
        estadoFiltro: EstadoFiltro;
        sortBy: SortBy;
        sortDir: SortDir;
      };
    },
  ) => void;
  action?: ReactNode;
}

type SortBy = "nombre" | "precio" | "stock" | "";
type SortDir = "asc" | "desc";
type EstadoFiltro = "" | "activo" | "inactivo";

type ConfirmModalState = {
  kind: "desactivar" | "reactivar" | "eliminar_definitivo";
  total: number;
};

const ITEMS_PER_PAGE = 15;

function ChevronIcon({ open = false }: { open?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={`h-4 w-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path d="M5 7.5 10 12.5l5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GrillaProductos({ onEditar, action }: GrillaProductosProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { eliminar, eliminarDefinitivo, cambiarEstado, productos: listaProductos } = useProductos();
  const { categorias: listaCategorias } = useCategorias();
  const { ingredientes: listaIngredientes } = useIngredientes();
  const { canManageCatalogo, isClient, isAdmin } = usePermissions();
  const { agregarProducto } = useCarrito();
  const { showToast } = useToast();
  const canFilterByEstado = !isClient;

  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFiltroId, setCategoriaFiltroId] = useState<number | "">("");
  const [categoriaDropdownOpen, setCategoriaDropdownOpen] = useState(false);
  const [categoriaSearch, setCategoriaSearch] = useState("");
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<number>>(new Set());
  const [ingredientesFiltro, setIngredientesFiltro] = useState<number[]>([]);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("");
  const [estadoDropdownOpen, setEstadoDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [ingredientesPopup, setIngredientesPopup] = useState<{ nombre: string; items: string[] } | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);

  const categoriaDropdownRef = useRef<HTMLDivElement | null>(null);
  const estadoDropdownRef = useRef<HTMLDivElement | null>(null);
  const apiOrigin = useMemo(() => (api.defaults.baseURL || "").replace(/\/api\/v1\/?$/, ""), []);

  const categoriasActivas = useMemo(
    () => listaCategorias.filter((cat) => cat.id && cat.is_active !== false),
    [listaCategorias],
  );

  const categoriasHijos = useMemo(() => {
    const map = new Map<number | null, typeof categoriasActivas>();
    for (const cat of categoriasActivas) {
      const key = cat.parent_id ?? null;
      const arr = map.get(key) || [];
      arr.push(cat);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return map;
  }, [categoriasActivas]);

  const categoriasPrincipales = useMemo(() => categoriasHijos.get(null) || [], [categoriasHijos]);

  const categoriaSeleccionadaLabel = useMemo(() => {
    if (!categoriaFiltroId) return "Todas las categorias";
    return categoriasActivas.find((c) => Number(c.id) === Number(categoriaFiltroId))?.nombre ?? "Todas las categorias";
  }, [categoriasActivas, categoriaFiltroId]);

  const estadoSeleccionadoLabel = useMemo(() => {
    if (estadoFiltro === "activo") return "Activos";
    if (estadoFiltro === "inactivo") return "Inactivos";
    return "Todos los estados";
  }, [estadoFiltro]);

  const categoriaPathMap = useMemo(() => {
    const map = new Map<number, string>();
    const getPath = (cat: (typeof categoriasActivas)[number]): string => {
      if (!cat.id) return cat.nombre;
      const cached = map.get(Number(cat.id));
      if (cached) return cached;
      if (!cat.parent_id) { map.set(Number(cat.id), cat.nombre); return cat.nombre; }
      const parent = categoriasActivas.find((c) => c.id === cat.parent_id);
      const parentPath = parent ? getPath(parent) : "";
      const path = parentPath ? `${parentPath} > ${cat.nombre}` : cat.nombre;
      map.set(Number(cat.id), path);
      return path;
    };
    for (const cat of categoriasActivas) getPath(cat);
    return map;
  }, [categoriasActivas]);

  const categoriasBusqueda = useMemo(() => {
    if (!categoriaSearch.trim()) return [];
    const term = categoriaSearch.trim().toLowerCase();
    return categoriasActivas
      .filter((cat) => cat.nombre.toLowerCase().includes(term))
      .map((cat) => ({ id: Number(cat.id), label: categoriaPathMap.get(Number(cat.id!)) ?? cat.nombre }));
  }, [categoriaSearch, categoriasActivas, categoriaPathMap]);

  const ingredientesDisponibles = useMemo(() => {
    return listaIngredientes
      .filter((ing) => ing.is_active !== false)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [listaIngredientes]);

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const categoriaId = categoriaFiltroId !== "" ? Number(categoriaFiltroId) : undefined;
  const isActiveParam = canFilterByEstado
    ? estadoFiltro === "activo" ? true : estadoFiltro === "inactivo" ? false : undefined
    : undefined;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["catalogo", "productos", "grid", currentPage, searchTerm, categoriaFiltroId, ingredientesFiltro.join(","), estadoFiltro, sortBy, sortDir],
    queryFn: () =>
      fetchProductosPage({
        offset, limit: ITEMS_PER_PAGE, search: searchTerm,
        categoria_id: categoriaId, subcategoria_id: undefined,
        ingrediente_ids: ingredientesFiltro, is_active: isActiveParam,
        sort_by: sortBy || undefined, sort_dir: sortDir,
        include_inactive: canManageCatalogo,
      }),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const productos = data?.items ?? [];
  const productosById = useMemo(
    () => new Map(listaProductos.filter((p) => p.id).map((p) => [Number(p.id), p])),
    [listaProductos],
  );
  const showing = Math.min(offset + productos.length, total);

  useEffect(() => {
    if (data && currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, data, totalPages]);

  useEffect(() => {
    const state = location.state as {
      restorePage?: number;
      highlightProductId?: number;
      restoreState?: {
        searchTerm?: string;
        categoriaFiltroId?: number | "";
        ingredientesFiltro?: number[];
        estadoFiltro?: EstadoFiltro;
        sortBy?: SortBy;
        sortDir?: SortDir;
      };
    } | null;
    if (!state) return;
    let consumed = false;

    if (state.restoreState) {
      const { searchTerm: ns, categoriaFiltroId: nc, ingredientesFiltro: ni, estadoFiltro: ne, sortBy: nsb, sortDir: nsd } = state.restoreState;
      if (typeof ns === "string") { setSearchTerm(ns); consumed = true; }
      if (nc === "" || (typeof nc === "number" && Number.isFinite(nc))) { setCategoriaFiltroId(nc); consumed = true; }
      if (Array.isArray(ni)) { setIngredientesFiltro(ni.filter((id) => Number.isFinite(id))); consumed = true; }
      if (canFilterByEstado && (ne === "" || ne === "activo" || ne === "inactivo")) { setEstadoFiltro(ne); consumed = true; }
      if (nsb === "" || nsb === "nombre" || nsb === "precio" || nsb === "stock") {
        setSortBy(isClient && nsb === "stock" ? "" : (nsb ?? ""));
        consumed = true;
      }
      if (nsd === "asc" || nsd === "desc") { setSortDir(nsd); consumed = true; }
    }
    if (typeof state.restorePage === "number" && Number.isFinite(state.restorePage) && state.restorePage > 0) {
      setCurrentPage(state.restorePage); consumed = true;
    }
    if (typeof state.highlightProductId === "number" && Number.isFinite(state.highlightProductId) && state.highlightProductId > 0) {
      setHighlightedProductId(state.highlightProductId); consumed = true;
    }
    if (consumed) navigate(location.pathname, { replace: true });
  }, [canFilterByEstado, isClient, location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!highlightedProductId) return;
    const id = window.setTimeout(() => setHighlightedProductId(null), 3000);
    return () => window.clearTimeout(id);
  }, [highlightedProductId]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => productosById.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [productosById]);

  useEffect(() => {
    if (!categoriaDropdownOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!categoriaDropdownRef.current?.contains(event.target as Node)) setCategoriaDropdownOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setCategoriaDropdownOpen(false); };
    window.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onEscape);
    return () => { window.removeEventListener("mousedown", onClickOutside); window.removeEventListener("keydown", onEscape); };
  }, [categoriaDropdownOpen]);

  useEffect(() => {
    if (!estadoDropdownOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!estadoDropdownRef.current?.contains(event.target as Node)) setEstadoDropdownOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setEstadoDropdownOpen(false); };
    window.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onEscape);
    };
  }, [estadoDropdownOpen]);

  useEffect(() => {
    if (!categoriaDropdownOpen && categoriaSearch) setCategoriaSearch("");
  }, [categoriaDropdownOpen, categoriaSearch]);

  const handleSortChange = (nextSortBy: SortBy, value: string) => {
    if (!value) { if (sortBy === nextSortBy) setSortBy(""); setCurrentPage(1); return; }
    setSortBy(nextSortBy); setSortDir(value as SortDir); setCurrentPage(1);
  };

  const toggleIngredienteFiltro = (id: number) => {
    setIngredientesFiltro((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    setCurrentPage(1);
  };

  const resolveImageUrl = (url: string) => {
    if (!url) return url;
    if (url.startsWith("/uploads/")) return `${apiOrigin}${url}`;
    return url;
  };

  const clearAllFilters = () => {
    setSearchTerm(""); setCategoriaFiltroId(""); setCategoriaDropdownOpen(false); setCategoriaSearch("");
    setIngredientesFiltro([]); setEstadoFiltro(""); setSortBy(""); setSortDir("asc"); setCurrentPage(1);
  };

  const openProductDetail = (id?: number) => {
    if (!id) return;
    navigate(`/productos/${id}`, { state: { returnTo: "/productos", returnPage: currentPage, returnState: buildRestoreState() } });
  };

  const openIngredientesPopup = (event: ReactMouseEvent, producto: Producto) => {
    event.stopPropagation();
    const restantes = (producto.ingredientes || []).slice(3).map((i) => i.nombre);
    if (!restantes.length) return;
    setIngredientesPopup({ nombre: producto.nombre, items: restantes });
  };

  const isHighlighted = (productoId?: number) =>
    Boolean(productoId && highlightedProductId && Number(productoId) === highlightedProductId);

  const buildRestoreState = () => ({ searchTerm, categoriaFiltroId, ingredientesFiltro, estadoFiltro, sortBy, sortDir });

  const handleAgregarAlCarrito = (producto: Producto, qty: number) => {
    agregarProducto(producto, qty);
    showToast(`${qty} ${producto.nombre} agregado al carrito`);
  };

  const selectedProductos = Array.from(selectedIds).map((id) => productosById.get(id)).filter((item): item is Producto => Boolean(item));
  const selectedActivos = selectedProductos.filter((p) => p.is_active);
  const selectedInactivos = selectedProductos.filter((p) => !p.is_active);
  const selectedEditables = selectedProductos.filter((p) => p.is_active);

  const executeBulkAction = (kind: ConfirmModalState["kind"]) => {
    if (kind === "desactivar") { for (const p of selectedActivos) { if (p.id) eliminar(p.id); } }
    else if (kind === "reactivar") { for (const p of selectedInactivos) { if (p.id) cambiarEstado(p.id, true); } }
    else { for (const p of selectedInactivos) { if (p.id) eliminarDefinitivo(p.id); } }
    setSelectedIds(new Set());
  };

  return (
    <div className="mt-2">
      <div className="flex justify-between items-start mb-6 gap-3 flex-wrap">
        <h2 className="text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tight">Catalogo de Productos</h2>
        {action && <div className="pt-2">{action}</div>}
      </div>

      {/* Search & Filters Panel */}
      <div className="mb-5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-4 space-y-3">
        <SearchBar value={searchTerm} onChange={(term) => { setSearchTerm(term); setCurrentPage(1); }} placeholder="Buscar producto por nombre..." />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mr-1">Filtros</span>

          {/* Categoria dropdown */}
          <div ref={categoriaDropdownRef} className="relative">
            <button type="button" onClick={() => setCategoriaDropdownOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-all ${categoriaDropdownOpen ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200" : categoriaFiltroId ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-200" : "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600"}`}
              aria-haspopup="listbox" aria-expanded={categoriaDropdownOpen}>
              <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" /></svg>
              <span>{categoriaSeleccionadaLabel}</span>
              <ChevronIcon open={categoriaDropdownOpen} />
            </button>

            {categoriaDropdownOpen && (
              <div className="absolute top-full left-0 z-40 mt-1.5 w-72 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
                <div className="p-2 border-b border-gray-100 dark:border-slate-700">
                  <div className="relative">
                    <input type="text" value={categoriaSearch} onChange={(e) => setCategoriaSearch(e.target.value)}
                      placeholder="Buscar categoria..." className="w-full border border-gray-200 dark:border-slate-700 rounded-lg p-2 pl-8 text-sm bg-white dark:bg-slate-950/80 text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500" />
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    {categoriaSearch && (
                      <button type="button" onClick={() => setCategoriaSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
                        aria-label="Limpiar busqueda de categorias">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto py-1" role="listbox">
                  <button type="button" onClick={() => { setCategoriaFiltroId(""); setCategoriaDropdownOpen(false); setCurrentPage(1); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">
                    Todas las categorias
                  </button>
                  {categoriaSearch.trim() ? (
                    categoriasBusqueda.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-400 dark:text-slate-500">No hay categorias que coincidan.</p>
                    ) : (
                      categoriasBusqueda.map(({ id, label }) => (
                        <button key={id} type="button"
                          onClick={() => { setCategoriaFiltroId(id); setCategoriaDropdownOpen(false); setCurrentPage(1); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 ${Number(categoriaFiltroId) === id ? "bg-blue-50 dark:bg-blue-900/35 text-blue-700 dark:text-blue-200 font-medium" : "text-gray-700 dark:text-slate-200"}`}>
                          {label}
                        </button>
                      ))
                    )
                  ) : categoriasPrincipales.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-400 dark:text-slate-500">No hay categorias.</p>
                  ) : (
                    (() => {
                      const renderNodo = (cats: typeof categoriasPrincipales, depth: number): ReactNode =>
                        cats.map((cat) => {
                          if (!cat.id) return null;
                          const hijos = categoriasHijos.get(Number(cat.id)) || [];
                          const tieneHijos = hijos.length > 0;
                          const isExpanded = expandedCategoryIds.has(Number(cat.id));
                          const isSelected = Number(categoriaFiltroId) === Number(cat.id);
                          return (
                            <div key={cat.id}>
                              <div
                                style={{ paddingLeft: `${12 + depth * 16}px` }}
                                onClick={() => {
                                  if (!tieneHijos) return;
                                  setExpandedCategoryIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(Number(cat.id))) next.delete(Number(cat.id));
                                    else next.add(Number(cat.id));
                                    return next;
                                  });
                                }}
                                className={`flex items-center gap-1 pr-3 py-1.5 text-sm rounded-md ${tieneHijos ? "cursor-pointer" : ""} ${isSelected ? "bg-blue-50 dark:bg-blue-900/35 text-blue-700 dark:text-blue-200 font-medium" : "text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800"}`}>
                                {tieneHijos ? (
                                  <button type="button"
                                    onClick={(e) => { e.stopPropagation(); setExpandedCategoryIds((prev) => { const next = new Set(prev); if (next.has(Number(cat.id))) next.delete(Number(cat.id)); else next.add(Number(cat.id)); return next; }); }}
                                    className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 flex-shrink-0"
                                    aria-label={isExpanded ? "Contraer" : "Expandir"}>
                                    <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                                  </button>
                                ) : <span className="w-5 flex-shrink-0" />}
                                <button type="button" className="inline-flex max-w-full min-w-0 text-left hover:underline"
                                  onClick={(e) => { e.stopPropagation(); setCategoriaFiltroId(Number(cat.id)); setCategoriaDropdownOpen(false); setCurrentPage(1); }}>
                                  <span className="truncate">{cat.nombre}</span>
                                </button>
                              </div>
                              {tieneHijos && isExpanded && renderNodo(hijos, depth + 1)}
                            </div>
                          );
                        });
                      return renderNodo(categoriasPrincipales, 0);
                    })()
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Ingredientes multi-select */}
          <details className="relative group">
            <summary className={`list-none cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-all ${ingredientesFiltro.length > 0 ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-200" : "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600"} group-open:border-blue-500 group-open:ring-2 group-open:ring-blue-500/20`}>
              <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" /></svg>
              <span>{ingredientesFiltro.length > 0 ? `${ingredientesFiltro.length} ingrediente(s)` : "Ingredientes"}</span>
              <ChevronIcon />
            </summary>
            <div className="absolute z-40 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl p-3 max-h-64 overflow-y-auto">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Ingredientes</span>
                {ingredientesFiltro.length > 0 && (
                  <button type="button" onClick={() => { setIngredientesFiltro([]); setCurrentPage(1); }} className="text-[11px] text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 font-medium">Limpiar</button>
                )}
              </div>
              {ingredientesDisponibles.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500">Sin ingredientes disponibles.</p>
              ) : (
                <div className="space-y-1">
                  {ingredientesDisponibles.map((ingrediente) => (
                    <label key={ingrediente.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200 py-1 px-1 rounded hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer">
                      <input type="checkbox" checked={ingredientesFiltro.includes(Number(ingrediente.id))}
                        onChange={() => ingrediente.id && toggleIngredienteFiltro(Number(ingrediente.id))} className="rounded text-blue-600 border-gray-300 dark:border-slate-600" />
                      {ingrediente.nombre}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </details>

          {/* Estado dropdown */}
          {!isClient && (
            <div ref={estadoDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setEstadoDropdownOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-all ${estadoDropdownOpen ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200" : estadoFiltro ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-200" : "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600"}`}
                aria-haspopup="listbox"
                aria-expanded={estadoDropdownOpen}
              >
                <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                <span>{estadoSeleccionadoLabel}</span>
                <ChevronIcon open={estadoDropdownOpen} />
              </button>
              {estadoDropdownOpen && (
                <div className="absolute top-full left-0 z-40 mt-1.5 w-48 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl" role="listbox">
                  {[
                    { value: "" as EstadoFiltro, label: "Todos los estados" },
                    { value: "activo" as EstadoFiltro, label: "Activos" },
                    { value: "inactivo" as EstadoFiltro, label: "Inactivos" },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => {
                        setEstadoFiltro(option.value);
                        setEstadoDropdownOpen(false);
                        setCurrentPage(1);
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
          )}

          {/* Clear all */}
          <button type="button" onClick={clearAllFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>
            Limpiar
          </button>
        </div>
      </div>

      {canManageCatalogo && (
        <div className="mb-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/75 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={() => { setSelectionMode((prev) => { const next = !prev; if (!next) setSelectedIds(new Set()); return next; }); }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selectionMode ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800"}`}>

              Seleccionar
            </button>
          </div>
          <div className="flex items-center gap-2">
            {selectionMode && <span className="text-xs text-gray-600 dark:text-slate-300">{selectedIds.size} seleccionado{selectedIds.size === 1 ? "" : "s"}</span>}
            <button type="button"
              onClick={() => { if (selectedIds.size !== 1 || selectedEditables.length !== 1) return; onEditar(selectedEditables[0], { returnPage: currentPage, returnState: buildRestoreState() }); }}
              disabled={!selectionMode || selectedIds.size !== 1 || selectedEditables.length !== 1}
              className="inline-flex items-center gap-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-medium">
              Editar
            </button>
            <button type="button"
              onClick={() => { if (!selectedActivos.length) return; setConfirmModal({ kind: "desactivar", total: selectedActivos.length }); }}
              disabled={!selectionMode || selectedActivos.length === 0 || selectedIds.size === 0}
              className="inline-flex items-center gap-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-medium">
              Desactivar
            </button>
            <button type="button"
              onClick={() => { if (!selectedInactivos.length) return; setConfirmModal({ kind: "reactivar", total: selectedInactivos.length }); }}
              disabled={!selectionMode || selectedInactivos.length === 0 || selectedIds.size === 0}
              className="inline-flex items-center gap-1 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-medium">
              Reactivar
            </button>
            {isAdmin && (
              <button type="button"
                onClick={() => { if (!selectedInactivos.length) return; setConfirmModal({ kind: "eliminar_definitivo", total: selectedInactivos.length }); }}
                disabled={!selectionMode || selectedInactivos.length === 0 || selectedIds.size === 0}
                className="inline-flex items-center gap-1 bg-black hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-medium">
                Eliminar definitivo
              </button>
            )}
          </div>
        </div>
      )}

      <ProductoTable
        productos={productos}
        isLoading={isLoading}
        isError={isError}
        isClient={isClient}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onSelectId={(id, checked) => setSelectedIds((prev) => { const next = new Set(prev); if (checked) next.add(id); else next.delete(id); return next; })}
        onAgregarAlCarrito={handleAgregarAlCarrito}
        onOpenDetail={openProductDetail}
        onOpenIngredientesPopup={openIngredientesPopup}
        isHighlighted={isHighlighted}
        resolveImageUrl={resolveImageUrl}
        sortBy={sortBy}
        sortDir={sortDir}
        onSortChange={handleSortChange}
        showing={showing}
        total={total}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {ingredientesPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" onClick={() => setIngredientesPopup(null)}
            className="absolute inset-0 bg-black/40" aria-label="Cerrar modal de ingredientes" />
          <div className="relative w-full max-w-md rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Ingredientes restantes de {ingredientesPopup.nombre}</h3>
              <button type="button" onClick={() => setIngredientesPopup(null)}
                className="h-8 w-8 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700"
                aria-label="Cerrar">x</button>
            </div>
            <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {ingredientesPopup.items.map((item) => (
                <li key={item} className="text-sm text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 rounded-md px-3 py-2 bg-gray-50 dark:bg-slate-950/60">{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" onClick={() => setConfirmModal(null)} className="absolute inset-0 bg-black/40" aria-label="Cerrar confirmacion" />
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">
              {confirmModal.kind === "desactivar" && "Confirmar desactivacion"}
              {confirmModal.kind === "reactivar" && "Confirmar reactivacion"}
              {confirmModal.kind === "eliminar_definitivo" && "Confirmar eliminacion definitiva"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-5">
              {confirmModal.kind === "desactivar" && `Vas a desactivar ${confirmModal.total} producto(s) seleccionado(s).`}
              {confirmModal.kind === "reactivar" && `Vas a reactivar ${confirmModal.total} producto(s) seleccionado(s).`}
              {confirmModal.kind === "eliminar_definitivo" && `Vas a eliminar definitivamente ${confirmModal.total} producto(s) inactivo(s). Esta accion no se puede deshacer.`}
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
