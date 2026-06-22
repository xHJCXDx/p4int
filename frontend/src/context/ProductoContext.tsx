/* eslint-disable react-refresh/only-export-components */
import { createContext, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Producto } from "../models/Producto";
import { api, getApiErrorMessage } from "../api/http";
import { useAuth } from "../hooks/useAuth";

export interface ProductosContextType {
  productos: Producto[];
  error: string | null;
  limpiarError: () => void;
  agregar: (p: Producto) => Promise<Producto>;
  eliminar: (id: number) => void;
  eliminarDefinitivo: (id: number) => void;
  cambiarEstado: (id: number, isActive: boolean) => void;
  editar: (p: Producto) => Promise<void>;
  resetear: () => void;
}

export const ProductosContext = createContext<ProductosContextType | undefined>(undefined);

const QUERY_KEY = ["catalogo", "productos"] as const;
const PAGE_LIMIT = 100;

async function fetchProductos(): Promise<Producto[]> {
  const lista: Producto[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const { data } = await api.get<{ total?: number; items?: Producto[] } | Producto[]>("/productos", {
      params: { offset, limit: PAGE_LIMIT, include_inactive: true },
    });
    const items = Array.isArray(data) ? data : (data.items ?? []);
    lista.push(...items);

    if (Array.isArray(data)) break;
    total = data.total ?? lista.length;
    offset += PAGE_LIMIT;
  }

  return lista.map((p) => new Producto(p));
}

export const ProductosProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { data, isError, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchProductos,
    enabled: isAuthenticated,
  });

  const invalidateProductos = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  const agregarMutation = useMutation({
    mutationFn: async (p: Producto) => {
      const { data } = await api.post<Producto>("/productos", p);
      return new Producto(data);
    },
    onSuccess: () => {
      setMutationError(null);
      invalidateProductos();
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, "No se pudo guardar el producto")),
  });

  const editarMutation = useMutation({
    mutationFn: async (p: Producto) => {
      await api.patch(`/productos/${p.id}`, p);
    },
    onSuccess: () => {
      setMutationError(null);
      invalidateProductos();
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, "No se pudo editar el producto")),
  });

  const eliminarMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/productos/${id}`);
    },
    onSuccess: () => {
      setMutationError(null);
      invalidateProductos();
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, "No se pudo eliminar el producto")),
  });

  const eliminarDefinitivoMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/productos/${id}/hard`);
    },
    onSuccess: () => {
      setMutationError(null);
      invalidateProductos();
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, "No se pudo eliminar definitivamente el producto")),
  });

  const estadoMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await api.patch(`/productos/${id}/estado`, { is_active: isActive });
    },
    onSuccess: () => {
      setMutationError(null);
      invalidateProductos();
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, "No se pudo actualizar el estado del producto")),
  });

  const agregar = async (p: Producto) => {
    return agregarMutation.mutateAsync(p);
  };

  const editar = async (p: Producto) => {
    await editarMutation.mutateAsync(p);
  };

  const eliminar = (id: number) => {
    eliminarMutation.mutate(id);
  };

  const eliminarDefinitivo = (id: number) => {
    eliminarDefinitivoMutation.mutate(id);
  };

  const cambiarEstado = (id: number, isActive: boolean) => {
    estadoMutation.mutate({ id, isActive });
  };

  const resetear = () => {
    queryClient.setQueryData(QUERY_KEY, [] as Producto[]);
  };

  const limpiarError = () => setMutationError(null);

  const queryError = isError ? getApiErrorMessage(error, "No se pudo cargar el listado de productos") : null;

  return (
    <ProductosContext.Provider
      value={{
        productos: data ?? [],
        error: mutationError ?? queryError,
        limpiarError,
        agregar,
        eliminar,
        eliminarDefinitivo,
        cambiarEstado,
        editar,
        resetear,
      }}
    >
      {children}
    </ProductosContext.Provider>
  );
};
