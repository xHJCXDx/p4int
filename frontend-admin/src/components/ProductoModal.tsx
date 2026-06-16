import { useEffect, useRef } from 'react';
import { useForm } from '@tanstack/react-form';
import { Producto, IngredienteEnReceta } from '../types/producto';
import { productoFormSchema, ProductoFormType } from '../schemas/producto.schema';
import { useCategorias } from '../hooks/useCategorias';
import { useIngredientes } from '../hooks/useIngredientes';
import { useUploadImagen } from '../hooks/useUpload';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (producto: ProductoFormType) => void;
  productoInitial?: Producto | null;
}

function getDefaults(p?: Producto | null): {
  nombre: string;
  descripcion: string;
  precio_base: number;
  imagenes_url: string[];
  categoria_ids: number[];
  ingredientes: IngredienteEnReceta[];
} {
  return {
    nombre: p?.nombre || '',
    descripcion: p?.descripcion || '',
    precio_base: p?.precio_base || 0,
    imagenes_url: p?.imagenes_url || [],
    categoria_ids: p?.categorias?.map((c) => c.id) || [],
    ingredientes:
      p?.ingredientes?.map((i) => ({
        ingrediente_id: i.id,
        cantidad: i.cantidad,
        es_removible: i.es_removible,
        unidad_medida_id: i.unidad_medida_id,
      })) || [],
  };
}

const ProductoModal = ({ isOpen, onClose, onSubmit, productoInitial }: Props) => {
  const { data: categorias = [] } = useCategorias();
  const { data: ingredientes = [] } = useIngredientes();
  const { mutate: uploadImagen, isPending: isUploading } = useUploadImagen();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: getDefaults(productoInitial),
    onSubmit: async ({ value }) => {
      const validated = productoFormSchema.parse(value);
      onSubmit(validated);
      onClose();
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(getDefaults(productoInitial));
    }
  }, [isOpen, productoInitial]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full lg:w-[80vw] lg:max-w-[80vw] max-h-[90vh] overflow-y-auto">
        <div className="bg-gray-800 text-white p-6 rounded-t-lg">
          <h3 className="text-xl font-bold">
            {productoInitial ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
        </div>
        <div className="p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field name="nombre">
            {(field) => (
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Nombre</label>
                <input
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
                {field.state.meta.errors.map((error, idx) => (
                  <p key={idx} className="text-red-500 text-xs mt-1">{error}</p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="descripcion">
            {(field) => (
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Descripcion</label>
                <textarea
                  rows={3}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
                {field.state.meta.errors.map((error, idx) => (
                  <p key={idx} className="text-red-500 text-xs mt-1">{error}</p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="precio_base">
            {(field) => (
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Precio Base</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(parseFloat(e.target.value) || 0)}
                  onBlur={field.handleBlur}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
                {field.state.meta.errors.map((error, idx) => (
                  <p key={idx} className="text-red-500 text-xs mt-1">{error}</p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="imagenes_url">
            {(field) => (
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Imagenes</label>

                {/* Preview de imagenes actuales */}
                {field.state.value.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {field.state.value.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt={`Imagen ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => field.handleChange(field.state.value.filter((_, i) => i !== idx))}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Boton de upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    uploadImagen(file, {
                      onSuccess: (url) => {
                        field.handleChange([...field.state.value, url]);
                      },
                    });
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded border transition-colors disabled:opacity-50"
                >
                  {isUploading ? 'Subiendo...' : '+ Subir imagen'}
                </button>
              </div>
            )}
          </form.Field>

          <form.Field name="categoria_ids">
            {(field) => (
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Categorias</label>
                <div className="border rounded p-3 max-h-40 overflow-y-auto bg-gray-50">
                  {categorias.length === 0 ? (
                    <p className="text-gray-400 text-sm">No hay categorias disponibles</p>
                  ) : (
                    categorias.map((cat) => (
                      <label key={cat.id} className="flex items-center mb-1 text-sm">
                        <input
                          type="checkbox"
                          checked={field.state.value.includes(cat.id!)}
                          onChange={(e) => {
                            const current = field.state.value;
                            if (e.target.checked) {
                              field.handleChange([...current, cat.id!]);
                            } else {
                              field.handleChange(current.filter((id) => id !== cat.id));
                            }
                          }}
                          className="mr-2"
                        />
                        {cat.nombre}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </form.Field>

          {/* Ingredientes con cantidad (receta) */}
          <form.Field name="ingredientes">
            {(field) => {
              const receta = field.state.value;

              const addIngrediente = (ingId: number) => {
                if (receta.some((r) => r.ingrediente_id === ingId)) return;
                const ing = ingredientes.find((i) => i.id === ingId);
                field.handleChange([
                  ...receta,
                  { ingrediente_id: ingId, cantidad: 1, es_removible: false, unidad_medida_id: ing?.unidad_medida_id ?? 1 },
                ]);
              };

              const removeIngrediente = (ingId: number) => {
                field.handleChange(receta.filter((r) => r.ingrediente_id !== ingId));
              };

              const updateCantidad = (ingId: number, cantidad: number) => {
                field.handleChange(
                  receta.map((r) =>
                    r.ingrediente_id === ingId ? { ...r, cantidad: Math.max(0.001, cantidad) } : r
                  )
                );
              };

              const toggleRemovible = (ingId: number) => {
                field.handleChange(
                  receta.map((r) =>
                    r.ingrediente_id === ingId ? { ...r, es_removible: !r.es_removible } : r
                  )
                );
              };

              const ingredientesDisponibles = ingredientes.filter(
                (ing) => !receta.some((r) => r.ingrediente_id === ing.id)
              );

              return (
                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Receta (ingredientes)
                  </label>

                  {/* Lista de ingredientes en la receta */}
                  {receta.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {receta.map((item) => {
                        const ing = ingredientes.find((i) => i.id === item.ingrediente_id);
                        if (!ing) return null;
                        return (
                          <div
                            key={item.ingrediente_id}
                            className="flex items-center gap-2 bg-gray-50 border rounded p-2"
                          >
                            <span className="flex-1 text-sm font-medium">
                              {ing.nombre}
                              {ing.es_alergeno && (
                                <span className="ml-1 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full">
                                  Alergeno
                                </span>
                              )}
                              <span className="ml-1 text-xs text-gray-400">
                                (stock: {ing.stock_cantidad})
                              </span>
                            </span>
                            <input
                              type="number"
                              min="0.001"
                              step="0.001"
                              value={item.cantidad}
                              onChange={(e) =>
                                updateCantidad(item.ingrediente_id, parseFloat(e.target.value) || 0.001)
                              }
                              className="w-20 text-center border rounded py-1 px-2 text-sm"
                              title="Cantidad necesaria"
                            />
                            <label className="flex items-center text-xs gap-1" title="Removible por el cliente">
                              <input
                                type="checkbox"
                                checked={item.es_removible}
                                onChange={() => toggleRemovible(item.ingrediente_id)}
                              />
                              Removible
                            </label>
                            <button
                              type="button"
                              onClick={() => removeIngrediente(item.ingrediente_id)}
                              className="text-red-500 hover:text-red-700 text-sm font-bold px-1"
                              title="Quitar ingrediente"
                            >
                              X
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Selector para agregar ingredientes */}
                  {ingredientesDisponibles.length > 0 && (
                    <select
                      onChange={(e) => {
                        const id = parseInt(e.target.value);
                        if (id) addIngrediente(id);
                        e.target.value = '';
                      }}
                      defaultValue=""
                      className="w-full border rounded py-2 px-3 text-sm text-gray-700 bg-white"
                    >
                      <option value="" disabled>
                        + Agregar ingrediente...
                      </option>
                      {ingredientesDisponibles.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.nombre} {ing.es_alergeno ? '(alergeno)' : ''} — stock: {ing.stock_cantidad}
                        </option>
                      ))}
                    </select>
                  )}

                  {receta.length === 0 && (
                    <p className="text-gray-400 text-xs mt-1">
                      Sin ingredientes. El producto no tendra stock calculado.
                    </p>
                  )}
                </div>
              );
            }}
          </form.Field>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
            >
              Guardar
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default ProductoModal;
