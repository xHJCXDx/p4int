import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import FormularioProducto from '../features/productos/FormularioProducto';
import { usePermissions } from '../hooks/useRoles';
import { useProductos } from '../hooks/useProducto';
import { api } from '../api/http';
import { Producto } from '../models/Producto';

export function ProductoFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { canManageCatalogo } = usePermissions();
  const { productos } = useProductos();

  const productoId = id ? Number(id) : null;
  const productoEnMemoria =
    productoId && Number.isFinite(productoId) ? productos.find((p) => p.id === productoId) ?? null : null;

  const { data: productoDesdeApi, isLoading } = useQuery({
    queryKey: ['catalogo', 'productos', 'detalle', productoId],
    queryFn: async () => {
      const { data } = await api.get(`/productos/${productoId}`);
      return new Producto(data);
    },
    enabled: Boolean(productoId && !productoEnMemoria),
  });

  const productoAEditar = productoEnMemoria ?? productoDesdeApi ?? null;
  const returnTo = (location.state as { returnTo?: string; returnPage?: number } | null)?.returnTo;
  const returnPage = (location.state as { returnTo?: string; returnPage?: number } | null)?.returnPage;
  const returnState = (location.state as {
    returnState?: {
      searchTerm?: string;
      categoriaFiltroId?: number | "";
      ingredientesFiltro?: number[];
      estadoFiltro?: "" | "activo" | "inactivo";
      sortBy?: "nombre" | "precio" | "stock" | "";
      sortDir?: "asc" | "desc";
    };
  } | null)?.returnState;
  const volver = () =>
    navigate(returnTo || '/productos', {
      state: returnTo ? { restorePage: returnPage, restoreState: returnState } : undefined,
    });
  const volverConResaltado = (producto: Producto) =>
    navigate(returnTo || '/productos', {
      state:
        returnTo && producto.id
          ? {
              restorePage: returnPage,
              restoreState: productoAEditar
                ? returnState
                : {
                    searchTerm: producto.nombre,
                    categoriaFiltroId: "",
                    ingredientesFiltro: [],
                    estadoFiltro: "",
                    sortBy: "",
                    sortDir: "asc",
                  },
              highlightProductId: Number(producto.id),
            }
          : returnTo
            ? { restorePage: returnPage, restoreState: returnState }
            : producto.id
              ? {
                  restoreState: {
                    searchTerm: producto.nombre,
                    categoriaFiltroId: "",
                    ingredientesFiltro: [],
                    estadoFiltro: "",
                    sortBy: "",
                    sortDir: "asc",
                  },
                  highlightProductId: Number(producto.id),
                }
              : undefined,
    });

  if (!canManageCatalogo) {
    return (
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <p className="text-gray-600">No tenes permisos para gestionar productos.</p>
      </div>
    );
  }

  if (id && isLoading) {
    return (
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <p className="text-gray-600">Cargando producto...</p>
      </div>
    );
  }

  if (id && !productoAEditar) {
    return (
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <p className="text-gray-700">No se encontro el producto a editar.</p>
        <Link
          to={returnTo || '/productos'}
          state={returnTo ? { restorePage: returnPage, restoreState: returnState } : undefined}
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
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{productoAEditar ? 'Editar Producto' : 'Nuevo Producto'}</h1>
        <Link
          to={returnTo || '/productos'}
          state={returnTo ? { restorePage: returnPage, restoreState: returnState } : undefined}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Volver al listado
        </Link>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <FormularioProducto
          productoAEditar={productoAEditar}
          onCancelarEdicion={volver}
          onSuccess={volverConResaltado}
        />
      </div>
    </div>
  );
}
