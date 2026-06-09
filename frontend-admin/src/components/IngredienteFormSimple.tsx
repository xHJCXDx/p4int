import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Ingrediente } from '../types/ingrediente';
import { ingredienteFormSchema } from '../schemas/ingrediente.schema';
import { useUnidadesMedida, useCreateUnidadMedida, useDeleteUnidadMedida } from '../hooks/useIngredientes';
import { useConfirm } from './ConfirmDialog';
import { useToast } from './Toast';

interface IngredienteFormSimpleProps {
  onSubmit: (data: Omit<Ingrediente, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
  initialData?: Ingrediente;
  isLoading?: boolean;
}

export function IngredienteFormSimple({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: IngredienteFormSimpleProps) {
  const { data: unidades = [] } = useUnidadesMedida();
  const createUnidad = useCreateUnidadMedida();
  const deleteUnidad = useDeleteUnidadMedida();
  const confirmDialog = useConfirm();
  const { showToast } = useToast();
  const [showNewUnidad, setShowNewUnidad] = useState(false);
  const [newCodigo, setNewCodigo] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [unidadError, setUnidadError] = useState('');

  const form = useForm({
    defaultValues: {
      nombre: initialData?.nombre || '',
      descripcion: initialData?.descripcion || '',
      es_alergeno: initialData?.es_alergeno || false,
      stock_cantidad: initialData?.stock_cantidad || 0,
      unidad_medida_codigo: initialData?.unidad_medida_codigo || 'u',
    },
    onSubmit: async ({ value }) => {
      const validated = ingredienteFormSchema.parse(value);
      await onSubmit(validated as Omit<Ingrediente, 'id' | 'created_at' | 'updated_at'>);
    },
  });

  const handleCreateUnidad = async () => {
    setUnidadError('');
    if (!newCodigo.trim() || !newNombre.trim()) {
      setUnidadError('Codigo y nombre son requeridos');
      return;
    }
    try {
      await createUnidad.mutateAsync({ codigo: newCodigo.trim().toLowerCase(), nombre: newNombre.trim() });
      form.setFieldValue('unidad_medida_codigo', newCodigo.trim().toLowerCase());
      setShowNewUnidad(false);
      setNewCodigo('');
      setNewNombre('');
    } catch (err: any) {
      setUnidadError(err.response?.data?.message || 'Error al crear unidad');
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      {/* Nombre */}
      <form.Field name="nombre">
        {(field) => (
          <div>
            <label className="block text-gray-700 font-bold mb-2">Nombre *</label>
            <input
              type="text"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="Ej: Pollo, Leche, Cacahuetes"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                field.state.meta.errors.length > 0 ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-500'
              }`}
            />
            {field.state.meta.errors.map((error, idx) => (
              <p key={idx} className="text-red-600 text-sm mt-1">{error}</p>
            ))}
          </div>
        )}
      </form.Field>

      {/* Descripcion */}
      <form.Field name="descripcion">
        {(field) => (
          <div>
            <label className="block text-gray-700 font-bold mb-2">Descripcion</label>
            <textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="Descripcion del ingrediente"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
        )}
      </form.Field>

      {/* Stock + Unidad de medida en la misma fila */}
      <div className="grid grid-cols-2 gap-4">
        <form.Field name="stock_cantidad">
          {(field) => (
            <div>
              <label className="block text-gray-700 font-bold mb-2">Stock *</label>
              <input
                type="number"
                min="0"
                value={field.state.value}
                onChange={(e) => field.handleChange(parseInt(e.target.value) || 0)}
                onBlur={field.handleBlur}
                placeholder="Ej: 100"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  field.state.meta.errors.length > 0 ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-500'
                }`}
              />
              {field.state.meta.errors.map((error, idx) => (
                <p key={idx} className="text-red-600 text-sm mt-1">{error}</p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Field name="unidad_medida_codigo">
          {(field) => (
            <div>
              <label className="block text-gray-700 font-bold mb-2">Unidad de medida *</label>
              <div className="flex gap-2">
                <select
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  {unidades.map((u) => (
                    <option key={u.codigo} value={u.codigo}>
                      {u.nombre} ({u.codigo})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={async () => {
                    if (!field.state.value) return;
                    const ok = await confirmDialog({ message: `¿Eliminar la unidad "${field.state.value}"?` });
                    if (!ok) return;
                    deleteUnidad.mutate(field.state.value, {
                      onSuccess: () => {
                        field.handleChange('u');
                        showToast('Unidad eliminada', 'success');
                      },
                      onError: (err: any) => showToast(err.response?.data?.message || 'No se pudo eliminar la unidad', 'error'),
                    });
                  }}
                  className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                  title="Eliminar unidad seleccionada"
                >
                  x
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewUnidad(!showNewUnidad)}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
                  title="Agregar nueva unidad"
                >
                  +
                </button>
              </div>
              {unidadError && (
                <p className="text-red-600 text-sm mt-1">{unidadError}</p>
              )}
            </div>
          )}
        </form.Field>
      </div>

      {/* Form para crear nueva unidad */}
      {showNewUnidad && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-bold text-gray-700">Nueva unidad de medida</p>
          {unidadError && (
            <p className="text-red-600 text-sm">{unidadError}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Codigo (abreviatura)</label>
              <input
                type="text"
                value={newCodigo}
                onChange={(e) => setNewCodigo(e.target.value)}
                placeholder="Ej: mg"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Nombre</label>
              <input
                type="text"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                placeholder="Ej: Miligramos"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateUnidad}
              disabled={createUnidad.isPending}
              className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-1.5 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {createUnidad.isPending ? 'Creando...' : 'Crear'}
            </button>
            <button
              type="button"
              onClick={() => { setShowNewUnidad(false); setUnidadError(''); }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium py-1.5 px-4 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Es Alergeno */}
      <form.Field name="es_alergeno">
        {(field) => (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={field.state.value}
              onChange={(e) => field.handleChange(e.target.checked)}
              onBlur={field.handleBlur}
              className="rounded focus:ring-2 focus:ring-gray-500"
            />
            <label className="ml-2 text-gray-700 font-bold">Marcar como alergeno</label>
          </div>
        )}
      </form.Field>

      {/* Botones */}
      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className={`flex-1 font-bold py-2 px-4 rounded-lg transition-colors ${
            isLoading ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-700 text-white'
          }`}
        >
          {isLoading ? 'Guardando...' : initialData ? 'Actualizar' : 'Crear'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
