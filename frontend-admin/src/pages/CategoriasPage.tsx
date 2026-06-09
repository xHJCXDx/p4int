import { useState } from 'react';
import { CategoriaTable } from '../components/CategoriaTable';
import CategoriaModal from '../components/CategoriaModal';
import { Categoria } from '../types/categoria';
import {
  useCategorias,
  useCreateCategoria,
  useUpdateCategoria,
  useDeleteCategoria,
} from '../hooks/useCategorias';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

function CategoriasPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);
  const [error, setError] = useState<string | null>(null);


  const { data: categorias = [], isLoading } = useCategorias();
  const createMutation = useCreateCategoria();
  const updateMutation = useUpdateCategoria();
  const deleteMutation = useDeleteCategoria();

  const handleCreate = async (nueva: Categoria) => {
    try {
      await createMutation.mutateAsync(nueva);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error creating categoria:', err);
      setError('Error al crear la categoría');
    }
  };

  const handleUpdate = async (actualizada: Categoria) => {
    if (!selectedCategoria || !selectedCategoria.id) return;
    try {
      await updateMutation.mutateAsync({
        id: selectedCategoria.id,
        data: actualizada,
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error updating categoria:', err);
      setError('Error al actualizar la categoría');
    }
  };

  const confirm = useConfirm();
  const { showToast } = useToast();

  const handleDelete = async (id: number) => {
    const ok = await confirm({ message: '¿Estas seguro de eliminar esta categoria?' });
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(id);
      showToast('Categoria eliminada', 'success');
    } catch (err) {
      console.error('Error deleting categoria:', err);
      showToast('Error al eliminar la categoria', 'error');
    }
  };

  const openCreateModal = () => {
    setSelectedCategoria(null);
    setIsModalOpen(true);
  };

  const openEditModal = (categoria: Categoria) => {
    setSelectedCategoria(categoria);
    setIsModalOpen(true);
  };

  const handleSubmit = (data: Omit<Categoria, 'id'>) => {
    if (selectedCategoria) {
      handleUpdate(data as Categoria);
    } else {
      handleCreate(data as Categoria);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Categorías</h2>
        <button
          onClick={openCreateModal}
          className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg"
        >
          + Nueva Categoría
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Cargando...</p>
        </div>
      ) : (
        <CategoriaTable
          data={categorias}
          onEdit={openEditModal}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      )}

      <CategoriaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        categoriaInitial={selectedCategoria}
      />
    </main>
  );
}

export default CategoriasPage;
