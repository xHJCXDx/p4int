export interface Ingrediente {
  id?: number;
  nombre: string;
  descripcion?: string;
  es_alergeno: boolean;
  stock_cantidad: number;
  unidad_medida_codigo: string;
  created_at?: string;
  updated_at?: string;
}

export interface UnidadMedida {
  codigo: string;
  nombre: string;
}
