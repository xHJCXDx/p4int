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
  calcTotal: () => void;
}

export const useCarritoStore = create<CarritoState>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0,

      addItem: (item) => {
        const state = get();
        const existing = state.items.find((i) => i.producto_id === item.producto_id);

        if (existing) {
          // Si ya existe, incrementar cantidad
          existing.cantidad += item.cantidad;
        } else {
          state.items.push(item);
        }

        set({ items: [...state.items] });
        get().calcTotal();
      },

      removeItem: (producto_id) => {
        const newItems = get().items.filter((i) => i.producto_id !== producto_id);
        set({ items: newItems });
        get().calcTotal();
      },

      updateCantidad: (producto_id, cantidad) => {
        if (cantidad <= 0) {
          get().removeItem(producto_id);
        } else {
          const item = get().items.find((i) => i.producto_id === producto_id);
          if (item) {
            item.cantidad = cantidad;
            set({ items: [...get().items] });
            get().calcTotal();
          }
        }
      },

      clearCarrito: () => {
        set({ items: [], total: 0 });
      },

      calcTotal: () => {
        const total = get().items.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
        set({ total });
      },
    }),
    {
      name: 'carrito-storage', // Clave en localStorage
    }
  )
);
