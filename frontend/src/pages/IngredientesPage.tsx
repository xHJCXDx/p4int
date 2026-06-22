import { Link, useNavigate } from 'react-router-dom';
import { Ingrediente } from '../models/Ingrediente';
import { GrillaIngredientes } from '../features/ingredientes/GrillaIngredientes';
import { usePermissions } from '../hooks/useRoles';

export function IngredientesPage() {
  const navigate = useNavigate();
  const { canManageCatalogo } = usePermissions();

  const handleEditar = (
    ingrediente: Ingrediente,
    context?: {
      returnPage: number;
      returnState?: {
        searchTerm: string;
        alergenoFiltro: "" | "si" | "no";
        unidadMedidaFiltro: string;
        estadoFiltro: "" | "activo" | "inactivo";
        sortNombre: "" | "asc" | "desc";
        sortStock: "" | "asc" | "desc";
      };
    },
  ) => {
    if (ingrediente.id) {
      navigate(`/ingredientes/${ingrediente.id}/editar`, {
        state: {
          returnTo: '/ingredientes',
          returnPage: context?.returnPage ?? 1,
          returnState: context?.returnState,
        },
      });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <GrillaIngredientes
          onEditar={handleEditar}
          action={
            canManageCatalogo ? (
              <Link
                to="/ingredientes/nuevo"
                state={{ returnTo: '/ingredientes' }}
                className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-base font-semibold shadow-sm shadow-blue-200 hover:shadow-blue-300 transition-all hover:-translate-y-0.5"
              >
                Nuevo Ingrediente
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
