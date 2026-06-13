export interface CategoriaInProducto {
  id: number;
  nombre: string;
}

export interface IngredienteInProducto {
  id: number;
  nombre: string;
  es_alergeno: boolean;
  cantidad: number;
  unidad_medida_codigo: string;
  es_removible: boolean;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagenes_url?: string[];
  unidad_venta_codigo?: string;
  stock: number;
  disponible: boolean;
  categorias: CategoriaInProducto[];
  ingredientes: IngredienteInProducto[];
  created_at?: string;
  updated_at?: string;
}

export interface IngredienteEnReceta {
  ingrediente_id: number;
  cantidad: number;
  es_removible: boolean;
}

export interface ProductoCreate {
  nombre: string;
  descripcion: string;
  precio: number;
  imagenes_url?: string[];
  categoria_ids?: number[];
  ingredientes?: IngredienteEnReceta[];
}
