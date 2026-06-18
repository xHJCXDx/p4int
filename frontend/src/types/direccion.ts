export interface DireccionEntrega {
  id: number;
  usuario_id: number;
  alias: string | null;
  calle: string;
  numero: string;
  localidad: string;
  provincia: string;
  codigo_postal: string;
  piso?: string | null;
  departamento?: string | null;
  referencia?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  es_principal: boolean;
  created_at: string;
}
