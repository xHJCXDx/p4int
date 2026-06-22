import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import FormularioCategoria from '../features/categorias/FormularioCategoria';
import { usePermissions } from '../hooks/useRoles';
import { useCategorias } from '../hooks/useCategoria';
import { api } from '../api/http';
import { Categoria } from '../models/Categoria';

export function CategoriaFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { canManageCatalogo } = usePermissions();
  const { categorias } = useCategorias();

  const categoriaId = id ? Number(id) : null;
  const categoriaEnMemoria =
    categoriaId && Number.isFinite(categoriaId) ? categorias.find((c) => c.id === categoriaId) ?? null : null;

  const { data: categoriaDesdeApi, isLoading } = useQuery({
    queryKey: ['catalogo', 'categorias', 'detalle', categoriaId],
    queryFn: async () => {
      const { data } = await api.get(`/categorias/${categoriaId}`);
      return new Categoria(data);
    },
    enabled: Boolean(categoriaId && !categoriaEnMemoria),
  });

  const categoriaAEditar = categoriaEnMemoria ?? categoriaDesdeApi ?? null;
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  const returnPage = (location.state as { returnPage?: number } | null)?.returnPage;
  const returnState = (location.state as {
    returnState?: {
      searchTerm?: string;
      categoriaFiltroId?: number | "";
      estadoFiltro?: "" | "activo" | "inactivo";
      currentParentId?: number | null;
      sortBy?: "" | "categoria" | "subcategoria" | "subcategoria2";
      sortDir?: "" | "asc" | "desc";
    };
  } | null)?.returnState;
  const isReturnToProductoForm = Boolean(returnTo?.startsWith('/productos'));
  const volver = () =>
    navigate(returnTo || '/categorias', {
      state: returnTo
        ? isReturnToProductoForm
          ? { restoreDraft: true }
          : { restorePage: returnPage, restoreState: returnState }
        : undefined,
    });
  const volverConResaltado = (categoria: Categoria) =>
    navigate(returnTo || '/categorias', {
      state: returnTo
        ? isReturnToProductoForm
          ? { restoreDraft: true }
          : {
              restorePage: returnPage,
              restoreState: {
                ...returnState,
                currentParentId: categoria.parent_id != null ? Number(categoria.parent_id) : null,
              },
              highlightCategoryId: Number(categoria.id),
            }
        : {
            restoreState: {
              currentParentId: categoria.parent_id != null ? Number(categoria.parent_id) : null,
            },
            highlightCategoryId: Number(categoria.id),
          },
    });

  if (!canManageCatalogo) {
    return (
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <p className="text-gray-600">No tenes permisos para gestionar categorias.</p>
      </div>
    );
  }

  if (id && isLoading) {
    return (
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <p className="text-gray-600">Cargando categoria...</p>
      </div>
    );
  }

  if (id && !categoriaAEditar) {
    return (
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <p className="text-gray-700">No se encontro la categoria a editar.</p>
        <Link
          to={returnTo || '/categorias'}
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
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{categoriaAEditar ? 'Editar Categoria' : 'Nueva Categoria'}</h1>
        <Link
          to={returnTo || '/categorias'}
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
        <FormularioCategoria
          categoriaAEditar={categoriaAEditar}
          onCancelarEdicion={volver}
          onSuccess={volverConResaltado}
        />
      </div>
    </div>
  );
}
