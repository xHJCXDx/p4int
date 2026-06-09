import { useParams, useNavigate } from 'react-router-dom';
import { useProducto } from '../../hooks/useProductos';
import { useCarritoStore } from '../../store/useCarritoStore';
import { useToast } from '../../components/Toast';

export default function ProductoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const productoId = Number(id);
  const { data: producto, isLoading, isError } = useProducto(productoId);
  const addItem = useCarritoStore((s) => s.addItem);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando producto...</p>
      </div>
    );
  }

  if (isError || !producto) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Producto no encontrado</h1>
          <button
            onClick={() => navigate('/store/home')}
            className="text-blue-600 hover:underline"
          >
            Volver a la tienda
          </button>
        </div>
      </div>
    );
  }

  const { showToast } = useToast();

  const handleAddToCart = () => {
    addItem({
      producto_id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio_base,
      cantidad: 1,
    });
    showToast('Producto agregado al carrito', 'success');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/store/home')}
          className="text-blue-600 hover:underline mb-6 inline-block"
        >
          ← Volver a la tienda
        </button>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{producto.nombre}</h1>

          {producto.descripcion && (
            <p className="text-gray-600 mb-6">{producto.descripcion}</p>
          )}

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-500">Precio</p>
              <p className="text-3xl font-bold text-blue-600">${producto.precio_base.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Stock disponible</p>
              <p className={`text-xl font-bold ${producto.stock_cantidad > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {producto.stock_cantidad > 0 ? `${producto.stock_cantidad} unidades` : 'Sin stock'}
              </p>
            </div>
          </div>

          {/* Categorias */}
          {producto.categorias && producto.categorias.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Categorias:</p>
              <div className="flex flex-wrap gap-2">
                {producto.categorias.map((c) => (
                  <span key={c.id} className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full">
                    {c.nombre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Ingredientes */}
          {producto.ingredientes && producto.ingredientes.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Ingredientes:</p>
              <div className="flex flex-wrap gap-2">
                {producto.ingredientes.map((i) => (
                  <span
                    key={i.id}
                    className={`text-sm px-3 py-1 rounded-full ${
                      i.es_alergeno
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {i.nombre}{i.es_alergeno ? ' (Alergeno)' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleAddToCart}
            disabled={!producto.disponible || producto.stock_cantidad === 0}
            className="w-full bg-gray-800 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {producto.disponible && producto.stock_cantidad > 0
              ? 'Agregar al carrito'
              : 'No disponible'}
          </button>
        </div>
      </div>
    </div>
  );
}
