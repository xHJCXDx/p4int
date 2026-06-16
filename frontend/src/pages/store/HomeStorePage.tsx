import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCategorias } from '../../hooks/useCategorias';
import { useProductos } from '../../hooks/useProductos';
import { useCarritoStore } from '../../store/useCarritoStore';
import { useToast } from '../../components/Toast';
import { Producto, CategoriaInProducto, IngredienteInProducto } from '../../types/producto';
import { Categoria } from '../../types/categoria';

export default function HomeStorePage() {
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<number | undefined>(undefined);
  const [busqueda, setBusqueda] = useState('');
  const { data: categorias = [] } = useCategorias();
  const { data: productos = [] } = useProductos({
    categoria: selectedCategoriaId,
    disponible: true,
    search: busqueda || undefined,
  });

  const addItem = useCarritoStore((state) => state.addItem);
  const { showToast } = useToast();

  const handleAddToCarrito = (producto: Producto) => {
    addItem({
      producto_id: producto.id,
      nombre: producto.nombre,
      precio_base: Number(producto.precio_base),
      cantidad: 1,
      imagen: producto.imagenes_url?.[0],
    });
    showToast(`${producto.nombre} agregado al carrito`, 'success');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Tienda</h1>

        {/* Búsqueda */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          />
        </div>

        {/* Filtro por categoría */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Categorías</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategoriaId(undefined)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategoriaId === undefined
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Todas
            </button>
            {categorias.map((cat: Categoria) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoriaId(cat.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategoriaId === cat.id
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* Grilla de productos */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {productos.map((producto) => (
            <div key={producto.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
              {producto.imagenes_url?.[0] && (
                <img src={producto.imagenes_url[0]} alt={producto.nombre} className="w-full h-48 object-cover" />
              )}
              <div className="p-4 flex flex-col flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{producto.nombre}</h3>

                {producto.categorias?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {producto.categorias.map((cat: CategoriaInProducto) => (
                      <span key={cat.id} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {cat.nombre}
                      </span>
                    ))}
                  </div>
                )}

                {producto.descripcion && (
                  <p className="text-sm text-gray-600 mb-2">{producto.descripcion}</p>
                )}

                {producto.ingredientes?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 font-semibold mb-1">Ingredientes:</p>
                    <div className="flex flex-wrap gap-1">
                      {producto.ingredientes.map((ing: IngredienteInProducto) => (
                        <span
                          key={ing.id}
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            ing.es_alergeno
                              ? 'bg-yellow-100 text-yellow-800 font-semibold'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {ing.nombre}
                          {ing.es_alergeno && ' ⚠'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-3 border-t border-gray-100">
                  <p className="text-2xl font-bold text-blue-600 mb-3">${Number(producto.precio_base).toFixed(2)}</p>
                  <div className="flex gap-2">
                    <Link
                      to={`/store/producto/${producto.id}`}
                      className="flex-1 text-center text-blue-600 border border-blue-600 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                    >
                      Ver detalle
                    </Link>
                    <button
                      onClick={() => handleAddToCarrito(producto)}
                      disabled={!producto.disponible || producto.stock_cantidad === 0}
                      className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {productos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No se encontraron productos</p>
          </div>
        )}
      </div>
    </div>
  );
}
