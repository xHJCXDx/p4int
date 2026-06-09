import { usePedidos } from '../../hooks/usePedidos';

export default function MisPedidosPage() {
  const { data: pedidos = [], isLoading } = usePedidos();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-gray-500">Cargando pedidos...</p>
        </div>
      </div>
    );
  }

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
      case 'CANCELADO':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Mis Pedidos</h1>

        {pedidos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No tienes pedidos</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pedidos.map((pedido: any) => (
              <div key={pedido.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Pedido #{pedido.id}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(pedido.created_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoColor(pedido.estado_codigo)}`}>
                    {pedido.estado_codigo}
                  </span>
                </div>

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

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Total:</p>
                    <p className="text-2xl font-bold text-blue-600">${pedido.total?.toFixed(2) ?? '0.00'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Forma de pago:</p>
                    <p className="text-gray-900 font-medium">{pedido.forma_pago_codigo}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
