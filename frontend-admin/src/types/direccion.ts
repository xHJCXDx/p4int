export interface DireccionEntrega {
  id: number;
  usuario_id: number;
  alias: string;
  linea1: string;
  linea2: string | null;
  ciudad: string;
  provincia: string;
  codigo_postal: string;
  latitud: number | null;
  longitud: number | null;
  es_principal: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
