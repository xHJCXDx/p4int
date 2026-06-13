import { PedidoTable } from '../components/PedidoTable';
import { usePedidos, useTransitionEstado } from '../hooks/usePedidos';
import { useToast } from '../components/Toast';

function PedidosPageRefactored() {
  const { data: pedidos = [], isLoading } = usePedidos();
  const transitionMutation = useTransitionEstado();
  const { showToast } = useToast();

  const handleChangeEstado = async (pedidoId: number, accion: string, _motivo?: string) => {
    try {
      await transitionMutation.mutateAsync({ pedido_id: pedidoId, accion });
      showToast(`Pedido #${pedidoId}: accion "${accion}" aplicada`, 'success');
    } catch {
      showToast(`Error al cambiar estado del pedido #${pedidoId}`, 'error');
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
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
