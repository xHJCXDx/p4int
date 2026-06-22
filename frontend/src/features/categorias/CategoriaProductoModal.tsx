interface CategoriaProductoModalProps {
  popup: { categoriaNombre: string; total: number; items: string[] } | null;
  onClose: () => void;
}

export function CategoriaProductoModal({ popup, onClose }: CategoriaProductoModalProps) {
  if (!popup) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
        aria-label="Cerrar modal de productos"
      />
      <div className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="text-lg font-bold text-gray-900">{popup.categoriaNombre}</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
            aria-label="Cerrar"
          >
            x
          </button>
        </div>

        <p className="text-sm text-gray-700 mb-3">
          Total de productos en esta categoria:{" "}
          <span className="font-semibold text-gray-900">{popup.total}</span>
        </p>

        <div className="max-h-64 overflow-y-auto pr-1 space-y-2">
          {popup.items.length === 0 ? (
            <p className="text-sm text-gray-500">No hay productos asociados.</p>
          ) : (
            popup.items.map((nombre) => (
              <div key={nombre} className="text-sm text-gray-700 border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                {nombre}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
