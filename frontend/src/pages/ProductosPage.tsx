import { Link, useNavigate } from 'react-router-dom';
import { Producto } from '../models/Producto';
import { GrillaProductos } from '../features/productos/GrillaProductos';
import { usePermissions } from '../hooks/useRoles';

export function ProductosPage() {
  const navigate = useNavigate();
  const { canManageCatalogo, canUseCarrito } = usePermissions();

  const handleEditar = (
    producto: Producto,
    context?: {
      returnPage: number;
      returnState?: {
        searchTerm: string;
        categoriaFiltroId: number | "";
        ingredientesFiltro: number[];
        estadoFiltro: "" | "activo" | "inactivo";
        sortBy: "nombre" | "precio" | "stock" | "";
        sortDir: "asc" | "desc";
      };
    },
  ) => {
    if (producto.id) {
      navigate(`/productos/${producto.id}/editar`, {
        state: {
          returnTo: '/productos',
          returnPage: context?.returnPage ?? 1,
          returnState: context?.returnState,
        },
      });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white/95 dark:bg-slate-950/70 backdrop-blur-sm p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/70">
        <GrillaProductos
          onEditar={handleEditar}
          action={
            canManageCatalogo ? (
              <Link
                to="/productos/nuevo"
                state={{ returnTo: '/productos' }}
                className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 dark:bg-blue-600/95 dark:hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-base font-semibold shadow-sm shadow-blue-200/70 dark:shadow-blue-950/60 transition-all hover:-translate-y-0.5"
              >
                Nuevo Producto
              </Link>
            ) : canUseCarrito ? (
              <Link
                to="/carrito"
                className="bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Ver carrito
              </Link>
            ) : (
              <span className="text-xs font-medium text-gray-500 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-1.5 rounded-lg">
                Modo solo lectura
              </span>
            )
          }
        />
      </div>
    </div>
  );
}
