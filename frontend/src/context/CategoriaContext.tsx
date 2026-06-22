/* eslint-disable react-refresh/only-export-components */
import { createContext, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Categoria } from "../models/Categoria";
import { api, getApiErrorMessage } from "../api/http";
import { useAuth } from "../hooks/useAuth";

export interface CategoriasContextType {
  categorias: Categoria[];
  error: string | null;
  limpiarError: () => void;
  agregar: (c: Categoria) => Promise<Categoria>;
  eliminar: (id: number) => void;
  eliminarDefinitivo: (id: number) => void;
  cambiarEstado: (id: number, isActive: boolean) => void;
  editar: (c: Categoria) => Promise<void>;
  resetear: () => void;
}

export const CategoriasContext = createContext<CategoriasContextType | undefined>(undefined);

const QUERY_KEY = ["catalogo", "categorias"] as const;
const PAGE_LIMIT = 100;

async function fetchCategorias(): Promise<Categoria[]> {
  const takeItems = (payload: { total?: number; items?: Categoria[] } | Categoria[]) =>
    (Array.isArray(payload) ? payload : (payload.items ?? []));

  const fetchPageGroup = async (parentId?: number) => {
    const categorias: Categoria[] = [];
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;

    while (offset < total) {
      const resp = await api.get<{ total?: number; items?: Categoria[] } | Categoria[]>("/categorias", {
        params: {
          parent_id: parentId,
          offset,
          limit: PAGE_LIMIT,
          include_inactive: true,
        },
      });
      const items = takeItems(resp.data);
      categorias.push(...items);

      if (Array.isArray(resp.data)) break;
      total = resp.data.total ?? categorias.length;
      offset += PAGE_LIMIT;
    }

    return categorias;
  };

  const raiz = await fetchPageGroup();
  const todas: Categoria[] = [...raiz];

  const pendientes = raiz.filter((c) => c.id).map((c) => c.id as number);
  while (pendientes.length > 0) {
    const parentId = pendientes.shift();
    if (!parentId) continue;

    const hijas = await fetchPageGroup(parentId);
    if (!hijas.length) continue;

    todas.push(...hijas);
    pendientes.push(...hijas.filter((c) => c.id).map((c) => c.id as number));
  }

  return todas.map((c) => new Categoria(c));
}

export const CategoriasProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { data, isError, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchCategorias,
    enabled: isAuthenticated,
  });

  const invalidateCategorias = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  const agregarMutation = useMutation({
    mutationFn: async (c: Categoria) => {
      const { data } = await api.post<Categoria>("/categorias", c);
      return new Categoria(data);
    },
    onSuccess: (categoriaCreada) => {
      setMutationError(null);
      queryClient.setQueryData<Categoria[]>(QUERY_KEY, (prev) => {
        const actuales = prev ?? [];
        if (actuales.some((categoria) => categoria.id === categoriaCreada.id)) return actuales;
        return [...actuales, categoriaCreada];
      });
      invalidateCategorias();
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, "No se pudo guardar la categoria")),
  });

  const editarMutation = useMutation({
    mutationFn: async (c: Categoria) => {
      await api.patch(`/categorias/${c.id}`, c);
    },
    onSuccess: () => {
      setMutationError(null);
      invalidateCategorias();
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, "No se pudo editar la categoria")),
  });

  const eliminarMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/categorias/${id}`);
    },
    onSuccess: () => {
      setMutationError(null);
      invalidateCategorias();
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, "No se pudo eliminar la categoria")),
  });

  const estadoMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await api.patch(`/categorias/${id}/estado`, { is_active: isActive });
    },
    onSuccess: () => {
      setMutationError(null);
      invalidateCategorias();
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, "No se pudo actualizar el estado de la categoria")),
  });

  const eliminarDefinitivoMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/categorias/${id}/hard`);
    },
    onSuccess: () => {
      setMutationError(null);
      invalidateCategorias();
    },
    onError: (err) =>
      setMutationError(getApiErrorMessage(err, "No se pudo eliminar definitivamente la categoria")),
  });

  const agregar = async (c: Categoria) => {
    return agregarMutation.mutateAsync(c);
  };
  const editar = async (c: Categoria) => {
    await editarMutation.mutateAsync(c);
  };
  const eliminar = (id: number) => eliminarMutation.mutate(id);
  const eliminarDefinitivo = (id: number) => eliminarDefinitivoMutation.mutate(id);
  const cambiarEstado = (id: number, isActive: boolean) => estadoMutation.mutate({ id, isActive });

  const resetear = () => {
    queryClient.setQueryData(QUERY_KEY, [] as Categoria[]);
  };

  const limpiarError = () => setMutationError(null);

  const queryError = isError ? getApiErrorMessage(error, "No se pudo cargar el listado de categorias") : null;

  return (
    <CategoriasContext.Provider
      value={{
        categorias: data ?? [],
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
    </CategoriasContext.Provider>
  );
};
