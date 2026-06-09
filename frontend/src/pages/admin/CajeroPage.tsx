import { usePedidos, useTransitionEstado } from '../../hooks/usePedidos';
import { useAuthStore } from '../../store/useAuthStore';
import { useToast } from '../../components/Toast';

export default function CajeroPage() {
  const { data: pedidos = [], isLoading } = usePedidos();
  const { mutate: transitionEstado } = useTransitionEstado();
  const { usuario } = useAuthStore();

  const { showToast } = useToast();
  const isAdmin = usuario?.roles.some((r) => r.codigo === 'ADMIN') ?? false;
  const isPedidos = usuario?.roles.some((r) => r.codigo === 'PEDIDOS') ?? false;
  const canManageOrders = isAdmin || isPedidos;

  // Filtrar solo pedidos activos (no entregados ni cancelados)
  const pedidosActivos = pedidos.filter(
    (p: any) =>
      p.estado_codigo !== 'ENTREGADO' && p.estado_codigo !== 'CANCELADO'
  );

  const handleTransition = (pedidoId: number, accion: string) => {
    transitionEstado(
      { pedido_id: pedidoId, accion },
      {
        onSuccess: () => {
          showToast('Estado actualizado', 'success');
        },
        onError: (error: any) => {
          showToast(error.response?.data?.detail || 'No se pudo actualizar el estado', 'error');
        },
      }
    );
  };

  const getAccionesDisponibles = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return ['confirmar'];
      case 'CONFIRMADO':
        return ['preparar'];
      case 'EN_PREP':
        return ['enviar'];
      case 'EN_CAMINO':
        return ['entregar'];
      default:
        return [];
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMADO':
        return 'bg-gray-200 text-gray-800';
      case 'EN_PREP':
        return 'bg-purple-100 text-purple-800';
      case 'EN_CAMINO':
        return 'bg-indigo-100 text-indigo-800';
      case 'ENTREGADO':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccionBoton = (accion: string) => {
    const acciones: Record<string, string> = {
      confirmar: 'Confirmar',
      preparar: 'Preparar',
      enviar: 'Enviar',
      entregar: 'Entregar',
    };
    return acciones[accion] || accion;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-gray-500">Cargando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Gestion de Pedidos</h1>
          {!canManageOrders && (
            <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
              Modo vista
            </span>
          )}
        </div>

        {pedidosActivos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-500 text-lg">No hay pedidos activos</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pedidosActivos.map((pedido: any) => (
              <div key={pedido.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Pedido #{pedido.id}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(pedido.created_at).toLocaleString('es-AR')}
                    </p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${getEstadoColor(pedido.estado_codigo)}`}>
                    {pedido.estado_codigo}
                  </span>
                </div>

                {/* Detalles del pedido */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pb-4 border-b">
                  <div>
                    <p className="text-sm text-gray-600">Total:</p>
                    <p className="text-2xl font-bold text-blue-600">${pedido.total?.toFixed(2) ?? '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Forma de pago:</p>
                    <p className="text-gray-900 font-medium">{pedido.forma_pago_codigo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Productos:</p>
                    <p className="text-gray-900 font-medium">
                      {pedido.detalles ? pedido.detalles.length : 0} item(s)
                    </p>
                  </div>
                </div>

                {/* Productos */}
                {pedido.detalles && pedido.detalles.length > 0 && (
                  <div className="mb-4 pb-4 border-b">
                    <p className="text-sm font-medium text-gray-700 mb-2">Productos:</p>
                    <ul className="space-y-1">
                      {pedido.detalles.map((det: any, idx: number) => (
                        <li key={idx} className="text-sm text-gray-600 flex justify-between">
                          <span>{det.nombre_snapshot} x {det.cantidad}</span>
                          <span className="font-medium">${det.subtotal_snap?.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Acciones - ADMIN y PEDIDOS pueden transicionar estados */}
                {canManageOrders && (
                  <div className="flex flex-wrap gap-2">
                    {getAccionesDisponibles(pedido.estado_codigo).map((accion) => (
                      <button
                        key={accion}
                        onClick={() => handleTransition(pedido.id, accion)}
                        className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                      >
                        {getAccionBoton(accion)}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        const motivo = prompt('Motivo de cancelacion:');
                        if (motivo) handleTransition(pedido.id, 'cancelar');
                      }}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
