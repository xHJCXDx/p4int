import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';

import type { PedidoCreatePayload } from '../models/Pedido';
import { createPedido, crearPreferenciaMP } from '../api/pedidosApi';
import { useCarrito } from '../hooks/useCarrito';
import { useProductos } from '../hooks/useProducto';
import { api, getApiErrorMessage } from '../api/http';

const FORMAS_PAGO: PedidoCreatePayload['forma_pago_codigo'][] = [
  'EFECTIVO',
  'TARJETA',
  'MERCADOPAGO',
];

const LABEL_FORMA_PAGO: Record<PedidoCreatePayload['forma_pago_codigo'], string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  MERCADOPAGO: 'Transferencia (Mercado Pago)',
};

const BEBIDA_KEYWORDS = [
  'bebida', 'bebidas', 'agua', 'aguas', 'gaseosa', 'gaseosas', 'jugo', 'jugos',
  'cerveza', 'cervezas', 'vino', 'vinos', 'refresco', 'refrescos', 'soda', 'cola',
];

function normalizarTexto(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '');
}

function isBebida(producto: { nombre: string; categorias?: { nombre: string }[] }): boolean {
  const textos = [producto.nombre, ...(producto.categorias || []).map((c) => c.nombre)];
  return textos.some((texto) => {
    const normalized = normalizarTexto(texto);
    return BEBIDA_KEYWORDS.some((keyword) => normalized.includes(keyword));
  });
}

function currency(value: number): string {
  return value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CarritoPage() {
  const {
    items,
    subtotal,
    totalItems,
    incrementarItem,
    decrementarItem,
    quitarItem,
    actualizarPersonalizacion,
    vaciarCarrito,
  } = useCarrito();
  const queryClient = useQueryClient();
  const { productos } = useProductos();

  const apiOrigin = useMemo(() => (api.defaults.baseURL || '').replace(/\/api\/v1\/?$/, ''), []);

  const [formaPago, setFormaPago] = useState<PedidoCreatePayload['forma_pago_codigo']>('EFECTIVO');
  const [notas, setNotas] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState(false);
  const [customizationOpen, setCustomizationOpen] = useState<Record<number, boolean>>({});
  const [isRedirecting, setIsRedirecting] = useState(false);

  const productosById = useMemo(
    () => new Map(productos.filter((p) => p.id).map((p) => [Number(p.id), p])),
    [productos],
  );

  const resolveImg = (url?: string | null) =>
    url ? (url.startsWith('/uploads/') ? `${apiOrigin}${url}` : url) : undefined;

  const ingredientesPersonalizablesByItem = useMemo(() => {
    const map = new Map<number, { id: number; nombre: string }[]>();
    for (const item of items) {
      const producto = productosById.get(item.producto_id);
      if (!producto) {
        map.set(item.producto_id, item.ingredientes_removibles);
        continue;
      }
      if (isBebida(producto)) {
        map.set(item.producto_id, []);
        continue;
      }
      const disponibles = (producto.ingredientes || [])
        .filter((ing) => ing.id && ing.nombre)
        .map((ing) => ({ id: Number(ing.id), nombre: ing.nombre }));
      map.set(item.producto_id, disponibles);
    }
    return map;
  }, [items, productosById]);

  const payload = useMemo<PedidoCreatePayload>(
    () => ({
      forma_pago_codigo: formaPago,
      notas: notas.trim() || null,
      items: items.map((item) => {
        const producto = productosById.get(item.producto_id);
        const personalizables = ingredientesPersonalizablesByItem.get(item.producto_id) || [];
        const idsValidos = new Set(personalizables.map((ing) => ing.id));
        const personalizacion = producto && isBebida(producto)
          ? []
          : item.personalizacion.filter((id) => idsValidos.has(id));
        return { producto_id: item.producto_id, cantidad: item.cantidad, personalizacion };
      }),
    }),
    [formaPago, notas, items, productosById, ingredientesPersonalizablesByItem],
  );

  const handleMercadoPago = async (pedidoId: number) => {
    setIsRedirecting(true);
    try {
      const { init_point } = await crearPreferenciaMP(pedidoId);
      vaciarCarrito();
      window.location.href = init_point;
    } catch (error) {
      const detalle = getApiErrorMessage(error, '');
      setFeedback(
        `El pedido fue creado pero no se pudo iniciar el pago con MercadoPago${detalle ? ` (${detalle})` : ''}. Podés reintentar el pago desde "Mis pedidos".`,
      );
      setFeedbackError(true);
      setIsRedirecting(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: (body: PedidoCreatePayload) => createPedido(body),
    onSuccess: (pedido) => {
      if (formaPago === 'MERCADOPAGO') {
        handleMercadoPago(pedido.id);
      } else {
        vaciarCarrito();
        setNotas('');
        setFeedbackError(false);
        setFeedback(`Pedido #${pedido.id} creado correctamente. Estado inicial: ${pedido.estado_codigo}.`);
        queryClient.invalidateQueries({ queryKey: ['catalogo', 'productos'] });
        queryClient.invalidateQueries({ queryKey: ['catalogo', 'productos', 'grid'] });
      }
    },
    onError: (error) => {
      setFeedbackError(true);
      setFeedback(getApiErrorMessage(error, 'No se pudo crear el pedido'));
    },
  });

  const handleCheckout = () => {
    if (items.length === 0 || createMutation.isPending) return;
    setFeedback(null);
    setFeedbackError(false);
    createMutation.mutate(payload);
  };

  const toggleCustomization = (productoId: number) => {
    setCustomizationOpen((prev) => ({ ...prev, [productoId]: !prev[productoId] }));
  };

  const formatPersonalizacionResumen = (item: (typeof items)[number]) => {
    const personalizables = ingredientesPersonalizablesByItem.get(item.producto_id) || [];
    if (personalizables.length === 0) return 'Sin cambios';
    const idsValidos = new Set(personalizables.map((ing) => ing.id));
    const activa = item.personalizacion.filter((id) => idsValidos.has(id));
    if (activa.length === 0) return 'Sin cambios';
    const nombres = personalizables.filter((ing) => activa.includes(ing.id)).map((ing) => ing.nombre);
    if (nombres.length === 0) return 'Sin cambios';
    return `Sin: ${nombres.join(', ')}`;
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 mb-6">Tu carrito</h1>

      {feedback && (
        <div
          className={`mb-5 text-sm rounded-xl p-3 border ${
            feedbackError
              ? 'text-red-700 bg-red-50 border-red-200'
              : 'text-blue-700 bg-blue-50 border-blue-200'
          }`}
        >
          {feedback}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700">
          <p className="text-gray-500 dark:text-slate-300 text-lg mb-4">Tu carrito esta vacio.</p>
          <Link
            to="/productos"
            className="inline-flex bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-colors"
          >
            Ir a comprar
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Lista de items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const producto = productosById.get(item.producto_id);
              const img = resolveImg(producto?.imagenes_url?.[0]);
              const personalizables = ingredientesPersonalizablesByItem.get(item.producto_id) || [];
              const puedePersonalizar = personalizables.length > 0;
              const isOpen = Boolean(customizationOpen[item.producto_id]);
              return (
                <Fragment key={item.producto_id}>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 flex gap-4">
                    <div className="w-24 h-24 rounded-xl bg-slate-50 dark:bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {img ? (
                        <img src={img} alt={item.nombre} className="w-full h-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <span className="text-[11px] text-slate-400">Sin img</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{item.nombre}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{currency(item.precio_unitario)} / unidad</p>
                          {puedePersonalizar && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatPersonalizacionResumen(item)}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => quitarItem(item.producto_id)}
                          className="text-slate-400 hover:text-red-600 transition-colors flex-shrink-0"
                          aria-label={`Quitar ${item.nombre}`}
                          title="Quitar"
                        >
                          <TrashIcon />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
                        <div className="inline-flex items-center rounded-full border border-gray-300 dark:border-slate-600 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => decrementarItem(item.producto_id)}
                            className="px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                            aria-label="Disminuir"
                          >
                            −
                          </button>
                          <span className="px-4 py-1.5 font-semibold text-slate-900 dark:text-slate-100">{item.cantidad}</span>
                          <button
                            type="button"
                            onClick={() => incrementarItem(item.producto_id)}
                            disabled={item.cantidad >= item.stock_disponible}
                            className="px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label="Aumentar"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                          {currency(item.precio_unitario * item.cantidad)}
                        </span>
                      </div>

                      {puedePersonalizar && (
                        <button
                          type="button"
                          onClick={() => toggleCustomization(item.producto_id)}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-2"
                        >
                          {isOpen ? 'Ocultar personalizacion' : 'Personalizar ingredientes'}
                        </button>
                      )}
                    </div>
                  </div>

                  {puedePersonalizar && isOpen && (
                    <div className="bg-blue-50/60 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800/40 rounded-xl px-4 py-3 -mt-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300 mb-2">
                        Ingredientes removibles
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {personalizables.map((ingrediente) => (
                          <label
                            key={ingrediente.id}
                            className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5"
                          >
                            <input
                              type="checkbox"
                              checked={item.personalizacion.includes(ingrediente.id)}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...item.personalizacion, ingrediente.id]
                                  : item.personalizacion.filter((id) => id !== ingrediente.id);
                                actualizarPersonalizacion(item.producto_id, next);
                              }}
                              className="rounded border-gray-300 text-gray-800 focus:ring-gray-500"
                            />
                            Sin {ingrediente.nombre}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>

          {/* Resumen */}
          <div className="space-y-4 lg:sticky lg:top-20">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Resumen del pedido</h2>

              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Subtotal ({totalItems} item{totalItems === 1 ? '' : 's'})</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{currency(subtotal)}</span>
              </div>

              <div className="space-y-2 pt-1">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="forma-pago">
                  Forma de pago
                </label>
                <select
                  id="forma-pago"
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value as PedidoCreatePayload['forma_pago_codigo'])}
                  className="w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100"
                >
                  {FORMAS_PAGO.map((codigo) => (
                    <option key={codigo} value={codigo}>{LABEL_FORMA_PAGO[codigo]}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="notas-pedido">
                  Notas (opcional)
                </label>
                <textarea
                  id="notas-pedido"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100"
                  placeholder="Ej: tocar timbre, entregar en porteria..."
                />
              </div>

              <div className="border-t border-gray-100 dark:border-slate-700 pt-4 flex items-center justify-between">
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">Total</span>
                <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{currency(subtotal)}</span>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={createMutation.isPending || isRedirecting || items.length === 0}
                className="w-full inline-flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-3 rounded-full text-base font-semibold transition-colors"
              >
                {createMutation.isPending
                  ? 'Creando pedido...'
                  : isRedirecting
                    ? 'Redirigiendo a MercadoPago...'
                    : 'Realizar pedido'}
                {!createMutation.isPending && !isRedirecting && <span aria-hidden="true">→</span>}
              </button>
            </div>

            <Link
              to="/productos"
              className="block text-center text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Seguir comprando
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
