/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useMemo, useState } from 'react';

import type { CarritoContextType, CarritoIngredienteRemovible, CarritoItem, CarritoState } from '../models/Carrito';
import type { Producto } from '../models/Producto';
import { useAuth } from '../hooks/useAuth';

const STORAGE_PREFIX = 'carrito_v1_user_';

export const CarritoContext = createContext<CarritoContextType | undefined>(undefined);

function getStorageKey(userId: number): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function extraerRemovibles(producto: Producto): CarritoIngredienteRemovible[] {
  const removibles = (producto.ingredientes || [])
    .filter((ing) => ing.id && ing.es_removible)
    .map((ing) => ({ id: Number(ing.id), nombre: ing.nombre }));

  const unicos = new Map<number, string>();
  for (const ingrediente of removibles) {
    if (!unicos.has(ingrediente.id)) {
      unicos.set(ingrediente.id, ingrediente.nombre);
    }
  }

  return Array.from(unicos.entries()).map(([id, nombre]) => ({ id, nombre }));
}

function normalizarItemCarrito(item: CarritoItem): CarritoItem {
  const removibles = Array.isArray(item.ingredientes_removibles)
    ? item.ingredientes_removibles.filter((ing) => Number.isFinite(ing.id) && ing.id > 0 && !!ing.nombre)
    : [];
  const idsValidos = new Set(removibles.map((ing) => ing.id));
  const personalizacion = Array.isArray(item.personalizacion)
    ? Array.from(new Set(item.personalizacion.filter((id) => Number.isFinite(id) && idsValidos.has(id))))
    : [];

  return {
    ...item,
    ingredientes_removibles: removibles,
    personalizacion,
  };
}

function readStoredCart(userId: number): CarritoItem[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CarritoState;
    if (!parsed || !Array.isArray(parsed.items)) return [];
    return parsed.items
      .filter((item) => item.producto_id > 0 && item.cantidad > 0)
      .map((item) => normalizarItemCarrito(item as CarritoItem));
  } catch {
    return [];
  }
}

function persistCart(userId: number, items: CarritoItem[]): void {
  localStorage.setItem(getStorageKey(userId), JSON.stringify({ items }));
}

export function CarritoProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CarritoItem[]>([]);

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems([]);
      return;
    }
    setItems(readStoredCart(user.id));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    persistCart(user.id, items);
  }, [user, items]);

  const agregarProducto = (producto: Producto, cantidad = 1) => {
    if (!producto.id || cantidad <= 0) return;
    const productoId = producto.id;
    const ingredientesRemovibles = extraerRemovibles(producto);
    const idsRemovibles = new Set(ingredientesRemovibles.map((ing) => ing.id));

    setItems((prev) => {
      const idx = prev.findIndex((item) => item.producto_id === productoId);
      const stock = Math.max(0, producto.stock_cantidad ?? 0);
      if (stock <= 0) return prev;

      if (idx === -1) {
        return [
          ...prev,
          {
            producto_id: productoId,
            nombre: producto.nombre,
            precio_unitario: Number(producto.precio_base ?? 0),
            cantidad: Math.min(cantidad, stock),
            stock_disponible: stock,
            ingredientes_removibles: ingredientesRemovibles,
            personalizacion: [],
          },
        ];
      }

      return prev.map((item, currentIndex) => {
        if (currentIndex !== idx) return item;
        return {
          ...item,
          nombre: producto.nombre,
          precio_unitario: Number(producto.precio_base ?? item.precio_unitario),
          stock_disponible: stock,
          cantidad: Math.min(item.cantidad + cantidad, stock),
          ingredientes_removibles: ingredientesRemovibles,
          personalizacion: item.personalizacion.filter((id) => idsRemovibles.has(id)),
        };
      });
    });
  };

  const incrementarItem = (productoId: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.producto_id !== productoId) return item;
        return { ...item, cantidad: Math.min(item.cantidad + 1, item.stock_disponible) };
      }),
    );
  };

  const decrementarItem = (productoId: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.producto_id !== productoId) return item;
          return { ...item, cantidad: item.cantidad - 1 };
        })
        .filter((item) => item.cantidad > 0),
    );
  };

  const quitarItem = (productoId: number) => {
    setItems((prev) => prev.filter((item) => item.producto_id !== productoId));
  };

  const actualizarPersonalizacion = (productoId: number, ingredienteIds: number[]) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.producto_id !== productoId) return item;
        const limpia = Array.from(
          new Set(
            ingredienteIds.filter((id) => Number.isFinite(id) && id > 0),
          ),
        );
        return {
          ...item,
          personalizacion: limpia,
        };
      }),
    );
  };

  const vaciarCarrito = () => {
    setItems([]);
  };

  const totalItems = useMemo(
    () => items.reduce((acum, item) => acum + item.cantidad, 0),
    [items],
  );
  const subtotal = useMemo(
    () => items.reduce((acum, item) => acum + item.precio_unitario * item.cantidad, 0),
    [items],
  );

  const value = useMemo<CarritoContextType>(
    () => ({
      items,
      totalItems,
      subtotal,
      agregarProducto,
      incrementarItem,
      decrementarItem,
      quitarItem,
      actualizarPersonalizacion,
      vaciarCarrito,
    }),
    [items, totalItems, subtotal],
  );

  return <CarritoContext.Provider value={value}>{children}</CarritoContext.Provider>;
}
