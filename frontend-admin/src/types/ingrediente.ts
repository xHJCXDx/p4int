export interface Ingrediente {
  id?: number;
  nombre: string;
  descripcion?: string;
  es_alergeno: boolean;
  stock_cantidad: number;
  unidad_medida_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface UnidadMedida {
  id?: number;
  codigo: string;
  nombre: string;
  simbolo: string;
  tipo: string;
}
