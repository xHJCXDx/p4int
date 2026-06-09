import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table';
import { Producto } from '../types/producto';

interface ProductoTableProps {
  data: Producto[];
  onEdit?: (producto: Producto) => void;
  onDelete?: (id: number) => void;
  isLoading?: boolean;
  isAdmin?: boolean;
}

const columnHelper = createColumnHelper<Producto>();

export function ProductoTable({ data, onEdit, onDelete, isLoading = false, isAdmin = true }: ProductoTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'ID',
        cell: (info) => info.getValue(),
        size: 50,
      }),
      columnHelper.accessor('nombre', {
        header: 'Nombre',
        cell: (info) => info.getValue(),
        enableSorting: true,
        filterFn: 'includesString',
      }),
      columnHelper.accessor('precio_base', {
        header: 'Precio',
        cell: (info) => `$${info.getValue().toFixed(2)}`,
        enableSorting: true,
        size: 80,
      }),
      columnHelper.accessor('stock_cantidad', {
        header: 'Stock',
        cell: (info) => {
          const val = info.getValue();
          return (
            <span className={val > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-bold'}>
              {val}
            </span>
          );
        },
        enableSorting: true,
        size: 70,
      }),
      columnHelper.accessor('disponible', {
        header: 'Disponible',
        cell: (info) => (
          <span className={info.getValue() ? 'text-green-600 font-bold' : 'text-red-600'}>
            {info.getValue() ? 'Si' : 'No'}
          </span>
        ),
        size: 90,
      }),
      columnHelper.accessor('categorias', {
        header: 'Categorias',
        cell: (info) => {
          const cats = info.getValue() || [];
          if (cats.length === 0) return <span className="text-gray-400 text-sm">Sin categoria</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {cats.map((c) => (
                <span key={c.id} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                  {c.nombre}
                </span>
              ))}
            </div>
          );
        },
        enableSorting: false,
      }),
      columnHelper.accessor('ingredientes', {
        header: 'Ingredientes',
        cell: (info) => {
          const ings = info.getValue() || [];
          if (ings.length === 0) return <span className="text-gray-400 text-sm">Sin ingredientes</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {ings.map((i) => (
                <span
                  key={i.id}
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    i.es_alergeno
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {i.nombre} x{i.cantidad}
                </span>
              ))}
            </div>
          );
        },
        enableSorting: false,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Acciones',
        cell: (info) => (
          <div className="flex gap-2">
            {isAdmin && onEdit && (
              <button
                onClick={() => onEdit(info.row.original)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-2 rounded text-sm transition-colors"
              >
                Editar
              </button>
            )}
            {isAdmin && onDelete && (
              <button
                onClick={() => onDelete(info.row.original.id)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm transition-colors"
              >
                Eliminar
              </button>
            )}
          </div>
        ),
        size: 180,
      }),
    ],
    [onEdit, onDelete]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
  });

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <input
          type="text"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Buscar por nombre..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
        />
      </div>

      <div className="overflow-x-auto border border-gray-300 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-200 border-b border-gray-300">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-bold text-gray-700 cursor-pointer hover:bg-gray-300 transition-colors"
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ width: header.getSize() }}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={table.getAllColumns().length} className="text-center py-8 text-gray-600">
                  Cargando...
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={table.getAllColumns().length} className="text-center py-8 text-gray-600">
                  No hay productos disponibles
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-300 hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Mostrando {table.getRowModel().rows.length} de {table.getFilteredRowModel().rows.length} productos
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: table.getPageCount() }, (_, i) => i).map((page) => (
              <button
                key={page}
                onClick={() => table.setPageIndex(page)}
                className={`px-3 py-2 rounded-lg ${
                  table.getState().pagination.pageIndex === page
                    ? 'bg-gray-800 text-white'
                    : 'border border-gray-300 hover:bg-gray-100'
                }`}
              >
                {page + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
