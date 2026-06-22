import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/http';

type Estado = 'cargando' | 'aprobado' | 'pendiente' | 'rechazado' | 'error';

export function PagoExitoPage() {
  const [params] = useSearchParams();
  const pedidoId = params.get('external_reference');
  const paymentId = params.get('payment_id') || params.get('collection_id');
  const mpStatus = params.get('status') || params.get('collection_status');

  const [estado, setEstado] = useState<Estado>('cargando');
  const [detalleError, setDetalleError] = useState<string | null>(null);

  useEffect(() => {
    if (!pedidoId || !paymentId) {
      if (mpStatus === 'approved') {
        setEstado('aprobado');
        return;
      }
      if (mpStatus === 'pending' || mpStatus === 'in_process') {
        setEstado('pendiente');
        return;
      }
      setDetalleError(
        !paymentId
          ? 'MercadoPago no devolvio payment_id. Esto suele pasar cuando el pago no se termino o fue rechazado antes de generarse el cobro.'
          : null,
      );
      setEstado('error');
      return;
    }

    api
      .post('/pagos/confirm', {
        pedido_id: Number(pedidoId),
        payment_id: Number(paymentId),
        mp_status: mpStatus,
      })
      .then((res) => {
        const e = res.data?.estado;
        if (e === 'aprobado') setEstado('aprobado');
        else if (e === 'pendiente') setEstado('pendiente');
        else setEstado('rechazado');
      })
      .catch((err) => {
        if (mpStatus === 'approved') {
          setEstado('aprobado');
          return;
        }
        if (mpStatus === 'pending' || mpStatus === 'in_process') {
          setEstado('pendiente');
          return;
        }
        const detail = err?.response?.data?.detail;
        setDetalleError(typeof detail === 'string' ? detail : 'No se pudo confirmar el pago con MercadoPago.');
        setEstado('error');
      });
  }, [pedidoId, paymentId, mpStatus]);

  // ─── Cargando ───────────────────────────────────────────────────────────────
  if (estado === 'cargando') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-10 h-10 border-4 border-gray-800 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-600 font-medium">Confirmando tu pago...</p>
        </div>
      </div>
    );
  }

  // ─── Aprobado ───────────────────────────────────────────────────────────────
  if (estado === 'aprobado') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center space-y-5">
          <div className="flex justify-center">
            <div className="bg-green-100 rounded-full p-4">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Pago aprobado</h1>
            <p className="text-gray-500 text-sm mt-1">Tu pago fue procesado correctamente.</p>
          </div>
          {pedidoId && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 space-y-1">
              <p>Pedido <span className="font-bold">#{pedidoId}</span> confirmado.</p>
              {paymentId && <p className="text-xs text-green-600">ID de pago MP: {paymentId}</p>}
            </div>
          )}
          <p className="text-sm text-gray-500">
            Tu pedido fue confirmado y ya esta en preparacion.
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <Link
              to={pedidoId ? `/mis-pedidos/${pedidoId}` : '/mis-pedidos'}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              Ver mi pedido
            </Link>
            <Link to="/productos" className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Pendiente ──────────────────────────────────────────────────────────────
  if (estado === 'pendiente') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center space-y-5">
          <div className="flex justify-center">
            <div className="bg-amber-100 rounded-full p-4">
              <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Pago en proceso</h1>
            <p className="text-gray-500 text-sm mt-1">
              Tu pago esta siendo procesado por MercadoPago y se confirmara en breve.
            </p>
          </div>
          {pedidoId && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p>Pedido <span className="font-bold">#{pedidoId}</span> — esperando confirmacion de pago.</p>
            </div>
          )}
          <div className="flex flex-col gap-3 pt-2">
            <Link
              to={pedidoId ? `/mis-pedidos/${pedidoId}` : '/mis-pedidos'}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              Ver estado del pedido
            </Link>
            <Link to="/mis-pedidos" className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
              Mis pedidos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Rechazado / Error ───────────────────────────────────────────────────────
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
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Pago no procesado
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            MercadoPago no pudo completar el pago. Tu pedido sigue activo y podes reintentar.
          </p>
        </div>

        {pedidoId && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 space-y-1">
            <p>Pedido <span className="font-bold">#{pedidoId}</span> sigue en estado Pendiente.</p>
            {mpStatus && (
              <p className="text-xs text-red-600">Estado devuelto por MP: {mpStatus}</p>
            )}
            {paymentId && (
              <p className="text-xs text-red-600">ID de pago MP: {paymentId}</p>
            )}
            {detalleError && (
              <p className="text-xs text-red-600">{detalleError}</p>
            )}
            <p className="text-xs text-red-600 mt-1">
              Desde el detalle del pedido podes reintentar el pago con MercadoPago o cancelar el pedido.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          {pedidoId && (
            <Link
              to={`/mis-pedidos/${pedidoId}`}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              Reintentar pago — Pedido #{pedidoId}
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
