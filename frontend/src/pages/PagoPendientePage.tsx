import { Link, useSearchParams } from 'react-router-dom';

export function PagoPendientePage() {
  const [params] = useSearchParams();
  const pedidoId = params.get('external_reference');
  const paymentId = params.get('payment_id');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center space-y-5">
        <div className="flex justify-center">
          <div className="bg-amber-100 rounded-full p-4">
            <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Pago pendiente</h1>
          <p className="text-gray-500 text-sm mt-1">Tu pago esta siendo procesado.</p>
        </div>

        {(pedidoId || paymentId) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-1">
            {pedidoId && (
              <p>
                Pedido <span className="font-bold">#{pedidoId}</span> en espera de confirmacion.
              </p>
            )}
            {paymentId && (
              <p className="text-xs text-amber-600">ID de pago MP: {paymentId}</p>
            )}
          </div>
        )}

        <p className="text-sm text-gray-500">
          Algunos metodos de pago pueden demorar en acreditarse. Te notificaremos cuando el pago sea confirmado
          y tu pedido pase a preparacion.
        </p>

        <div className="flex flex-col gap-3 pt-2">
          <Link
            to="/mis-pedidos"
            className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            Ver mis pedidos
          </Link>
          <Link
            to="/productos"
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Seguir comprando
          </Link>
        </div>
      </div>
    </div>
  );
}
