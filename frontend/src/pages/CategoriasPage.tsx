import { Link, useNavigate } from 'react-router-dom';
import { Categoria } from '../models/Categoria';
import { GrillaCategorias } from '../features/categorias/GrillaCategorias';
import { usePermissions } from '../hooks/useRoles';

export function CategoriasPage() {
  const navigate = useNavigate();
  const { canManageCatalogo } = usePermissions();

  const handleEditar = (
    categoria: Categoria,
    context?: {
      returnPage: number;
      returnState?: {
        searchTerm: string;
        categoriaFiltroId: number | "";
        estadoFiltro: "" | "activo" | "inactivo";
        currentParentId?: number | null;
        sortBy: "" | "categoria" | "subcategoria" | "subcategoria2";
        sortDir: "" | "asc" | "desc";
      };
    },
  ) => {
    if (categoria.id) {
      navigate(`/categorias/${categoria.id}/editar`, {
        state: {
          returnTo: '/categorias',
          returnPage: context?.returnPage ?? 1,
          returnState: context?.returnState,
        },
      });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <GrillaCategorias
          onEditar={handleEditar}
          action={
            canManageCatalogo ? (
              <Link
                to="/categorias/nueva"
                state={{ returnTo: '/categorias' }}
                className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-base font-semibold shadow-sm shadow-blue-200 hover:shadow-blue-300 transition-all hover:-translate-y-0.5"
              >
                Nueva Categoria
              </Link>
            ) : (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg">
                Modo solo lectura
              </span>
            )
          }
        />
      </div>
    </div>
  );
}
