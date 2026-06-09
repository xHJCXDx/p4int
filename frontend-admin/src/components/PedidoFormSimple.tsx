import { useState } from 'react';
import { Pedido } from '../types/pedido';

interface PedidoFormSimpleProps {
  onSubmit: (data: Omit<Pedido, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>) => Promise<void>;
  onCancel: () => void;
  initialData?: Pedido;
  isLoading?: boolean;
}

export function PedidoFormSimple({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: PedidoFormSimpleProps) {
  const [formData, setFormData] = useState<Omit<Pedido, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>({
    usuario_id: initialData?.usuario_id || 1,
    direccion_id: initialData?.direccion_id,
    estado_codigo: initialData?.estado_codigo || 'PENDIENTE',
    forma_pago_codigo: initialData?.forma_pago_codigo || 'MERCADOPAGO',
    subtotal: initialData?.subtotal || 0,
    descuento: initialData?.descuento || 0,
    costo_envio: initialData?.costo_envio || 50,
    total: initialData?.total || 0,
    notas: initialData?.notas || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.usuario_id || formData.usuario_id < 1) {
      newErrors.usuario_id = 'Usuario requerido';
    }
    if (!formData.subtotal || formData.subtotal < 0.01) {
      newErrors.subtotal = 'Subtotal debe ser mayor a 0';
    }
    if (!formData.total || formData.total < 0.01) {
      newErrors.total = 'Total debe ser mayor a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleNumberChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: parseFloat(value) || 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Usuario ID */}
      <div>
        <label className="block text-gray-700 font-bold mb-2">Usuario ID *</label>
        <input
          type="number"
          value={formData.usuario_id}
          onChange={(e) => handleNumberChange('usuario_id', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            errors.usuario_id ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-500'
          }`}
        />
        {errors.usuario_id && <p className="text-red-600 text-sm mt-1">{errors.usuario_id}</p>}
      </div>

      {/* Subtotal */}
      <div>
        <label className="block text-gray-700 font-bold mb-2">Subtotal *</label>
        <input
          type="number"
          step="0.01"
          value={formData.subtotal}
          onChange={(e) => handleNumberChange('subtotal', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            errors.subtotal ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-500'
          }`}
        />
        {errors.subtotal && <p className="text-red-600 text-sm mt-1">{errors.subtotal}</p>}
      </div>

      {/* Descuento */}
      <div>
        <label className="block text-gray-700 font-bold mb-2">Descuento</label>
        <input
          type="number"
          step="0.01"
          value={formData.descuento}
          onChange={(e) => handleNumberChange('descuento', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
        />
      </div>

      {/* Costo Envío */}
      <div>
        <label className="block text-gray-700 font-bold mb-2">Costo Envío</label>
        <input
          type="number"
          step="0.01"
          value={formData.costo_envio}
          onChange={(e) => handleNumberChange('costo_envio', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
        />
      </div>

      {/* Total */}
      <div>
        <label className="block text-gray-700 font-bold mb-2">Total *</label>
        <input
          type="number"
          step="0.01"
          value={formData.total}
          onChange={(e) => handleNumberChange('total', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            errors.total ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-500'
          }`}
        />
        {errors.total && <p className="text-red-600 text-sm mt-1">{errors.total}</p>}
      </div>

      {/* Notas */}
      <div>
        <label className="block text-gray-700 font-bold mb-2">Notas</label>
        <textarea
          value={formData.notas}
          onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
          rows={2}
          placeholder="Notas adicionales..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
        />
      </div>

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
