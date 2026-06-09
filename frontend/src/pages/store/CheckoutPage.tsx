import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDirecciones } from '../../hooks/useDirecciones';
import { useCreatePedido } from '../../hooks/usePedidos';
import { useCarritoStore } from '../../store/useCarritoStore';
import { useToast } from '../../components/Toast';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total, clearCarrito } = useCarritoStore();
  const { data: direcciones = [] } = useDirecciones();
  const { mutate: crearPedido, isPending } = useCreatePedido();

  const [selectedDireccionId, setSelectedDireccionId] = useState<number | null>(null);
  const [formaPago, setFormaPago] = useState('EFECTIVO');
  const { showToast } = useToast();

  useEffect(() => {
    if (direcciones.length > 0 && selectedDireccionId === null) {
      const principal = direcciones.find((d: any) => d.es_principal);
      setSelectedDireccionId(principal?.id ?? direcciones[0].id);
    }
  }, [direcciones, selectedDireccionId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDireccionId) {
      showToast('Selecciona una direccion de entrega', 'error');
      return;
    }

    const lineaVentas = items.map((item) => ({
      producto_id: item.producto_id,
      cantidad: item.cantidad,
    }));

    crearPedido({
      direccion_id: selectedDireccionId,
      forma_pago_codigo: formaPago,
      linea_ventas: lineaVentas,
    } as any,
      {
        onSuccess: () => {
          clearCarrito();
          showToast('Pedido creado exitosamente', 'success');
          navigate('/store/mis-pedidos');
        },
        onError: (error: any) => {
          showToast(error.response?.data?.detail || 'No se pudo crear el pedido', 'error');
        },
      }
    );
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Checkout</h1>
          <p className="text-gray-500 text-lg">El carrito está vacío</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Checkout</h1>

        <form onSubmit={handleSubmit}>
          {/* Resumen del pedido */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Resumen del pedido</h2>
            <div className="space-y-2 mb-4">
              {items.map((item) => (
                <div key={item.producto_id} className="flex justify-between">
                  <span>{item.nombre} x {item.cantidad}</span>
                  <span>${(item.precio * item.cantidad).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Dirección de entrega */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Dirección de entrega</h2>
            {direcciones.length === 0 ? (
              <p className="text-gray-600">No tienes direcciones guardadas. Por favor crea una en tu perfil.</p>
            ) : (
              <div className="space-y-3">
                {direcciones.map((dir: any) => (
                  <label key={dir.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="direccion"
                      value={dir.id}
                      checked={selectedDireccionId === dir.id}
                      onChange={(e) => setSelectedDireccionId(parseInt(e.target.value))}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {dir.alias}
                        {dir.es_principal && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Principal</span>}
                      </p>
                      <p className="text-sm text-gray-600">{dir.linea1}{dir.linea2 ? `, ${dir.linea2}` : ''}</p>
                      <p className="text-sm text-gray-600">{dir.ciudad}, {dir.provincia} {dir.codigo_postal}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Forma de pago */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Forma de pago</h2>
            <div className="space-y-3">
              {['EFECTIVO', 'MERCADOPAGO', 'TRANSFERENCIA'].map((forma) => (
                <label key={forma} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="forma_pago"
                    value={forma}
                    checked={formaPago === forma}
                    onChange={(e) => setFormaPago(e.target.value)}
                  />
                  <span className="text-gray-900 font-medium">{forma}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/store/carrito')}
              className="flex-1 bg-gray-200 text-gray-900 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Volver al carrito
            </button>
            <button
              type="submit"
              disabled={isPending || !selectedDireccionId}
              className="flex-1 bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Creando pedido...' : 'Crear pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
