import { api } from "./http";
import type {
  RolAssignPayload,
  Usuario,
  UsuarioPaginatedResponse,
  UsuarioUpdatePayload,
} from "../models/Usuario";

interface ListUsuariosParams {
  rol?: string;
  offset?: number;
  limit?: number;
}

export async function fetchUsuarios(
  params: ListUsuariosParams,
): Promise<UsuarioPaginatedResponse> {
  const { data } = await api.get<UsuarioPaginatedResponse>("/admin/usuarios", {
    params: {
      rol: params.rol || undefined,
      offset: params.offset ?? 0,
      limit: params.limit ?? 10,
    },
  });
  return data;
}

export async function updateUsuario(
  id: number,
  payload: UsuarioUpdatePayload,
): Promise<Usuario> {
  const { data } = await api.patch<Usuario>(`/admin/usuarios/${id}`, payload);
  return data;
}

export async function assignRol(
  id: number,
  payload: RolAssignPayload,
): Promise<Usuario> {
  const { data } = await api.patch<Usuario>(`/admin/usuarios/${id}/rol`, payload);
  return data;
}

export async function deleteUsuario(id: number): Promise<void> {
  await api.delete(`/admin/usuarios/${id}`);
}
