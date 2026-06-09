import { useForm } from '@tanstack/react-form';
import { Categoria } from '../types/categoria';
import { categoriaFormSchema } from '../schemas/categoria.schema';
import { useCategorias } from '../hooks/useCategorias';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (categoria: Omit<Categoria, 'id'>) => void;
  categoriaInitial?: Categoria | null;
}

const CategoriaModal = ({ isOpen, onClose, onSubmit, categoriaInitial }: Props) => {
  const { data: categorias = [] } = useCategorias();

  const form = useForm({
    defaultValues: {
      nombre: categoriaInitial?.nombre || '',
      descripcion: categoriaInitial?.descripcion || '',
      parent_id: categoriaInitial?.parent_id ?? null,
    },
    onSubmit: async ({ value }) => {
      const validated = categoriaFormSchema.parse(value);
      onSubmit(validated as Omit<Categoria, 'id'>);
      onClose();
    },
  });

  if (!isOpen) return null;

  const parentOptions = categorias.filter((c) => c.id !== categoriaInitial?.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full lg:w-[80vw] lg:max-w-[80vw] max-h-[90vh] overflow-y-auto">
        <div className="bg-gray-800 text-white p-6 rounded-t-lg">
          <h3 className="text-xl font-bold">
            {categoriaInitial ? 'Editar Categoría' : 'Nueva Categoría'}
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
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nombre">
                  Nombre
                </label>
                <input
                  id="nombre"
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
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="descripcion">
                  Descripción
                </label>
                <textarea
                  id="descripcion"
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

          <form.Field name="parent_id">
            {(field) => (
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Categoría Padre (opcional)
                </label>
                <select
                  value={field.state.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.handleChange(val ? parseInt(val) : null);
                  }}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="">Sin categoría padre</option>
                  {parentOptions.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
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

export default CategoriaModal;
