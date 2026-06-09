import { useState, useEffect } from 'react';
import { PedidoTable } from '../components/PedidoTable';
import { usePedidos, useTransitionEstado } from '../hooks/usePedidos';

function PedidosPageRefactored() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: pedidos = [], isLoading } = usePedidos();
  const transitionMutation = useTransitionEstado();

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleChangeEstado = async (pedidoId: number, accion: string, _motivo?: string) => {
    try {
      await transitionMutation.mutateAsync({ pedido_id: pedidoId, accion });
      setSuccessMessage(`Pedido #${pedidoId}: accion "${accion}" aplicada`);
    } catch (err) {
      console.error('Error en transicion:', err);
      setError(`Error al cambiar estado del pedido #${pedidoId}`);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex justify-between items-center">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-green-700 hover:text-green-900">
            ✕
          </button>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Gestion de Pedidos</h2>
        <p className="text-gray-500 mt-1">Visualiza y gestiona el estado de los pedidos realizados</p>
      </div>

      <PedidoTable
        data={pedidos}
        onChangeEstado={handleChangeEstado}
        isLoading={isLoading}
      />
    </main>
  );
}

export default PedidosPageRefactored;
