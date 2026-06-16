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
import { EstadoPedido, FormaPago } from '../hooks/useCatalogo';
import { usePrompt } from './ConfirmDialog';

interface PedidoTableProps {
  data: Pedido[];
  onChangeEstado: (pedidoId: number, nuevo_estado: string, motivo?: string) => void;
  estadosPedido: EstadoPedido[];
  formasPago: FormaPago[];
  isLoading?: boolean;
}

const columnHelper = createColumnHelper<Pedido>();

const ESTADO_BADGE: Record<string, string> = {
  'PENDIENTE': 'bg-yellow-100 text-yellow-800',
  'CONFIRMADO': 'bg-gray-200 text-gray-800',
  'EN_PREP': 'bg-purple-100 text-purple-800',
  'ENTREGADO': 'bg-green-100 text-green-800',
  'CANCELADO': 'bg-red-100 text-red-800',
};

const TRANSICIONES_POR_ESTADO: Record<string, { nuevo_estado: string; label: string }[]> = {
  'PENDIENTE': [
    { nuevo_estado: 'CONFIRMADO', label: 'Confirmar' },
    { nuevo_estado: 'CANCELADO', label: 'Cancelar' },
  ],
  'CONFIRMADO': [
    { nuevo_estado: 'EN_PREP', label: 'Preparar' },
    { nuevo_estado: 'CANCELADO', label: 'Cancelar' },
  ],
  'EN_PREP': [
    { nuevo_estado: 'ENTREGADO', label: 'Entregar' },
    { nuevo_estado: 'CANCELADO', label: 'Cancelar' },
  ],
};

export function PedidoTable({ data, onChangeEstado, estadosPedido, formasPago, isLoading = false }: PedidoTableProps) {
  const promptDialog = usePrompt();

  const getEstadoLabel = (codigo: string) =>
    estadosPedido.find((e) => e.codigo === codigo)?.descripcion || codigo;

  const getFormaPagoLabel = (codigo: string) =>
    formasPago.find((f) => f.codigo === codigo)?.descripcion || codigo;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('ACTIVOS');

  const terminalCodes = useMemo(
    () => new Set(estadosPedido.filter((e) => e.es_terminal).map((e) => e.codigo)),
    [estadosPedido]
  );

  const filteredByEstado = useMemo(() => {
    if (filtroEstado === 'TODOS') return data;
    if (filtroEstado === 'ACTIVOS') {
      return data.filter((p) => !terminalCodes.has(p.estado_codigo));
    }
    return data.filter((p) => p.estado_codigo === filtroEstado);
  }, [data, filtroEstado, terminalCodes]);

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
              {getEstadoLabel(estado)}
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
                    ${Number(det.subtotal_snap ?? 0).toFixed(2)}
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
          <span className="font-bold text-gray-900">${Number(info.getValue() ?? 0).toFixed(2)}</span>
        ),
        enableSorting: true,
        size: 90,
      }),
      columnHelper.accessor('forma_pago_codigo', {
        header: 'Pago',
        cell: (info) => getFormaPagoLabel(info.getValue() || ''),
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
          const transiciones = TRANSICIONES_POR_ESTADO[estado] || [];

          if (transiciones.length === 0) {
            return <span className="text-gray-400 text-xs">-</span>;
          }

          return (
            <div className="flex gap-1 flex-wrap">
              {transiciones.map((t) => (
                <button
                  key={t.nuevo_estado}
                  onClick={async () => {
                    if (t.nuevo_estado === 'CANCELADO') {
                      const motivo = await promptDialog({
                        title: 'Cancelar pedido',
                        message: `¿Seguro que querés cancelar el pedido #${pedido.id}?`,
                        inputPlaceholder: 'Motivo de cancelación...',
                        confirmText: 'Cancelar pedido',
                        cancelText: 'Volver',
                      });
                      if (motivo) onChangeEstado(pedido.id!, t.nuevo_estado, motivo);
                    } else {
                      onChangeEstado(pedido.id!, t.nuevo_estado);
                    }
                  }}
                  className={`text-xs font-bold py-1 px-2 rounded transition-colors ${
                    t.nuevo_estado === 'CANCELADO'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {t.label}
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

  const estados = ['ACTIVOS', 'TODOS', ...estadosPedido.map((e) => e.codigo)];

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
              {getEstadoLabel(est)}
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
