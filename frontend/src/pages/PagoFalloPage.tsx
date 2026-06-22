import { Link, useSearchParams } from 'react-router-dom';

export function PagoFalloPage() {
  const [params] = useSearchParams();
  const pedidoId = params.get('external_reference');
  const paymentId = params.get('payment_id');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center space-y-5">
        <div className="flex justify-center">
          <div className="bg-red-100 rounded-full p-4">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Pago rechazado</h1>
          <p className="text-gray-500 text-sm mt-1">No se pudo procesar el pago.</p>
        </div>

        {(pedidoId || paymentId) && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 space-y-1">
            {pedidoId && (
              <p>
                Pedido <span className="font-bold">#{pedidoId}</span> sigue pendiente.
              </p>
            )}
            {paymentId && (
              <p className="text-xs text-red-600">ID de pago MP: {paymentId}</p>
            )}
          </div>
        )}

        <p className="text-sm text-gray-500">
          Podes intentar nuevamente con otro metodo de pago o revisar los datos de tu tarjeta.
          El pedido sigue activo en tu historial.
        </p>

        <div className="flex flex-col gap-3 pt-2">
          {pedidoId && (
            <Link
              to={`/mis-pedidos/${pedidoId}`}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              Reintentar pago del pedido #{pedidoId}
            </Link>
          )}
          <Link
            to="/mis-pedidos"
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Ver mis pedidos
          </Link>
        </div>
      </div>
    </div>
  );
}
