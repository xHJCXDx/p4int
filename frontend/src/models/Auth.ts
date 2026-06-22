export interface AuthUser {
  id: number;
  nombre: string;
  apellido?: string;
  celular?: string;
  email: string;
  rol: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: AuthUser;
}
