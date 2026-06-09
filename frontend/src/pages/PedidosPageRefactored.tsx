import { useState } from 'react';
import { Pedido } from '../types/pedido';
import { PedidoFormSimple } from '../components/PedidoFormSimple';
import { PedidoTable } from '../components/PedidoTable';
import {
  usePedidos,
  useCreatePedido,
  useUpdatePedido,
  useDeletePedido,
} from '../hooks/usePedidos';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

function PedidosPageRefactored() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: pedidos = [], isLoading } = usePedidos();
  const createMutation = useCreatePedido();
  const updateMutation = useUpdatePedido();
  const deleteMutation = useDeletePedido();
  const confirmDialog = useConfirm();
  const { showToast } = useToast();

  const handleFormSubmit = async (data: Omit<Pedido, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
    try {
      if (selectedPedido && selectedPedido.id) {
        await updateMutation.mutateAsync({
          id: selectedPedido.id,
          data,
        });
        showToast('Pedido actualizado', 'success');
      } else {
        await createMutation.mutateAsync(data);
        showToast('Pedido creado', 'success');
      }
      setIsModalOpen(false);
      setSelectedPedido(null);
    } catch (err) {
      console.error('Error:', err);
      showToast(`Error al ${selectedPedido ? 'actualizar' : 'crear'} el pedido`, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({ message: '¿Estas seguro de eliminar este pedido?' });
    if (!ok) return;

    try {
      await deleteMutation.mutateAsync(id);
      showToast('Pedido eliminado', 'success');
    } catch (err) {
      console.error('Error deleting:', err);
      showToast('Error al eliminar el pedido', 'error');
    }
  };

  const openCreateModal = () => {
    setSelectedPedido(null);
    setIsModalOpen(true);
  };

  const openEditModal = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setIsModalOpen(true);
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

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Pedidos</h2>
        <button
          onClick={openCreateModal}
          className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg"
        >
          + Nuevo Pedido
        </button>
      </div>

      {/* Tabla */}
      <PedidoTable
        data={pedidos}
        onEdit={openEditModal}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full lg:w-[80vw] lg:max-w-[80vw] max-h-[90vh] overflow-y-auto">
            <div className="bg-gray-800 text-white p-6 rounded-t-lg">
              <h3 className="text-xl font-bold">
                {selectedPedido ? 'Editar Pedido' : 'Nuevo Pedido'}
              </h3>
            </div>
            <div className="p-6">
              <PedidoFormSimple
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  setIsModalOpen(false);
                  setSelectedPedido(null);
                }}
                initialData={selectedPedido || undefined}
                isLoading={createMutation.isPending || updateMutation.isPending}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default PedidosPageRefactored;
