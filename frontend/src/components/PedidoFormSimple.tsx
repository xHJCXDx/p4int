import { useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { Pedido } from '../types/pedido';
import { pedidoFormSchema } from '../schemas/pedido.schema';

interface PedidoFormSimpleProps {
  onSubmit: (data: Omit<Pedido, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>) => Promise<void>;
  onCancel: () => void;
  initialData?: Pedido;
  isLoading?: boolean;
}

function getDefaults(p?: Pedido) {
  return {
    usuario_id: p?.usuario_id || 1,
    direccion_id: p?.direccion_id ?? null,
    estado_codigo: p?.estado_codigo || 'PENDIENTE',
    forma_pago_codigo: p?.forma_pago_codigo || 'MERCADOPAGO',
    subtotal: p?.subtotal || 0,
    descuento: p?.descuento || 0,
    costo_envio: p?.costo_envio || 50,
    total: p?.total || 0,
    notas: p?.notas || '',
  };
}

export function PedidoFormSimple({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: PedidoFormSimpleProps) {
  const form = useForm({
    defaultValues: getDefaults(initialData),
    onSubmit: async ({ value }) => {
      const validated = pedidoFormSchema.parse(value);
      await onSubmit(validated as Omit<Pedido, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>);
    },
  });

  useEffect(() => {
    form.reset(getDefaults(initialData));
  }, [initialData]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.Field name="usuario_id">
        {(field) => (
          <div>
            <label className="block text-gray-700 font-bold mb-2">Usuario ID *</label>
            <input
              type="number"
              value={field.state.value}
              onChange={(e) => field.handleChange(parseFloat(e.target.value) || 0)}
              onBlur={field.handleBlur}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                field.state.meta.errors.length ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-500'
              }`}
            />
            {field.state.meta.errors.map((error, idx) => (
              <p key={idx} className="text-red-600 text-sm mt-1">{error}</p>
            ))}
          </div>
        )}
      </form.Field>

      <form.Field name="subtotal">
        {(field) => (
          <div>
            <label className="block text-gray-700 font-bold mb-2">Subtotal *</label>
            <input
              type="number"
              step="0.01"
              value={field.state.value}
              onChange={(e) => field.handleChange(parseFloat(e.target.value) || 0)}
              onBlur={field.handleBlur}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                field.state.meta.errors.length ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-500'
              }`}
            />
            {field.state.meta.errors.map((error, idx) => (
              <p key={idx} className="text-red-600 text-sm mt-1">{error}</p>
            ))}
          </div>
        )}
      </form.Field>

      <form.Field name="descuento">
        {(field) => (
          <div>
            <label className="block text-gray-700 font-bold mb-2">Descuento</label>
            <input
              type="number"
              step="0.01"
              value={field.state.value}
              onChange={(e) => field.handleChange(parseFloat(e.target.value) || 0)}
              onBlur={field.handleBlur}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
        )}
      </form.Field>

      <form.Field name="costo_envio">
        {(field) => (
          <div>
            <label className="block text-gray-700 font-bold mb-2">Costo Envio</label>
            <input
              type="number"
              step="0.01"
              value={field.state.value}
              onChange={(e) => field.handleChange(parseFloat(e.target.value) || 0)}
              onBlur={field.handleBlur}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
        )}
      </form.Field>

      <form.Field name="total">
        {(field) => (
          <div>
            <label className="block text-gray-700 font-bold mb-2">Total *</label>
            <input
              type="number"
              step="0.01"
              value={field.state.value}
              onChange={(e) => field.handleChange(parseFloat(e.target.value) || 0)}
              onBlur={field.handleBlur}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                field.state.meta.errors.length ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-500'
              }`}
            />
            {field.state.meta.errors.map((error, idx) => (
              <p key={idx} className="text-red-600 text-sm mt-1">{error}</p>
            ))}
          </div>
        )}
      </form.Field>

      <form.Field name="notas">
        {(field) => (
          <div>
            <label className="block text-gray-700 font-bold mb-2">Notas</label>
            <textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              rows={2}
              placeholder="Notas adicionales..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
        )}
      </form.Field>

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
