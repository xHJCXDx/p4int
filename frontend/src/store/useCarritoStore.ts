import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  producto_id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen?: string;
}

interface CarritoState {
  items: CartItem[];
  total: number;
  addItem: (item: CartItem) => void;
  removeItem: (producto_id: number) => void;
  updateCantidad: (producto_id: number, cantidad: number) => void;
  clearCarrito: () => void;
}

function calcTotal(items: CartItem[]): number {
  return items.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
}

export const useCarritoStore = create<CarritoState>()(
  persist(
    (set) => ({
      items: [],
      total: 0,

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find((i) => i.producto_id === item.producto_id);
          const newItems = existing
            ? state.items.map((i) =>
                i.producto_id === item.producto_id
                  ? { ...i, cantidad: i.cantidad + item.cantidad }
                  : i
              )
            : [...state.items, item];
          return { items: newItems, total: calcTotal(newItems) };
        });
      },

      removeItem: (producto_id) => {
        set((state) => {
          const newItems = state.items.filter((i) => i.producto_id !== producto_id);
          return { items: newItems, total: calcTotal(newItems) };
        });
      },

      updateCantidad: (producto_id, cantidad) => {
        set((state) => {
          if (cantidad <= 0) {
            const newItems = state.items.filter((i) => i.producto_id !== producto_id);
            return { items: newItems, total: calcTotal(newItems) };
          }
          const newItems = state.items.map((i) =>
            i.producto_id === producto_id ? { ...i, cantidad } : i
          );
          return { items: newItems, total: calcTotal(newItems) };
        });
      },

      clearCarrito: () => {
        set({ items: [], total: 0 });
      },
    }),
    {
      name: 'carrito-storage',
    }
  )
);
