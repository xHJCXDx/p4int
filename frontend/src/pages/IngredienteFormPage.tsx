import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import FormularioIngrediente from '../features/ingredientes/FormularioIngrediente';
import { usePermissions } from '../hooks/useRoles';
import { useIngredientes } from '../hooks/useIngrediente';
import { api } from '../api/http';
import { Ingrediente } from '../models/Ingrediente';

export function IngredienteFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { canManageCatalogo } = usePermissions();
  const { ingredientes } = useIngredientes();

  const ingredienteId = id ? Number(id) : null;
  const ingredienteEnMemoria =
    ingredienteId && Number.isFinite(ingredienteId) ? ingredientes.find((i) => i.id === ingredienteId) ?? null : null;

  const { data: ingredienteDesdeApi, isLoading } = useQuery({
    queryKey: ['catalogo', 'ingredientes', 'detalle', ingredienteId],
    queryFn: async () => {
      const { data } = await api.get(`/ingredientes/${ingredienteId}`);
      return new Ingrediente(data);
    },
    enabled: Boolean(ingredienteId && !ingredienteEnMemoria),
  });

  const ingredienteAEditar = ingredienteEnMemoria ?? ingredienteDesdeApi ?? null;
  const returnTo = (location.state as {
    returnTo?: string;
    returnPage?: number;
    returnState?: {
      searchTerm?: string;
      alergenoFiltro?: '' | 'si' | 'no';
      unidadMedidaFiltro?: string;
      estadoFiltro?: '' | 'activo' | 'inactivo';
      sortNombre?: '' | 'asc' | 'desc';
      sortStock?: '' | 'asc' | 'desc';
    };
    suggestedName?: string;
    suggestedUnit?: 'g' | 'kg' | 'L' | 'ml' | 'ud' | 'porciones' | 'gr' | 'litros' | 'unidad';
  } | null)?.returnTo;
  const returnPage = (location.state as { returnPage?: number } | null)?.returnPage;
  const returnState = (location.state as {
    returnState?: {
      searchTerm?: string;
      alergenoFiltro?: '' | 'si' | 'no';
      unidadMedidaFiltro?: string;
      estadoFiltro?: '' | 'activo' | 'inactivo';
      sortNombre?: '' | 'asc' | 'desc';
      sortStock?: '' | 'asc' | 'desc';
    };
  } | null)?.returnState;
  const suggestedName = (location.state as { suggestedName?: string } | null)?.suggestedName;
  const suggestedUnit = (location.state as {
    suggestedUnit?: 'g' | 'kg' | 'L' | 'ml' | 'ud' | 'porciones' | 'gr' | 'litros' | 'unidad';
  } | null)?.suggestedUnit;
  const isReturnToProductoForm = Boolean(returnTo?.startsWith('/productos'));
  const volver = () =>
    navigate(returnTo || '/ingredientes', {
      state: returnTo
        ? isReturnToProductoForm
          ? { restoreDraft: true }
          : { restorePage: returnPage, restoreState: returnState }
        : undefined,
    });
  const volverConResaltado = (ingrediente: Ingrediente) =>
    navigate(returnTo || '/ingredientes', {
      state: returnTo
        ? isReturnToProductoForm
          ? { restoreDraft: true }
          : { restorePage: returnPage, restoreState: returnState, highlightIngredienteId: Number(ingrediente.id) }
        : { highlightIngredienteId: Number(ingrediente.id) },
    });

  if (!canManageCatalogo) {
    return (
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <p className="text-gray-600">No tenes permisos para gestionar ingredientes.</p>
      </div>
    );
  }

  if (id && isLoading) {
    return (
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <p className="text-gray-600">Cargando ingrediente...</p>
      </div>
    );
  }

  if (id && !ingredienteAEditar) {
    return (
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <p className="text-gray-700">No se encontro el ingrediente a editar.</p>
        <Link
          to={returnTo || '/ingredientes'}
          state={
            returnTo
              ? isReturnToProductoForm
                ? { restoreDraft: true }
                : { restorePage: returnPage, restoreState: returnState }
              : undefined
          }
          className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          {ingredienteAEditar ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
        </h1>
        <Link
          to={returnTo || '/ingredientes'}
          state={
            returnTo
              ? isReturnToProductoForm
                ? { restoreDraft: true }
                : { restorePage: returnPage, restoreState: returnState }
              : undefined
          }
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Volver al listado
        </Link>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <FormularioIngrediente
          ingredienteAEditar={ingredienteAEditar}
          nombreSugerido={suggestedName}
          unidadSugerida={suggestedUnit}
          onCancelarEdicion={volver}
          onSuccess={volverConResaltado}
        />
      </div>
    </div>
  );
}
