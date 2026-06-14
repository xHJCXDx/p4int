import {
  useResumen,
  useVentas,
  useProductosTop,
  usePedidosPorEstado,
} from '../hooks/useEstadisticas';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORES_ESTADO: Record<string, string> = {
  PENDIENTE: '#f59e0b',
  CONFIRMADO: '#6b7280',
  EN_PREP: '#8b5cf6',
  ENTREGADO: '#10b981',
  CANCELADO: '#ef4444',
};

const PIE_COLORS = ['#f59e0b', '#6b7280', '#8b5cf6', '#10b981', '#ef4444'];

export default function DashboardPage() {
  const { data: resumen, isLoading: loadingResumen } = useResumen();
  const { data: ventas = [] } = useVentas();
  const { data: productosTop = [] } = useProductosTop(5);
  const { data: pedidosEstado = [] } = usePedidosPorEstado();

  if (loadingResumen) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <p className="text-center text-gray-500">Cargando estadisticas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Dashboard</h1>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Ventas hoy" value={`$${Number(resumen?.ventas_hoy ?? 0).toLocaleString('es-AR')}`} />
          <KpiCard label="Ticket promedio" value={`$${Number(resumen?.ticket_promedio ?? 0).toLocaleString('es-AR')}`} />
          <KpiCard label="Pedidos activos" value={String(resumen?.pedidos_activos ?? 0)} />
          <KpiCard label="Ventas mes actual" value={`$${Number(resumen?.ventas_mes_actual ?? 0).toLocaleString('es-AR')}`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ventas por periodo */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ventas ultimos 30 dias</h2>
            {ventas.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ventas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString('es-AR')}`} />
                  <Bar dataKey="total_ventas" fill="#3b82f6" name="Ventas" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pedidos por estado */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pedidos por estado</h2>
            {pedidosEstado.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pedidosEstado}
                    dataKey="cantidad"
                    nameKey="estado_codigo"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {pedidosEstado.map((entry, index) => (
                      <Cell
                        key={entry.estado_codigo}
                        fill={COLORES_ESTADO[entry.estado_codigo] ?? PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top productos */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 5 productos</h2>
            {productosTop.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin datos</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2 pr-4">#</th>
                      <th className="py-2 pr-4">Producto</th>
                      <th className="py-2 pr-4 text-right">Unidades</th>
                      <th className="py-2 text-right">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosTop.map((p, i) => (
                      <tr key={p.producto_id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium text-gray-700">{i + 1}</td>
                        <td className="py-2 pr-4 text-gray-900">{p.nombre}</td>
                        <td className="py-2 pr-4 text-right text-gray-700">{p.cantidad_vendida}</td>
                        <td className="py-2 text-right font-medium text-gray-900">
                          ${Number(p.ingresos).toLocaleString('es-AR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
