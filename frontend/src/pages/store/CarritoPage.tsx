import { Link } from 'react-router-dom';
import { useCarritoStore } from '../../store/useCarritoStore';

export default function CarritoPage() {
  const { items: rawItems, total, removeItem, updateCantidad } = useCarritoStore();
  // Filtrar items con datos inválidos (ej: precio undefined por localStorage viejo)
  const items = rawItems.filter((item) => item.precio != null && item.nombre != null);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Tu Carrito</h1>
          <p className="text-gray-500 text-lg mb-6">El carrito está vacío</p>
          <Link
            to="/store/home"
            className="inline-block bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Continuar comprando
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Tu Carrito</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de items */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <div className="space-y-6">
              {items.map((item) => (
                <div key={item.producto_id} className="flex gap-4 pb-6 border-b border-gray-200 last:border-b-0 last:pb-0">
                  {item.imagen && (
                    <img src={item.imagen} alt={item.nombre} className="w-20 h-20 object-cover rounded-lg" />
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{item.nombre}</h3>
                    <p className="text-gray-600">${item.precio.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateCantidad(item.producto_id, item.cantidad - 1)}
                      className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={item.cantidad}
                      onChange={(e) => updateCantidad(item.producto_id, parseInt(e.target.value) || 1)}
                      className="w-16 text-center border border-gray-300 rounded px-2 py-1"
                    />
                    <button
                      onClick={() => updateCantidad(item.producto_id, item.cantidad + 1)}
                      className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(item.producto_id)}
                      className="ml-4 text-red-600 hover:text-red-700 font-medium"
                    >
                      Eliminar
                    </button>
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    ${(item.precio * item.cantidad).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-white rounded-lg shadow-md p-6 h-fit">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Resumen</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Envío:</span>
                <span className="text-green-600">Gratis</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-xl font-semibold text-gray-900">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Link
              to="/store/checkout"
              className="block w-full bg-gray-800 text-white text-center px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium mb-3"
            >
              Proceder al checkout
            </Link>
            <Link
              to="/store/home"
              className="block w-full bg-gray-200 text-gray-900 text-center px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Continuar comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
