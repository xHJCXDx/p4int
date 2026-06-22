import type { MouseEvent as ReactMouseEvent } from "react";

import { Producto } from "../../models/Producto";
import { formatStockWithUnit } from "../../utils/stock";
import { Pagination } from "../../components/Pagination";

type SortBy = "nombre" | "precio" | "stock" | "";
type SortDir = "asc" | "desc";

interface ProductoTableProps {
  productos: Producto[];
  isLoading: boolean;
  isError: boolean;
  isClient: boolean;
  selectionMode: boolean;
  selectedIds: Set<number>;
  onSelectId: (id: number, checked: boolean) => void;
  onAgregarAlCarrito: (p: Producto, qty: number) => void;
  onOpenDetail: (id?: number) => void;
  onOpenIngredientesPopup: (event: ReactMouseEvent, p: Producto) => void;
  isHighlighted: (id?: number) => boolean;
  resolveImageUrl: (url: string) => string;
  sortBy: SortBy;
  sortDir: SortDir;
  onSortChange: (nextSortBy: SortBy, value: string) => void;
  showing: number;
  total: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function ProductoTable({
  productos,
  isLoading,
  isError,
  isClient,
  selectionMode,
  selectedIds,
  onSelectId,
  onAgregarAlCarrito,
  onOpenDetail,
  onOpenIngredientesPopup,
  isHighlighted,
  resolveImageUrl,
  sortBy,
  sortDir,
  onSortChange,
  showing,
  total,
  currentPage,
  totalPages,
  onPageChange,
}: ProductoTableProps) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Orden</span>
          <select
            value={sortBy === "nombre" ? sortDir : ""}
            onChange={(e) => onSortChange("nombre", e.target.value)}
            className="text-xs text-gray-700 dark:text-slate-200 border border-gray-300 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-900/80"
          >
            <option value="">Nombre</option>
            <option value="asc">A-Z</option>
            <option value="desc">Z-A</option>
          </select>
          <select
            value={sortBy === "precio" ? sortDir : ""}
            onChange={(e) => onSortChange("precio", e.target.value)}
            className="text-xs text-gray-700 dark:text-slate-200 border border-gray-300 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-900/80"
          >
            <option value="">Precio</option>
            <option value="asc">Menor</option>
            <option value="desc">Mayor</option>
          </select>
          {!isClient && (
            <select
              value={sortBy === "stock" ? sortDir : ""}
              onChange={(e) => onSortChange("stock", e.target.value)}
              className="text-xs text-gray-700 dark:text-slate-200 border border-gray-300 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-900/80"
            >
              <option value="">Stock</option>
              <option value="asc">Menor</option>
              <option value="desc">Mayor</option>
            </select>
          )}
        </div>
        {!isLoading && !isError && productos.length > 0 && (
          <div className="text-sm text-blue-700 dark:text-blue-100 bg-blue-50 dark:bg-blue-900/35 border border-blue-200 dark:border-blue-700/70 rounded-lg px-3 py-2">
            Mostrando {showing} de {total} resultados
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900/75 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-gray-500 dark:text-slate-300 text-lg">Cargando productos...</p>
        </div>
      ) : isError ? (
        <div className="text-red-500 dark:text-red-100 bg-red-50 dark:bg-red-900/35 p-4 rounded-lg border border-red-200 dark:border-red-700/70">
          No se pudo cargar el listado de productos.
        </div>
      ) : productos.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900/75 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-gray-500 dark:text-slate-300 text-lg">No se encontraron productos que coincidan con la busqueda.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {productos.map((p) => {
              const sinStock = Number(p.stock_cantidad ?? 0) <= 0;
              const canOpen = Boolean(p.id && (!sinStock || !isClient));
              const highlighted = isHighlighted(p.id);

              return (
                <article
                  key={p.id}
                  onClick={() => canOpen && onOpenDetail(p.id)}
                  className={`group relative rounded-2xl border overflow-hidden transition-all duration-200 flex flex-col ${
                    highlighted
                      ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20 ring-2 ring-amber-200 animate-pulse"
                      : sinStock && isClient
                        ? "bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-500 cursor-not-allowed"
                        : p.is_active
                          ? "bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-700 hover:shadow-lg hover:-translate-y-0.5"
                          : "bg-gray-100 dark:bg-slate-800/60 border-gray-300 dark:border-slate-600"
                  } ${canOpen ? "cursor-pointer" : ""}`}
                >
                  {/* Selection checkbox */}
                  {selectionMode && p.id && (
                    <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(Number(p.id))}
                        onChange={(e) => onSelectId(Number(p.id), e.target.checked)}
                        className="h-5 w-5 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-900 shadow-sm"
                        aria-label={`Seleccionar ${p.nombre}`}
                      />
                    </div>
                  )}

                  {/* Status badge (admin) */}
                  {!isClient && (
                    <div className="absolute top-3 right-3 z-10">
                      {p.is_active ? (
                        <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-blue-200 dark:border-blue-700/60 shadow-sm">Activo</span>
                      ) : (
                        <span className="bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-red-200 dark:border-red-700/60 shadow-sm">Inactivo</span>
                      )}
                    </div>
                  )}

                  {/* Image */}
                  <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-slate-800 overflow-hidden">
                    {p.imagenes_url?.[0] ? (
                      <img
                        src={resolveImageUrl(p.imagenes_url[0])}
                        alt={`Imagen de ${p.nombre}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-slate-500">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col flex-1 p-4 gap-2.5">
                    {/* Name + Price row */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 line-clamp-2 leading-snug">{p.nombre}</h3>
                      <span className="text-base font-bold text-blue-700 dark:text-blue-300 shrink-0">${p.precio_base}</span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed" title={p.descripcion || "Sin descripcion"}>
                      {p.descripcion || "Sin descripcion"}
                    </p>

                    {/* Categories */}
                    {p.categorias && p.categorias.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.categorias.map((c) => (
                          <span key={c.id} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 text-[11px] px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800/50">{c.nombre}</span>
                        ))}
                      </div>
                    )}

                    {/* Ingredients */}
                    {p.ingredientes && p.ingredientes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.ingredientes.slice(0, 3).map((i) => (
                          <span
                            key={i.id}
                            title={i.cantidad ? `Cantidad: ${formatStockWithUnit(i.cantidad, i.unidad_medida)}` : "Sin cantidad cargada"}
                            className={`text-[11px] px-2 py-0.5 rounded-md border cursor-help ${i.es_alergeno ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 border-red-100 dark:border-red-800/50" : "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200 border-green-100 dark:border-green-800/50"}`}
                          >
                            {i.nombre}{i.es_alergeno ? " (Alergeno)" : ""}
                          </span>
                        ))}
                        {p.ingredientes.length > 3 && (
                          <button type="button" onClick={(e) => onOpenIngredientesPopup(e, p)}
                            className="text-[11px] px-2 py-0.5 rounded-md border bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700">
                            +{p.ingredientes.length - 3}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Stock info (non-client) */}
                    {!isClient && (
                      <div className="mt-auto pt-1">
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                          Stock: {formatStockWithUnit(p.stock_cantidad, "unidad")}
                        </span>
                      </div>
                    )}

                    {/* Add to cart (client) */}
                    {isClient && (
                      <div className="mt-auto pt-1" onClick={(e) => e.stopPropagation()}>
                        <button type="button"
                          onClick={() => onAgregarAlCarrito(p, 1)}
                          disabled={!p.id || p.stock_cantidad <= 0 || !p.is_active}
                          className="w-full bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2 rounded-xl text-sm font-semibold transition-colors">
                          {p.is_active ? (p.stock_cantidad > 0 ? "Agregar al carrito" : "Sin stock") : "Inactivo"}
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
        </>
      )}
    </>
  );
}
