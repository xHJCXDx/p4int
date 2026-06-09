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
import { Ingrediente } from '../types/ingrediente';

interface IngredienteTableProps {
  data: Ingrediente[];
  onEdit: (ingrediente: Ingrediente) => void;
  onDelete: (id: number) => void;
  isLoading?: boolean;
  isAdmin?: boolean;
}

const columnHelper = createColumnHelper<Ingrediente>();

export function IngredienteTable({ data, onEdit, onDelete, isLoading = false, isAdmin = true }: IngredienteTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo(
    () => [
      ...(isAdmin ? [columnHelper.accessor('id', {
        header: 'ID',
        cell: (info) => info.getValue(),
        size: 50,
      })] : []),
      columnHelper.accessor('nombre', {
        header: 'Nombre',
        cell: (info) => info.getValue(),
        enableSorting: true,
        filterFn: 'includesString',
      }),
      columnHelper.accessor('descripcion', {
        header: 'Descripción',
        cell: (info) => info.getValue() || '-',
        enableSorting: false,
      }),
      columnHelper.accessor('stock_cantidad', {
        header: 'Stock',
        cell: (info) => (
          <span className={info.getValue() > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
            {info.getValue()} {info.row.original.unidad_medida_codigo}
          </span>
        ),
        enableSorting: true,
        size: 120,
      }),
      columnHelper.accessor('es_alergeno', {
        header: 'Alergeno',
        cell: (info) => (
          <span className={info.getValue() ? 'text-yellow-600 font-bold' : 'text-green-600'}>
            {info.getValue() ? '⚠️ Sí' : '✓ No'}
          </span>
        ),
        size: 100,
      }),
      ...(isAdmin ? [columnHelper.display({
        id: 'actions',
        header: 'Acciones',
        cell: (info) => (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(info.row.original)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-2 rounded text-sm transition-colors"
            >
              Editar
            </button>
            <button
              onClick={() => onDelete(info.row.original.id!)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm transition-colors"
            >
              Eliminar
            </button>
          </div>
        ),
        size: 150,
      })] : []),
    ],
    [onEdit, onDelete, isAdmin]
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
      {/* Buscador */}
      <div className="mb-4">
        <input
          type="text"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Buscar por nombre..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
        />
      </div>

      {/* Tabla */}
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
                      {header.column.getCanSort() && (
                        <span className="text-xs">
                          {{
                            asc: ' 🔼',
                            desc: ' 🔽',
                          }[header.column.getIsSorted() as string] ?? ''}
                        </span>
                      )}
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
                  No hay ingredientes disponibles
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

      {/* Paginación */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Mostrando {table.getRowModel().rows.length} de {table.getFilteredRowModel().rows.length} ingredientes
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Anterior
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
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}
