export interface Usuario {
  id: number;
  nombre: string;
  apellido?: string;
  celular?: string;
  email: string;
  rol: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsuarioPaginatedResponse {
  total: number;
  items: Usuario[];
}

export interface UsuarioUpdatePayload {
  nombre?: string;
  is_active?: boolean;
}

export interface RolAssignPayload {
  rol: string;
}
