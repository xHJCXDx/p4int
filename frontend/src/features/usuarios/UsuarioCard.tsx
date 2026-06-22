import { ROLE_LABELS, ROLES } from "../../hooks/useRoles";
import type { Usuario } from "../../models/Usuario";

export interface UsuarioCardProps {
  usuario: Usuario;
  currentUserId: number | null;
  isMutating: boolean;
  onCambiarRol: (id: number, rol: string) => void;
  onToggleActivo: (usuario: Usuario) => void;
  onEliminar: (usuario: Usuario) => void;
}

const ROLES_DISPONIBLES = [ROLES.ADMIN, ROLES.STOCK, ROLES.PEDIDOS, ROLES.CLIENT];

export function UsuarioCard({
  usuario,
  currentUserId,
  isMutating,
  onCambiarRol,
  onToggleActivo,
  onEliminar,
}: UsuarioCardProps) {
  const esPropiaCuenta = usuario.id === currentUserId;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden group">
      {/* Indicador izquierdo de color según rol */}
      <div className={`absolute top-0 left-0 w-1.5 h-full ${usuario.rol === ROLES.ADMIN ? "bg-purple-500" : usuario.rol === ROLES.STOCK ? "bg-blue-500" : usuario.rol === ROLES.PEDIDOS ? "bg-orange-500" : "bg-green-500"}`} />
      
      {/* Cabecera: Avatar, Nombre y Email */}
      <div className="flex items-center gap-4 pl-3 flex-1">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg">
          {usuario.nombre.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="font-bold text-gray-900 leading-tight">
            {usuario.nombre}
            {esPropiaCuenta && <span className="text-xs ml-2 text-blue-600 font-normal bg-blue-50 px-2 py-0.5 rounded-full">(vos)</span>}
          </h3>
          <p className="text-xs text-gray-500 truncate max-w-[180px]" title={usuario.email}>{usuario.email}</p>
        </div>
      </div>

      {/* Info: Estado */}
      <div className="flex items-center justify-start sm:justify-center w-28">
        {usuario.is_active ? (
          <span className="bg-green-100 text-green-800 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">Activo</span>
        ) : (
          <span className="bg-red-100 text-red-800 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">Inactivo</span>
        )}
      </div>

      {/* Acciones e info */}
      <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
        <div className="w-full sm:w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1">Rol</label>
          <select
            value={usuario.rol}
            disabled={isMutating || esPropiaCuenta}
            onChange={(e) => onCambiarRol(usuario.id, e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 transition-colors cursor-pointer"
            title={esPropiaCuenta ? "No podés cambiar tu propio rol" : "Seleccionar rol"}
          >
            {ROLES_DISPONIBLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r as keyof typeof ROLE_LABELS]}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            disabled={isMutating || esPropiaCuenta}
            onClick={() => onToggleActivo(usuario)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              usuario.is_active 
                ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200' 
                : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'
            }`}
          >
            {usuario.is_active ? "Desactivar" : "Activar"}
          </button>
          <button
            type="button"
            disabled={isMutating || esPropiaCuenta}
            onClick={() => onEliminar(usuario)}
            className="px-4 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
