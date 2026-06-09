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
import { Pedido } from '../types/pedido';

interface PedidoTableProps {
  data: Pedido[];
  onChangeEstado: (pedidoId: number, accion: string, motivo?: string) => void;
  isLoading?: boolean;
}

const columnHelper = createColumnHelper<Pedido>();

const ESTADO_BADGE: Record<string, string> = {
  'PENDIENTE': 'bg-yellow-100 text-yellow-800',
  'CONFIRMADO': 'bg-gray-200 text-gray-800',
  'EN_PREP': 'bg-purple-100 text-purple-800',
  'EN_CAMINO': 'bg-orange-100 text-orange-800',
  'ENTREGADO': 'bg-green-100 text-green-800',
  'CANCELADO': 'bg-red-100 text-red-800',
};

const ESTADO_LABEL: Record<string, string> = {
  'PENDIENTE': 'Pendiente',
  'CONFIRMADO': 'Confirmado',
  'EN_PREP': 'En preparacion',
  'EN_CAMINO': 'En camino',
  'ENTREGADO': 'Entregado',
  'CANCELADO': 'Cancelado',
};

const ACCIONES_POR_ESTADO: Record<string, { accion: string; label: string }[]> = {
  'PENDIENTE': [
    { accion: 'confirmar', label: 'Confirmar' },
    { accion: 'cancelar', label: 'Cancelar' },
  ],
  'CONFIRMADO': [
    { accion: 'preparar', label: 'Preparar' },
    { accion: 'cancelar', label: 'Cancelar' },
  ],
  'EN_PREP': [
    { accion: 'enviar', label: 'Enviar' },
    { accion: 'cancelar', label: 'Cancelar' },
  ],
  'EN_CAMINO': [
    { accion: 'entregar', label: 'Entregar' },
  ],
};

export function PedidoTable({ data, onChangeEstado, isLoading = false }: PedidoTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('ACTIVOS');

  const filteredByEstado = useMemo(() => {
    if (filtroEstado === 'TODOS') return data;
    if (filtroEstado === 'ACTIVOS') {
      return data.filter((p) => p.estado_codigo !== 'ENTREGADO' && p.estado_codigo !== 'CANCELADO');
    }
    return data.filter((p) => p.estado_codigo === filtroEstado);
  }, [data, filtroEstado]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'ID',
        cell: (info) => <span className="font-medium">#{info.getValue()}</span>,
        size: 60,
      }),
      columnHelper.accessor('estado_codigo', {
        header: 'Estado',
        cell: (info) => {
          const estado = info.getValue() || '';
          return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${ESTADO_BADGE[estado] || 'bg-gray-100 text-gray-800'}`}>
              {ESTADO_LABEL[estado] || estado}
            </span>
          );
        },
        enableSorting: true,
      }),
      columnHelper.display({
        id: 'detalles',
        header: 'Productos',
        cell: (info) => {
          const pedido = info.row.original;
          const detalles = pedido.detalles || [];
          if (detalles.length === 0) {
            return <span className="text-gray-400 text-sm">Sin detalles</span>;
          }
          return (
            <div className="space-y-0.5">
              {detalles.map((det, idx) => (
                <div key={idx} className="text-sm flex justify-between gap-4">
                  <span className="text-gray-700">
                    {det.nombre_snapshot} <span className="text-gray-400">x{det.cantidad}</span>
                  </span>
                  <span className="text-gray-500 font-medium whitespace-nowrap">
                    ${det.subtotal_snap?.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          );
        },
      }),
      columnHelper.accessor('total', {
        header: 'Total',
        cell: (info) => (
          <span className="font-bold text-gray-900">${info.getValue()?.toFixed(2)}</span>
        ),
        enableSorting: true,
        size: 90,
      }),
      columnHelper.accessor('forma_pago_codigo', {
        header: 'Pago',
        cell: (info) => info.getValue() || '-',
        enableSorting: true,
        size: 80,
      }),
      columnHelper.accessor('created_at', {
        header: 'Fecha',
        cell: (info) => {
          const date = new Date(info.getValue() || '');
          return (
            <span className="text-sm text-gray-600">
              {date.toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          );
        },
        enableSorting: true,
        size: 140,
      }),
      columnHelper.display({
        id: 'gestion',
        header: 'Gestion',
        cell: (info) => {
          const pedido = info.row.original;
          const estado = pedido.estado_codigo || '';
          const acciones = ACCIONES_POR_ESTADO[estado] || [];

          if (acciones.length === 0) {
            return <span className="text-gray-400 text-xs">-</span>;
          }

          return (
            <div className="flex gap-1 flex-wrap">
              {acciones.map((a) => (
                <button
                  key={a.accion}
                  onClick={() => {
                    if (a.accion === 'cancelar') {
                      const motivo = prompt('Motivo de cancelacion:');
                      if (motivo) onChangeEstado(pedido.id!, a.accion, motivo);
                    } else {
                      onChangeEstado(pedido.id!, a.accion);
                    }
                  }}
                  className={`text-xs font-bold py-1 px-2 rounded transition-colors ${
                    a.accion === 'cancelar'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          );
        },
        size: 180,
      }),
    ],
    [onChangeEstado]
  );

  const table = useReactTable({
    data: filteredByEstado,
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

  const estados = ['ACTIVOS', 'TODOS', 'PENDIENTE', 'CONFIRMADO', 'EN_PREP', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO'];

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Buscar..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
        />
        <div className="flex gap-1 flex-wrap">
          {estados.map((est) => (
            <button
              key={est}
              onClick={() => setFiltroEstado(est)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filtroEstado === est
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {ESTADO_LABEL[est] || est.charAt(0) + est.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto border border-gray-300 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-800 text-white">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-bold cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ width: header.getSize() }}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="text-xs">
                          {{
                            asc: ' ▲',
                            desc: ' ▼',
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
                  No hay pedidos
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50 align-top">
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

      {/* Paginacion */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Mostrando {table.getRowModel().rows.length} de {table.getFilteredRowModel().rows.length} pedidos
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
