import { ROLE_LABELS, ROLES } from "../../hooks/useRoles";
import type { Usuario } from "../../models/Usuario";

interface UsuarioDrawerProps {
  usuario: Usuario | null;
  currentUserId: number | null;
  isOpen: boolean;
  isMutating: boolean;
  onClose: () => void;
  onCambiarRol: (id: number, rol: string) => void;
  onToggleActivo: (usuario: Usuario) => void;
  onEliminar: (usuario: Usuario) => void;
}

const ROLES_DISPONIBLES = [ROLES.ADMIN, ROLES.STOCK, ROLES.PEDIDOS, ROLES.CLIENT];

export function UsuarioDrawer({
  usuario,
  currentUserId,
  isOpen,
  isMutating,
  onClose,
  onCambiarRol,
  onToggleActivo,
  onEliminar,
}: UsuarioDrawerProps) {
  if (!usuario) return null;

  const esPropiaCuenta = usuario.id === currentUserId;
  const iniciales = usuario.nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity ${
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="Cerrar panel de usuario"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
      />

      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl transition-transform duration-300 dark:bg-slate-950 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Detalle de usuario"
      >
        <div className="flex h-full flex-col">
          <header className="border-b border-slate-200 p-6 dark:border-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-black text-white shadow-lg shadow-blue-500/20">
                  {iniciales || usuario.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-950 dark:text-white">
                    {usuario.nombre}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{usuario.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Cerrar
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Estado actual
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                  {ROLE_LABELS[usuario.rol as keyof typeof ROLE_LABELS] ?? usuario.rol}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    usuario.is_active
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-200"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-900/35 dark:text-rose-200"
                  }`}
                >
                  {usuario.is_active ? "Activo" : "Inactivo"}
                </span>
                {esPropiaCuenta && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/35 dark:text-amber-200">
                    Tu cuenta
                  </span>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                Cambiar rol
              </label>
              <select
                value={usuario.rol}
                disabled={isMutating || esPropiaCuenta}
                onChange={(event) => onCambiarRol(usuario.id, event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {ROLES_DISPONIBLES.map((rol) => (
                  <option key={rol} value={rol}>
                    {ROLE_LABELS[rol as keyof typeof ROLE_LABELS]}
                  </option>
                ))}
              </select>
              {esPropiaCuenta && (
                <p className="text-xs text-slate-500">No podés cambiar tu propio rol.</p>
              )}
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={isMutating || esPropiaCuenta}
                onClick={() => onToggleActivo(usuario)}
                className={`rounded-xl border px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  usuario.is_active
                    ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-200"
                }`}
              >
                {usuario.is_active ? "Desactivar" : "Activar"}
              </button>

              <button
                type="button"
                disabled={isMutating || esPropiaCuenta}
                onClick={() => onEliminar(usuario)}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200"
              >
                Eliminar
              </button>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-800">
              <dl className="space-y-3">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">ID</dt>
                  <dd className="font-semibold text-slate-900 dark:text-slate-100">#{usuario.id}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Creado</dt>
                  <dd className="font-semibold text-slate-900 dark:text-slate-100">
                    {new Date(usuario.created_at).toLocaleDateString("es-AR")}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Actualizado</dt>
                  <dd className="font-semibold text-slate-900 dark:text-slate-100">
                    {new Date(usuario.updated_at).toLocaleDateString("es-AR")}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </aside>
    </div>
  );
}
