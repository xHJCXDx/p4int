import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";

import { Ingrediente } from "../../models/Ingrediente";
import { fetchIngredientesPage } from "../../api/catalogoApi";
import { useIngredientes } from "../../hooks/useIngrediente";
import { usePermissions } from "../../hooks/useRoles";
import { formatStockWithUnit } from "../../utils/stock";
import { Pagination } from "../../components/Pagination";
import { SearchBar } from "../../components/SearchBar";

interface GrillaIngredientesProps {
  onEditar: (
    ingrediente: Ingrediente,
    context?: {
      returnPage: number;
      returnState: {
        searchTerm: string;
        alergenoFiltro: "" | "si" | "no";
        unidadMedidaFiltro: string;
        estadoFiltro: "" | "activo" | "inactivo";
        sortNombre: "" | "asc" | "desc";
        sortStock: "" | "asc" | "desc";
      };
    },
  ) => void;
  action?: ReactNode;
}

const ITEMS_PER_PAGE = 15;

const UNIDAD_ORDER: Record<string, number> = {
  gr: 1,
  litros: 2,
  unidad: 3,
};

const formatUnidadLabel = (unidad: string) => {
  const normalized = unidad.trim().toLowerCase();
  if (["g", "gr", "kg", "gramo", "gramos"].includes(normalized)) return "gr/kg";
  if (["l", "lt", "lts", "litro", "litros", "ml"].includes(normalized)) return "ml/lts";
  if (["ud", "unidad", "unidades"].includes(normalized)) return "unidades";
  return unidad;
};

function FilterDropdown<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-all ${open ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200" : value ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-200" : "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected.label}</span>
        <svg viewBox="0 0 20 20" fill="none" className={`h-3.5 w-3.5 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">
          <path d="M5 7.5 10 12.5l5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 z-40 mt-1.5 w-48 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl" role="listbox">
          {options.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                value === option.value
                  ? "bg-blue-50 dark:bg-blue-900/35 text-blue-700 dark:text-blue-200 font-semibold"
                  : "text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
              role="option"
              aria-selected={value === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function GrillaIngredientes({ onEditar, action }: GrillaIngredientesProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { eliminar, eliminarDefinitivo, cambiarEstado, ingredientes: todosIngredientes } = useIngredientes();
  const { canManageCatalogo, isAdmin } = usePermissions();

  const [searchTerm, setSearchTerm] = useState("");
  const [alergenoFiltro, setAlergenoFiltro] = useState<"" | "si" | "no">("");
  const [unidadMedidaFiltro, setUnidadMedidaFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<"" | "activo" | "inactivo">("");
  const [sortNombre, setSortNombre] = useState<"" | "asc" | "desc">("");
  const [sortStock, setSortStock] = useState<"" | "asc" | "desc">("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [highlightedIngredienteId, setHighlightedIngredienteId] = useState<number | null>(null);

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const esAlergeno = alergenoFiltro === "" ? undefined : alergenoFiltro === "si";
  const isActiveParam = estadoFiltro === "activo" ? true : estadoFiltro === "inactivo" ? false : undefined;
  const sortBy = sortStock ? "stock" : sortNombre ? "nombre" : undefined;
  const sortDir = sortStock || sortNombre || undefined;

  const unidadesDisponibles = useMemo(() => {
    const uniques = new Set<string>();
    for (const ing of todosIngredientes) {
      const unidad = (ing.unidad_medida || "").trim().toLowerCase();
      if (unidad) uniques.add(unidad);
    }
    return Array.from(uniques).sort((a, b) => {
      const oa = UNIDAD_ORDER[a] ?? 999;
      const ob = UNIDAD_ORDER[b] ?? 999;
      if (oa !== ob) return oa - ob;
      return a.localeCompare(b, "es");
    });
  }, [todosIngredientes]);

  const ingredientesById = useMemo(
    () => new Map(todosIngredientes.filter((ing) => ing.id).map((ing) => [Number(ing.id), ing])),
    [todosIngredientes],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "catalogo",
      "ingredientes",
      "grid",
      currentPage,
      searchTerm,
      alergenoFiltro,
      unidadMedidaFiltro,
      estadoFiltro,
      sortNombre,
      sortStock,
    ],
    queryFn: () =>
      fetchIngredientesPage({
        offset,
        limit: ITEMS_PER_PAGE,
        name: searchTerm,
        es_alergeno: esAlergeno,
        unidad_medida: unidadMedidaFiltro || undefined,
        is_active: isActiveParam,
        sort_by: sortBy,
        sort_dir: sortDir as "asc" | "desc" | undefined,
        include_inactive: canManageCatalogo,
      }),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const items = data?.items ?? [];
  const showing = Math.min(offset + items.length, total);

  useEffect(() => {
    if (data && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, data, totalPages]);

  useEffect(() => {
    const state = location.state as {
      restorePage?: number;
      highlightIngredienteId?: number;
      restoreState?: {
        searchTerm?: string;
        alergenoFiltro?: "" | "si" | "no";
        unidadMedidaFiltro?: string;
        estadoFiltro?: "" | "activo" | "inactivo";
        sortNombre?: "" | "asc" | "desc";
        sortStock?: "" | "asc" | "desc";
      };
    } | null;
    if (!state) return;

    let consumed = false;

    if (state.restoreState) {
      const nextSearch = state.restoreState.searchTerm;
      const nextAlergenoFiltro = state.restoreState.alergenoFiltro;
      const nextUnidad = state.restoreState.unidadMedidaFiltro;
      const nextEstadoFiltro = state.restoreState.estadoFiltro;
      const nextSortNombre = state.restoreState.sortNombre;
      const nextSortStock = state.restoreState.sortStock;

      if (typeof nextSearch === "string") {
        setSearchTerm(nextSearch);
        consumed = true;
      }
      if (nextAlergenoFiltro === "" || nextAlergenoFiltro === "si" || nextAlergenoFiltro === "no") {
        setAlergenoFiltro(nextAlergenoFiltro);
        consumed = true;
      }
      if (typeof nextUnidad === "string") {
        setUnidadMedidaFiltro(nextUnidad);
        consumed = true;
      }
      if (nextEstadoFiltro === "" || nextEstadoFiltro === "activo" || nextEstadoFiltro === "inactivo") {
        setEstadoFiltro(nextEstadoFiltro);
        consumed = true;
      }
      if (nextSortNombre === "" || nextSortNombre === "asc" || nextSortNombre === "desc") {
        setSortNombre(nextSortNombre);
        consumed = true;
      }
      if (nextSortStock === "" || nextSortStock === "asc" || nextSortStock === "desc") {
        setSortStock(nextSortStock);
        consumed = true;
      }
    }

    if (typeof state.restorePage === "number" && Number.isFinite(state.restorePage) && state.restorePage > 0) {
      setCurrentPage(state.restorePage);
      consumed = true;
    }

    if (
      typeof state.highlightIngredienteId === "number" &&
      Number.isFinite(state.highlightIngredienteId) &&
      state.highlightIngredienteId > 0
    ) {
      setHighlightedIngredienteId(state.highlightIngredienteId);
      consumed = true;
    }

    if (consumed) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!highlightedIngredienteId) return;
    const timeoutId = window.setTimeout(() => setHighlightedIngredienteId(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [highlightedIngredienteId]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => ingredientesById.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [ingredientesById]);

  const clearAllFilters = () => {
    setSearchTerm("");
    setAlergenoFiltro("");
    setUnidadMedidaFiltro("");
    setEstadoFiltro("");
    setSortNombre("");
    setSortStock("");
    setCurrentPage(1);
  };

  const selectedIngredientes = Array.from(selectedIds)
    .map((id) => ingredientesById.get(id))
    .filter((item): item is Ingrediente => Boolean(item));
  const selectedActivos = selectedIngredientes.filter((ing) => ing.is_active);
  const selectedInactivos = selectedIngredientes.filter((ing) => !ing.is_active);
  const isHighlighted = (ingredienteId?: number) =>
    Boolean(ingredienteId && highlightedIngredienteId && Number(ingredienteId) === highlightedIngredienteId);

  const buildRestoreState = () => ({
    searchTerm,
    alergenoFiltro,
    unidadMedidaFiltro,
    estadoFiltro,
    sortNombre,
    sortStock,
  });

  return (
    <div className="mt-2">
      <div className="flex justify-between items-start mb-6 gap-3 flex-wrap">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Catalogo de Ingredientes</h2>
        {action && <div className="pt-2">{action}</div>}
      </div>

      {/* Search & Filters Panel */}
      <div className="mb-5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-4 space-y-3">
        <SearchBar
          value={searchTerm}
          onChange={(term) => { setSearchTerm(term); setCurrentPage(1); }}
          placeholder="Buscar ingrediente por nombre..."
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mr-1">Filtros</span>

          <FilterDropdown
            value={alergenoFiltro}
            options={[
              { value: "", label: "Alergenos: Todos" },
              { value: "si", label: "Alergenos: Solo si" },
              { value: "no", label: "Alergenos: Solo no" },
            ]}
            onChange={(value) => { setAlergenoFiltro(value); setCurrentPage(1); }}
          />

          <FilterDropdown
            value={unidadMedidaFiltro}
            options={[
              { value: "", label: "Unidad: Todas" },
              ...unidadesDisponibles.map((unidad) => ({
                value: unidad,
                label: formatUnidadLabel(unidad),
              })),
            ]}
            onChange={(value) => { setUnidadMedidaFiltro(value); setCurrentPage(1); }}
          />

          <FilterDropdown
            value={estadoFiltro}
            options={[
              { value: "", label: "Estado: Todos" },
              { value: "activo", label: "Activos" },
              { value: "inactivo", label: "Inactivos" },
            ]}
            onChange={(value) => { setEstadoFiltro(value); setCurrentPage(1); }}
          />

          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>
            Limpiar
          </button>
        </div>
      </div>

      {canManageCatalogo && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectionMode((prev) => {
                  const next = !prev;
                  if (!next) setSelectedIds(new Set());
                  return next;
                });
              }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                selectionMode
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >

              Seleccionar
            </button>
          </div>

          <div className="flex items-center gap-2">
            {selectionMode && (
              <span className="text-xs text-gray-600">
                {selectedIds.size} seleccionado{selectedIds.size === 1 ? "" : "s"}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                if (selectedIds.size !== 1) return;
                const onlyId = Array.from(selectedIds)[0];
                const ingrediente = ingredientesById.get(onlyId);
                if (ingrediente) {
                  onEditar(ingrediente, {
                    returnPage: currentPage,
                    returnState: buildRestoreState(),
                  });
                }
              }}
              disabled={!selectionMode || selectedIds.size !== 1}
              className="inline-flex items-center gap-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-medium"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedActivos.length) return;
                if (window.confirm(`Desactivar ${selectedActivos.length} ingrediente(s) seleccionado(s)?`)) {
                  for (const ing of selectedActivos) {
                    if (ing.id) eliminar(ing.id);
                  }
                  setSelectedIds(new Set());
                }
              }}
              disabled={!selectionMode || selectedActivos.length === 0 || selectedIds.size === 0}
              className="inline-flex items-center gap-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-medium"
            >
              Desactivar
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedInactivos.length) return;
                if (window.confirm(`Reactivar ${selectedInactivos.length} ingrediente(s) seleccionado(s)?`)) {
                  for (const ing of selectedInactivos) {
                    if (ing.id) cambiarEstado(ing.id, true);
                  }
                  setSelectedIds(new Set());
                }
              }}
              disabled={!selectionMode || selectedInactivos.length === 0 || selectedIds.size === 0}
              className="inline-flex items-center gap-1 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-medium"
            >
              Reactivar
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  if (!selectedInactivos.length) return;
                  const ok1 = window.confirm(
                    `Eliminar definitivamente ${selectedInactivos.length} ingrediente(s) inactivo(s)? Esta accion no se puede deshacer.`,
                  );
                  if (!ok1) return;
                  const ok2 = window.confirm(
                    "Confirmacion final: verificaste que no esten asociados a productos?",
                  );
                  if (!ok2) return;
                  for (const ing of selectedInactivos) {
                    if (ing.id) eliminarDefinitivo(ing.id);
                  }
                  setSelectedIds(new Set());
                }}
                disabled={!selectionMode || selectedInactivos.length === 0 || selectedIds.size === 0}
                className="inline-flex items-center gap-1 bg-black hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-medium"
              >
                Eliminar definitivo
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-lg">Cargando ingredientes...</p>
        </div>
      ) : isError ? (
        <div className="text-red-500 bg-red-50 p-4 rounded-lg border border-red-200">
          No se pudo cargar el listado de ingredientes.
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-lg">No se encontraron ingredientes que coincidan con la busqueda.</p>
        </div>
      ) : (
        <>
          <div className="flex justify-end mb-2">
            <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              Mostrando {showing} de {total} resultados
            </div>
          </div>

          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
            <table className="min-w-full divide-y divide-gray-200/70">
              <thead className="bg-gray-50 border-b border-gray-200/70">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left border-r border-gray-100/80">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</span>
                      <select
                        value={sortNombre}
                        onChange={(e) => {
                          setSortNombre(e.target.value as "" | "asc" | "desc");
                          if (e.target.value) setSortStock("");
                          setCurrentPage(1);
                        }}
                        className="text-[11px] text-gray-600 border border-gray-200 rounded px-1.5 py-0.5 bg-white"
                      >
                        <option value="">Orden</option>
                        <option value="asc">A-Z</option>
                        <option value="desc">Z-A</option>
                      </select>
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-100/80">
                    Descripcion
                  </th>
                  <th scope="col" className="px-6 py-3 text-left border-r border-gray-100/80">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</span>
                      <select
                        value={sortStock}
                        onChange={(e) => {
                          setSortStock(e.target.value as "" | "asc" | "desc");
                          if (e.target.value) setSortNombre("");
                          setCurrentPage(1);
                        }}
                        className="text-[11px] text-gray-600 border border-gray-200 rounded px-1.5 py-0.5 bg-white"
                      >
                        <option value="">Orden</option>
                        <option value="asc">Menor</option>
                        <option value="desc">Mayor</option>
                      </select>
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center border-r border-gray-100/80">
                    Es alergeno
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200/70">
                {items.map((i) => {
                  const isSelected = i.id ? selectedIds.has(Number(i.id)) : false;
                  return (
                    <tr
                      key={i.id}
                      className={`${
                        isHighlighted(i.id)
                          ? "bg-amber-100 animate-pulse"
                          : i.is_active
                            ? "hover:bg-gray-50"
                            : "bg-gray-300 text-gray-700"
                      } transition-colors`}
                    >
                      <td className="px-6 py-4 border-r border-gray-100/80">
                        <div className="flex items-center gap-2">
                          {selectionMode && i.id && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  if (checked) next.add(Number(i.id));
                                  else next.delete(Number(i.id));
                                  return next;
                                });
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              aria-label={`Seleccionar ${i.nombre}`}
                            />
                          )}
                          <div className="text-sm font-medium text-gray-900">{i.nombre}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100/80">
                        <div className="text-sm text-gray-500 line-clamp-2">{i.descripcion || "Sin descripcion"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-r border-gray-100/80">
                        {formatStockWithUnit(i.stock_cantidad, i.unidad_medida)}
                      </td>
                      <td className="px-6 py-4 text-center border-r border-gray-100/80">
                        {i.es_alergeno ? (
                          <span className="bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide border border-red-200">
                            Si
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide border border-gray-200">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {i.is_active ? (
                          <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-xs font-semibold border border-blue-200">
                            Activo
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-800 px-2.5 py-1 rounded-full text-xs font-semibold border border-red-200">
                            Inactivo
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}
    </div>
  );
}
