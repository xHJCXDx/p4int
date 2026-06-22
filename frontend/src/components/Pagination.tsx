interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <div className="flex justify-center items-center mt-8 space-x-2">
      <button
        type="button"
        onClick={() => onPageChange(1)}
        disabled={isFirstPage}
        className={`px-4 py-2 rounded-md border font-medium ${
          isFirstPage
            ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed border-gray-300 dark:border-slate-700'
            : 'bg-white dark:bg-slate-900/80 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 border-gray-300 dark:border-slate-700'
        }`}
      >
        Primera
      </button>
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isFirstPage}
        className={`px-4 py-2 rounded-md border font-medium ${
          isFirstPage
            ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed border-gray-300 dark:border-slate-700'
            : 'bg-white dark:bg-slate-900/80 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 border-gray-300 dark:border-slate-700'
        }`}
      >
        Anterior
      </button>
      <span className="text-gray-600 dark:text-slate-300 px-4 font-medium">
        Pagina {currentPage} de {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLastPage}
        className={`px-4 py-2 rounded-md border font-medium ${
          isLastPage
            ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed border-gray-300 dark:border-slate-700'
            : 'bg-white dark:bg-slate-900/80 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 border-gray-300 dark:border-slate-700'
        }`}
      >
        Siguiente
      </button>
      <button
        type="button"
        onClick={() => onPageChange(totalPages)}
        disabled={isLastPage}
        className={`px-4 py-2 rounded-md border font-medium ${
          isLastPage
            ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed border-gray-300 dark:border-slate-700'
            : 'bg-white dark:bg-slate-900/80 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 border-gray-300 dark:border-slate-700'
        }`}
      >
        Ultima
      </button>
    </div>
  );
}
