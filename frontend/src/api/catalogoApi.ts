import { api } from "./http";
import { Categoria } from "../models/Categoria";
import { Ingrediente } from "../models/Ingrediente";
import { Producto } from "../models/Producto";

interface PaginatedResponse<T> {
  total: number;
  items: T[];
}

interface BasePageParams {
  offset?: number;
  limit?: number;
}

interface ProductosPageParams extends BasePageParams {
  search?: string;
  categoria_id?: number;
  subcategoria_id?: number;
  ingrediente_id?: number;
  ingrediente_ids?: number[];
  is_active?: boolean;
  sort_by?: "nombre" | "precio" | "stock";
  sort_dir?: "asc" | "desc";
  include_inactive?: boolean;
}

interface CategoriasPageParams extends BasePageParams {
  search?: string;
  categoria_id?: number;
  parent_id?: number;
  is_active?: boolean;
  sort_by?: "nombre";
  sort_dir?: "asc" | "desc";
  include_inactive?: boolean;
}

interface IngredientesPageParams extends BasePageParams {
  name?: string;
  es_alergeno?: boolean;
  unidad_medida?: string;
  is_active?: boolean;
  sort_by?: "nombre" | "stock";
  sort_dir?: "asc" | "desc";
  include_inactive?: boolean;
}

export async function fetchProductosPage(
  params: ProductosPageParams,
): Promise<PaginatedResponse<Producto>> {
  const { data } = await api.get<PaginatedResponse<Producto>>("/productos", {
    params: {
      offset: params.offset ?? 0,
      limit: params.limit ?? 10,
      search: params.search || undefined,
      categoria_id: params.categoria_id ?? undefined,
      subcategoria_id: params.subcategoria_id ?? undefined,
      ingrediente_id: params.ingrediente_id ?? undefined,
      ingrediente_ids: params.ingrediente_ids?.length ? params.ingrediente_ids : undefined,
      is_active: params.is_active ?? undefined,
      sort_by: params.sort_by ?? undefined,
      sort_dir: params.sort_dir ?? undefined,
      include_inactive: params.include_inactive ?? undefined,
    },
  });
  return { total: data.total, items: data.items.map((item) => new Producto(item)) };
}

export async function fetchCategoriasPage(
  params: CategoriasPageParams,
): Promise<PaginatedResponse<Categoria>> {
  const { data } = await api.get<PaginatedResponse<Categoria>>("/categorias", {
    params: {
      offset: params.offset ?? 0,
      limit: params.limit ?? 10,
      search: params.search || undefined,
      categoria_id: params.categoria_id ?? undefined,
      parent_id: params.parent_id ?? undefined,
      is_active: params.is_active ?? undefined,
      sort_by: params.sort_by ?? undefined,
      sort_dir: params.sort_dir ?? undefined,
      include_inactive: params.include_inactive ?? undefined,
    },
  });
  return { total: data.total, items: data.items.map((item) => new Categoria(item)) };
}

export async function fetchIngredientesPage(
  params: IngredientesPageParams,
): Promise<PaginatedResponse<Ingrediente>> {
  const { data } = await api.get<PaginatedResponse<Ingrediente>>("/ingredientes", {
    params: {
      offset: params.offset ?? 0,
      limit: params.limit ?? 10,
      name: params.name || undefined,
      es_alergeno: params.es_alergeno ?? undefined,
      unidad_medida: params.unidad_medida || undefined,
      is_active: params.is_active ?? undefined,
      sort_by: params.sort_by ?? undefined,
      sort_dir: params.sort_dir ?? undefined,
      include_inactive: params.include_inactive ?? undefined,
    },
  });
  return { total: data.total, items: data.items.map((item) => new Ingrediente(item)) };
}
