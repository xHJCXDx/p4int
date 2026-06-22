/* eslint-disable react-refresh/only-export-components */
import { createContext, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Ingrediente } from "../models/Ingrediente";
import { api, getApiErrorMessage } from "../api/http";
import { useAuth } from "../hooks/useAuth";

export interface IngredientesContextType {
  ingredientes: Ingrediente[];
  error: string | null;
  limpiarError: () => void;
  agregar: (i: Ingrediente) => Promise<Ingrediente>;
  eliminar: (id: number) => void;
  eliminarDefinitivo: (id: number) => void;
  cambiarEstado: (id: number, isActive: boolean) => void;
  editar: (i: Ingrediente) => Promise<void>;
  resetear: () => void;
}

export const IngredientesContext = createContext<IngredientesContextType | undefined>(undefined);

const QUERY_KEY = ["catalogo", "ingredientes"] as const;
const PAGE_LIMIT = 100;

async function fetchIngredientes(): Promise<Ingrediente[]> {
  const lista: Ingrediente[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const { data } = await api.get<{ total?: number; items?: Ingrediente[] } | Ingrediente[]>("/ingredientes", {
      params: { offset, limit: PAGE_LIMIT, include_inactive: true },
    });
    const items = Array.isArray(data) ? data : (data.items ?? []);
    lista.push(...items);

    if (Array.isArray(data)) break;
    total = data.total ?? lista.length;
    offset += PAGE_LIMIT;
  }

  return lista.map((i) => new Ingrediente(i));
}

export const IngredientesProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { data, isError, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchIngredientes,
    enabled: isAuthenticated,
  });

  const invalidateIngredientes = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  const agregarMutation = useMutation({
    mutationFn: async (i: Ingrediente) => {
      const { data } = await api.post<Ingrediente>("/ingredientes", i);
      return new Ingrediente(data);
    },
    onSuccess: () => {
      setMutationError(null);
      invalidateIngredientes();
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, "No se pudo guardar el ingrediente")),
  });

  const editarMutation = useMutation({
    mutationFn: async (i: Ingrediente) => {
      await api.patch(`/ingredientes/${i.id}`, i);
    },
    onSuccess: () => {
      setMutationError(null);
      invalidateIngredientes();
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, "No se pudo editar el ingrediente")),
  });

  const eliminarMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/ingredientes/${id}`);
    },
    onSuccess: () => {
      setMutationError(null);
      invalidateIngredientes();
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, "No se pudo eliminar el ingrediente")),
  });

  const eliminarDefinitivoMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/ingredientes/${id}/hard`);
    },
    onSuccess: () => {
      setMutationError(null);
      invalidateIngredientes();
    },
    onError: (err) =>
      setMutationError(getApiErrorMessage(err, "No se pudo eliminar definitivamente el ingrediente")),
  });

  const estadoMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await api.patch(`/ingredientes/${id}/estado`, { is_active: isActive });
    },
    onSuccess: () => {
      setMutationError(null);
      invalidateIngredientes();
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, "No se pudo actualizar el estado del ingrediente")),
  });

  const agregar = async (i: Ingrediente) => {
    return agregarMutation.mutateAsync(i);
  };
  const editar = async (i: Ingrediente) => {
    await editarMutation.mutateAsync(i);
  };
  const eliminar = (id: number) => eliminarMutation.mutate(id);
  const eliminarDefinitivo = (id: number) => eliminarDefinitivoMutation.mutate(id);
  const cambiarEstado = (id: number, isActive: boolean) => estadoMutation.mutate({ id, isActive });

  const resetear = () => {
    queryClient.setQueryData(QUERY_KEY, [] as Ingrediente[]);
  };

  const limpiarError = () => setMutationError(null);

  const queryError = isError ? getApiErrorMessage(error, "No se pudo cargar el listado de ingredientes") : null;

  return (
    <IngredientesContext.Provider
      value={{
        ingredientes: data ?? [],
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
    </IngredientesContext.Provider>
  );
};
