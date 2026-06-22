import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../hooks/useAuth";
import type { Usuario } from "../models/Usuario";
import {
  assignRol,
  deleteUsuario,
  fetchUsuarios,
  updateUsuario,
} from "../api/usuariosApi";
import { UsuarioDrawer } from "../features/usuarios/UsuarioDrawer";
import { Pagination } from "../components/Pagination";
import { getApiErrorMessage } from "../api/http";
import { ROLE_LABELS, ROLES } from "../hooks/useRoles";

const LIMIT = 10;

export function UsuariosPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [rolFiltro, setRolFiltro] = useState<string>("");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);

  const offset = (page - 1) * LIMIT;

  // ── useQuery: listado paginado con filtro por rol ──────────────────────────
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["usuarios", rolFiltro, page],
    queryFn: () => fetchUsuarios({ rol: rolFiltro, offset, limit: LIMIT }),
  });

  // ── Invalidación común tras una mutación ───────────────────────────────────
  const invalidarUsuarios = () => {
    queryClient.invalidateQueries({ queryKey: ["usuarios"] });
  };

  const onMutationError = (err: unknown) => {
    setActionError(getApiErrorMessage(err, "No se pudo completar la acción"));
  };

  // ── useMutation: cambiar rol ───────────────────────────────────────────────
  const rolMutation = useMutation({
    mutationFn: ({ id, rol }: { id: number; rol: string }) => assignRol(id, { rol }),
    onSuccess: () => {
      setActionError(null);
      invalidarUsuarios();
    },
    onError: onMutationError,
  });

  // ── useMutation: activar/desactivar ────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: (usuario: Usuario) =>
      updateUsuario(usuario.id, { is_active: !usuario.is_active }),
    onSuccess: () => {
      setActionError(null);
      invalidarUsuarios();
    },
    onError: onMutationError,
  });

  // ── useMutation: eliminar (soft delete) ────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUsuario(id),
    onSuccess: () => {
      setActionError(null);
      invalidarUsuarios();
    },
    onError: onMutationError,
  });

  const isMutating =
    rolMutation.isPending || toggleMutation.isPending || deleteMutation.isPending;

  const handleEliminar = (usuario: Usuario) => {
    if (window.confirm(`¿Seguro que querés eliminar a "${usuario.nombre}"?`)) {
      deleteMutation.mutate(usuario.id);
      setSelectedUsuario(null);
    }
  };

  const handleFiltroRol = (value: string) => {
    setRolFiltro(value);
    setPage(1);
  };

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const usuarios = data?.items ?? [];
  const selectedUsuarioActualizado = selectedUsuario
    ? usuarios.find((usuario) => usuario.id === selectedUsuario.id) ?? selectedUsuario
    : null;

  const roleBadgeClass = (rol: string) => {
    if (rol === ROLES.ADMIN) return "bg-purple-100 text-purple-700 dark:bg-purple-900/35 dark:text-purple-200";
    if (rol === ROLES.STOCK) return "bg-blue-100 text-blue-700 dark:bg-blue-900/35 dark:text-blue-200";
    if (rol === ROLES.PEDIDOS) return "bg-orange-100 text-orange-700 dark:bg-orange-900/35 dark:text-orange-200";
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-200";
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:bg-slate-950 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight dark:text-white">Gestión de Usuarios</h2>
            <p className="text-sm text-gray-500 mt-1 dark:text-slate-400">
              {total} usuario{total === 1 ? "" : "s"}
              {isFetching && <span className="ml-2 text-blue-500">actualizando…</span>}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Rol:</label>
            <select
              value={rolFiltro}
              onChange={(e) => handleFiltroRol(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
            >
              <option value="">Todos</option>
              {[ROLES.ADMIN, ROLES.STOCK, ROLES.PEDIDOS, ROLES.CLIENT].map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {actionError && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {actionError}
          </div>
        )}

        {isLoading ? (
          <p className="text-center py-12 text-gray-500">Cargando usuarios…</p>
        ) : isError ? (
          <div className="text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
            {getApiErrorMessage(error, "No se pudo cargar el listado de usuarios")}
          </div>
        ) : usuarios.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100 dark:bg-slate-900 dark:border-slate-800">
            <p className="text-gray-500 text-lg">No hay usuarios para mostrar.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="hidden grid-cols-[1.4fr_1.6fr_1fr_1fr_120px] gap-4 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-900 dark:text-slate-400 md:grid">
                <span>Nombre</span>
                <span>Email</span>
                <span>Rol</span>
                <span>Estado</span>
                <span className="text-right">Acciones</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {usuarios.map((usuario) => {
                  const esPropiaCuenta = usuario.id === user?.id;
                  const inicial = usuario.nombre.charAt(0).toUpperCase();

                  return (
                    <button
                      key={usuario.id}
                      type="button"
                      onClick={() => setSelectedUsuario(usuario)}
                      className="grid w-full gap-4 px-5 py-4 text-left transition hover:bg-blue-50/60 focus:bg-blue-50/80 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:hover:bg-slate-900 md:grid-cols-[1.4fr_1.6fr_1fr_1fr_120px] md:items-center"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                          {inicial}
                        </span>
                        <span>
                          <span className="block font-black text-slate-950 dark:text-white">
                            {usuario.nombre}
                            {esPropiaCuenta && (
                              <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/35 dark:text-blue-200">
                                vos
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-slate-500 md:hidden">{usuario.email}</span>
                        </span>
                      </div>

                      <span className="hidden truncate text-sm text-slate-600 dark:text-slate-300 md:block" title={usuario.email}>
                        {usuario.email}
                      </span>

                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${roleBadgeClass(usuario.rol)}`}>
                        {ROLE_LABELS[usuario.rol as keyof typeof ROLE_LABELS] ?? usuario.rol}
                      </span>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
                          usuario.is_active
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-200"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/35 dark:text-rose-200"
                        }`}
                      >
                        {usuario.is_active ? "Activo" : "Inactivo"}
                      </span>

                      <span className="text-left text-sm font-black text-blue-700 dark:text-blue-300 md:text-right">
                        Ver detalle
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>
        )}
      </div>

      <UsuarioDrawer
        usuario={selectedUsuarioActualizado}
        currentUserId={user?.id ?? null}
        isOpen={Boolean(selectedUsuario)}
        isMutating={isMutating}
        onClose={() => setSelectedUsuario(null)}
        onCambiarRol={(id, rol) => rolMutation.mutate({ id, rol })}
        onToggleActivo={(usuario) => toggleMutation.mutate(usuario)}
        onEliminar={handleEliminar}
      />
    </div>
  );
}
