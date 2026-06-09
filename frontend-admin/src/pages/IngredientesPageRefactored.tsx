import { useState } from 'react';
import { Ingrediente } from '../types/ingrediente';
import { IngredienteFormSimple } from '../components/IngredienteFormSimple';
import { IngredienteTable } from '../components/IngredienteTable';
import {
  useIngredientes,
  useCreateIngrediente,
  useUpdateIngrediente,
  useDeleteIngrediente,
} from '../hooks/useIngredientes';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { useAuthStore } from '../store/useAuthStore';

function IngredientesPageRefactored() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIngrediente, setSelectedIngrediente] = useState<Ingrediente | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { usuario } = useAuthStore();
  const isAdmin = usuario?.roles.some((r) => r.codigo === 'ADMIN') ?? false;

  const { data: ingredientes = [], isLoading } = useIngredientes();
  const createMutation = useCreateIngrediente();
  const updateMutation = useUpdateIngrediente();
  const deleteMutation = useDeleteIngrediente();
  const confirmDialog = useConfirm();
  const { showToast } = useToast();

  const handleFormSubmit = async (data: Omit<Ingrediente, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (selectedIngrediente && selectedIngrediente.id) {
        await updateMutation.mutateAsync({
          id: selectedIngrediente.id,
          data,
        });
        showToast('Ingrediente actualizado', 'success');
      } else {
        await createMutation.mutateAsync(data);
        showToast('Ingrediente creado', 'success');
      }
      setIsModalOpen(false);
      setSelectedIngrediente(null);
    } catch (err) {
      console.error('Error:', err);
      showToast(`Error al ${selectedIngrediente ? 'actualizar' : 'crear'} el ingrediente`, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({ message: '¿Estas seguro de eliminar este ingrediente?' });
    if (!ok) return;

    try {
      await deleteMutation.mutateAsync(id);
      showToast('Ingrediente eliminado', 'success');
    } catch (err) {
      console.error('Error deleting:', err);
      showToast('Error al eliminar el ingrediente', 'error');
    }
  };

  const openCreateModal = () => {
    setSelectedIngrediente(null);
    setIsModalOpen(true);
  };

  const openEditModal = (ingrediente: Ingrediente) => {
    setSelectedIngrediente(ingrediente);
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
        <h2 className="text-3xl font-bold text-gray-800">Ingredientes</h2>
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg"
          >
            + Nuevo Ingrediente
          </button>
        )}
      </div>

      {/* Tabla */}
      <IngredienteTable
        data={ingredientes}
        onEdit={isAdmin ? openEditModal : () => {}}
        onDelete={isAdmin ? handleDelete : () => {}}
        isLoading={isLoading}
        isAdmin={isAdmin}
      />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full lg:w-[80vw] lg:max-w-[80vw] max-h-[90vh] overflow-y-auto">
            <div className="bg-gray-800 text-white p-6 rounded-t-lg">
              <h3 className="text-xl font-bold">
                {selectedIngrediente ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
              </h3>
            </div>
            <div className="p-6">
              <IngredienteFormSimple
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  setIsModalOpen(false);
                  setSelectedIngrediente(null);
                }}
                initialData={selectedIngrediente || undefined}
                isLoading={createMutation.isPending || updateMutation.isPending}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default IngredientesPageRefactored;
