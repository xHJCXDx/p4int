import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useCategorias } from "../hooks/useCategoria";
import { usePermissions } from "../hooks/useRoles";
import { useCarrito } from "../hooks/useCarrito";
import { fetchProductosPage } from "../api/catalogoApi";
import { api } from "../api/http";
import type { Categoria } from "../models/Categoria";
import type { Producto } from "../models/Producto";
import { useToast } from "../context/ToastContext";

const FEATURED_LIMIT = 12;

function resolveImageUrl(apiOrigin: string, url?: string | null): string | undefined {
  if (!url) return undefined;
  return url.startsWith("/uploads/") ? `${apiOrigin}${url}` : url;
}

function ShoppingBagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
      <path
        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface SubcategoriaMenuProps {
  categorias: Categoria[];
  childrenMap: Map<number | null, Categoria[]>;
  onSelect: (id: number) => void;
}

// Renderiza recursivamente subcategorias; las que tienen hijas abren un flyout lateral al pasar el mouse.
function SubcategoriaMenu({ categorias, childrenMap, onSelect }: SubcategoriaMenuProps) {
  return (
    <ul className="py-1.5">
      {categorias.map((cat) => {
        const hijos = cat.id ? childrenMap.get(Number(cat.id)) ?? [] : [];
        const tieneHijos = hijos.length > 0;
        return (
          <li key={cat.id} className="relative group/sub">
            <button
              type="button"
              onClick={() => cat.id && onSelect(Number(cat.id))}
              className="w-full flex items-center justify-between gap-3 px-4 py-2 text-sm text-slate-600 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-left"
            >
              <span className="truncate">{cat.nombre}</span>
              {tieneHijos && <span className="text-slate-400 text-xs">›</span>}
            </button>
            {tieneHijos && (
              <div className="hidden group-hover/sub:block absolute top-0 left-full ml-0.5 w-56 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-30">
                <SubcategoriaMenu categorias={hijos} childrenMap={childrenMap} onSelect={onSelect} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

interface ProductCardProps {
  producto: Producto;
  apiOrigin: string;
  onOpen: () => void;
  onAdd?: () => void;
}

function ProductCard({ producto, apiOrigin, onOpen, onAdd }: ProductCardProps) {
  const img = resolveImageUrl(apiOrigin, producto.imagenes_url?.[0]);
  const categoria = producto.categorias?.[0]?.nombre;
  const sinStock = Number(producto.stock_cantidad ?? 0) <= 0;

  return (
    <article
      onClick={onOpen}
      className="group cursor-pointer rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden flex flex-col"
    >
      <div className="aspect-square bg-slate-50 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
        {img ? (
          <img
            src={img}
            alt={producto.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <span className="text-xs text-slate-400">Sin imagen</span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-grow">
        {categoria && (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">
            {categoria}
          </span>
        )}
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-2 mb-2">{producto.nombre}</h3>
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">${producto.precio_base}</span>
          {onAdd && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              disabled={sinStock || producto.is_active === false}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
              aria-label={`Agregar ${producto.nombre} al carrito`}
              title={sinStock ? "Sin stock" : "Agregar al carrito"}
            >
              <span className="text-lg font-bold leading-none" aria-hidden="true">+</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { categorias } = useCategorias();
  const { isClient } = usePermissions();
  const { agregarProducto } = useCarrito();
  const { showToast } = useToast();

  const apiOrigin = useMemo(() => (api.defaults.baseURL || "").replace(/\/api\/v1\/?$/, ""), []);

  const categoriasActivas = useMemo(
    () => categorias.filter((c) => c.id && c.is_active !== false),
    [categorias],
  );

  const childrenMap = useMemo(() => {
    const map = new Map<number | null, Categoria[]>();
    for (const cat of categoriasActivas) {
      const key = cat.parent_id ?? null;
      const arr = map.get(key) ?? [];
      arr.push(cat);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return map;
  }, [categoriasActivas]);

  const categoriasPrincipales = useMemo(() => childrenMap.get(null) ?? [], [childrenMap]);

  const { data: productosData } = useQuery({
    queryKey: ["catalogo", "productos", "home-featured"],
    queryFn: () => fetchProductosPage({ offset: 0, limit: FEATURED_LIMIT, is_active: true }),
  });
  const productos = productosData?.items ?? [];

  const irACategoria = (id: number) => {
    navigate("/productos", { state: { restoreState: { categoriaFiltroId: id } } });
  };

  const abrirProducto = (id?: number) => {
    if (!id) return;
    navigate(`/productos/${id}`, { state: { returnTo: "/productos" } });
  };

  const agregarAlCarrito = (producto: Producto) => {
    agregarProducto(producto, 1);
    showToast(`1 ${producto.nombre} agregado al carrito`);
  };

  return (
    <div className="space-y-12 animate-fade-in">
      {/* Categorias */}
      <section>
        <div className="flex items-end justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Comprar por categoria
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Explora nuestra seleccion de productos frescos y esenciales.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/productos")}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 dark:text-blue-400 hover:gap-2.5 transition-all whitespace-nowrap"
          >
            Ver todo
            <span aria-hidden="true">→</span>
          </button>
        </div>

        {categoriasPrincipales.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-700 p-6">
            No hay categorias disponibles por el momento.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categoriasPrincipales.map((cat) => {
              const hijos = cat.id ? childrenMap.get(Number(cat.id)) ?? [] : [];
              const imgCat = resolveImageUrl(apiOrigin, cat.imagen_url);
              return (
                <div key={cat.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => cat.id && irACategoria(Number(cat.id))}
                    className="w-full flex flex-row items-center gap-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all text-left"
                  >
                    <span className="shrink-0 w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center overflow-hidden">
                      {imgCat ? (
                        <img src={imgCat} alt={cat.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBagIcon />
                      )}
                    </span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 line-clamp-2">
                      {cat.nombre}
                    </span>
                  </button>

                  {hijos.length > 0 && (
                    <div className="hidden group-hover:block absolute left-0 top-full pt-2 w-full min-w-[200px] z-20">
                      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
                        <SubcategoriaMenu categorias={hijos} childrenMap={childrenMap} onSelect={irACategoria} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Productos destacados */}
      <section>
        <div className="flex items-end justify-between gap-3 mb-5">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Productos destacados
          </h2>
          <button
            type="button"
            onClick={() => navigate("/productos")}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 dark:text-blue-400 hover:gap-2.5 transition-all whitespace-nowrap"
          >
            Ver todo
            <span aria-hidden="true">→</span>
          </button>
        </div>

        {productos.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-700 p-6">
            No hay productos para mostrar.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {productos.map((p) => (
              <ProductCard
                key={p.id}
                producto={p}
                apiOrigin={apiOrigin}
                onOpen={() => abrirProducto(p.id)}
                onAdd={isClient ? () => agregarAlCarrito(p) : undefined}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
