import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Producto } from "../models/Producto";
import { useProductos } from "../hooks/useProducto";
import { usePermissions } from "../hooks/useRoles";
import { useCarrito } from "../hooks/useCarrito";
import { api } from "../api/http";
import { useToast } from "../context/ToastContext";

export function ProductoDetallePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { canManageCatalogo, isClient } = usePermissions();
  const { productos, eliminar, cambiarEstado } = useProductos();
  const { agregarProducto } = useCarrito();
  const { showToast } = useToast();
  const [confirmDesactivarOpen, setConfirmDesactivarOpen] = useState(false);
  const [cantidad, setCantidad] = useState(1);

  const productoId = id ? Number(id) : null;
  const productoEnMemoria =
    productoId && Number.isFinite(productoId) ? productos.find((p) => p.id === productoId) ?? null : null;

  const { data: productoDesdeApi, isLoading } = useQuery({
    queryKey: ["catalogo", "productos", "detalle", productoId],
    queryFn: async () => {
      const { data } = await api.get(`/productos/${productoId}`);
      return new Producto(data);
    },
    enabled: Boolean(productoId && !productoEnMemoria),
  });

  const producto = productoEnMemoria ?? productoDesdeApi ?? null;
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  const returnPage = (location.state as { returnPage?: number } | null)?.returnPage;
  const returnState = (location.state as {
    returnState?: {
      searchTerm?: string;
      categoriaFiltroId?: number | "";
      ingredientesFiltro?: number[];
      estadoFiltro?: "" | "activo" | "inactivo";
      sortBy?: "nombre" | "precio" | "stock" | "";
      sortDir?: "asc" | "desc";
    };
  } | null)?.returnState;
  const volverAlCatalogoState = returnTo ? { restorePage: returnPage, restoreState: returnState } : undefined;
  const volverDestino = returnTo || "/productos";

  const apiOrigin = useMemo(() => (api.defaults.baseURL || "").replace(/\/api\/v1\/?$/, ""), []);
  const mainImage = producto?.imagenes_url?.[0];
  const mainImageResolved = mainImage?.startsWith("/uploads/") ? `${apiOrigin}${mainImage}` : mainImage;

  const sinStock = (producto?.stock_cantidad ?? 0) <= 0;
  const maxCantidad = Math.max(1, producto?.stock_cantidad ?? 1);

  useEffect(() => {
    setCantidad((prev) => Math.min(Math.max(1, prev), maxCantidad));
  }, [maxCantidad]);

  const handleEliminar = async () => {
    if (!producto?.id) return;
    await eliminar(producto.id);
    navigate(volverDestino, { state: volverAlCatalogoState });
  };

  const handleReactivar = async () => {
    if (!producto?.id) return;
    await cambiarEstado(producto.id, true);
    navigate(0);
  };

  const handleAgregarAlCarrito = () => {
    if (!producto || sinStock || !producto.is_active) return;
    agregarProducto(producto, cantidad);
    showToast(`${cantidad} ${producto.nombre} agregado al carrito`);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <p className="text-gray-600 dark:text-slate-300">Cargando producto...</p>
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 space-y-4">
        <p className="text-gray-700 dark:text-slate-200">No se encontro el producto.</p>
        <Link
          to={volverDestino}
          state={volverAlCatalogoState}
          className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Volver al catalogo
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Imagen principal con flecha para volver */}
          <div className="relative bg-slate-50 dark:bg-slate-800 p-6 md:p-10 flex items-center justify-center min-h-80">
            <Link
              to={volverDestino}
              state={volverAlCatalogoState}
              className="absolute top-4 left-4 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-200 shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-colors"
              aria-label="Volver al catalogo"
              title="Volver al catalogo"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            {mainImageResolved ? (
              <img
                src={mainImageResolved}
                alt={`Imagen de ${producto.nombre}`}
                className="max-h-[26rem] w-auto object-contain rounded-xl"
              />
            ) : (
              <div className="text-sm text-gray-500 dark:text-slate-400">Sin imagen</div>
            )}
          </div>

          {/* Informacion */}
          <div className="p-6 md:p-10 flex flex-col gap-5">
            {producto.categorias && producto.categorias.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                {producto.categorias.map((cat, idx) => (
                  <span key={cat.id} className="inline-flex items-center gap-1.5">
                    {idx > 0 && <span className="text-slate-300">/</span>}
                    {cat.nombre}
                  </span>
                ))}
              </div>
            )}

            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 leading-tight">
              {producto.nombre}
            </h1>

            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              ${producto.precio_base}
            </div>

            {!producto.is_active && (
              <span className="inline-flex w-fit text-sm font-semibold px-3 py-1 rounded-full border bg-red-100 text-red-800 border-red-200">
                Producto inactivo
              </span>
            )}

            {isClient && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Cantidad</span>
                  <div className="inline-flex items-center rounded-full border border-gray-300 dark:border-slate-600 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setCantidad((q) => Math.max(1, q - 1))}
                      disabled={cantidad <= 1}
                      className="px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40"
                      aria-label="Disminuir cantidad"
                    >
                      −
                    </button>
                    <span className="px-5 py-2 font-bold text-slate-900 dark:text-slate-100 min-w-[3rem] text-center">{cantidad}</span>
                    <button
                      type="button"
                      onClick={() => setCantidad((q) => Math.min(maxCantidad, q + 1))}
                      disabled={cantidad >= maxCantidad}
                      className="px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40"
                      aria-label="Aumentar cantidad"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAgregarAlCarrito}
                  disabled={sinStock || !producto.is_active}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-800 px-8 py-3 text-base font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors w-full sm:w-auto"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
                    <path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.47 1.18h7.86a1.5 1.5 0 0 0 1.47-1.18L20.5 8H6.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="9.5" cy="20" r="1.4" fill="currentColor" />
                    <circle cx="17" cy="20" r="1.4" fill="currentColor" />
                  </svg>
                  {sinStock ? "Sin stock" : !producto.is_active ? "No disponible" : "Agregar al carrito"}
                </button>
              </div>
            )}

            {canManageCatalogo && (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/productos/${producto.id}/editar`, {
                      state: { returnTo: volverDestino, returnPage, returnState },
                    })
                  }
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Editar
                </button>
                {producto.is_active ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDesactivarOpen(true)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Eliminar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleReactivar()}
                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Reactivar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Descripcion */}
        <div className="border-t border-gray-100 dark:border-slate-700 p-6 md:p-10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Descripcion del producto</h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {producto.descripcion || "Sin descripcion."}
          </p>

          {/* Ingredientes visibles solo para el personal */}
          {!isClient && producto.ingredientes && producto.ingredientes.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm uppercase tracking-wide text-gray-500 dark:text-slate-400 font-semibold mb-2">Ingredientes</h3>
              <div className="flex flex-wrap gap-2">
                {producto.ingredientes.map((ing) => (
                  <span
                    key={ing.id}
                    className={`text-xs px-2.5 py-1 rounded-md border ${
                      ing.es_alergeno
                        ? "bg-red-50 text-red-700 border-red-100"
                        : "bg-green-50 text-green-700 border-green-100"
                    }`}
                  >
                    {ing.nombre}{ing.es_alergeno ? " (Alergeno)" : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmDesactivarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setConfirmDesactivarOpen(false)}
            className="absolute inset-0 bg-black/40"
            aria-label="Cerrar confirmacion"
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">Confirmar desactivacion</h3>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-5">
              Vas a desactivar este producto. Lo vas a poder reactivar cuando quieras.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDesactivarOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleEliminar();
                  setConfirmDesactivarOpen(false);
                }}
                className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
