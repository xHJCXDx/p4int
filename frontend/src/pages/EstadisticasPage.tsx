import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  fetchEstadisticasResumen,
  fetchIngresos,
  fetchPedidosPorEstado,
  fetchProductosTop,
  fetchVentas,
} from "../api/estadisticasApi";
import { ESTADOS } from "../models/Pedido";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];

function toNumber(value: number | string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number | string): string {
  return toNumber(value).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function formatFormaPago(codigo: string): string {
  const labels: Record<string, string> = {
    EFECTIVO: "Efectivo",
    TARJETA: "Tarjeta",
    TRANSFERENCIA: "Transferencia (Mercado Pago)",
    MERCADOPAGO: "Transferencia (Mercado Pago)",
  };
  return labels[codigo] ?? codigo;
}

function formatPeriodo(periodo: string): string {
  const [year, month, day] = periodo.split("-");
  if (!year || !month || !day) return periodo;
  return `${day}/${month}`;
}

function KpiCard({ icon, label, value, subtitle, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-5 transition-all hover:shadow-md">
      <div className={`absolute top-0 left-0 w-1 h-full ${accent}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tight">{value}</p>
          {subtitle && <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500 leading-relaxed">{subtitle}</p>}
        </div>
        <div className={`flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl ${accent.replace("bg-", "bg-").replace("-600", "-100")} dark:bg-slate-800`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-5 transition-all hover:shadow-md">
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="h-72">
        {children}
      </div>
    </section>
  );
}

export function EstadisticasPage() {
  const resumenQuery = useQuery({
    queryKey: ["estadisticas", "resumen"],
    queryFn: fetchEstadisticasResumen,
  });
  const ventasQuery = useQuery({
    queryKey: ["estadisticas", "ventas"],
    queryFn: fetchVentas,
  });
  const productosQuery = useQuery({
    queryKey: ["estadisticas", "productos-top"],
    queryFn: fetchProductosTop,
  });
  const estadosQuery = useQuery({
    queryKey: ["estadisticas", "pedidos-por-estado"],
    queryFn: fetchPedidosPorEstado,
  });
  const ingresosQuery = useQuery({
    queryKey: ["estadisticas", "ingresos"],
    queryFn: fetchIngresos,
  });

  const resumen = resumenQuery.data;
  const ventas = useMemo(
    () => (ventasQuery.data ?? []).map((item) => ({ ...item, total: toNumber(item.total) })),
    [ventasQuery.data],
  );
  const productos = useMemo(
    () => (productosQuery.data ?? []).map((item) => ({ ...item, total: toNumber(item.total) })),
    [productosQuery.data],
  );
  const estados = useMemo(
    () => (estadosQuery.data ?? []).map((item) => ({
      ...item,
      label: ESTADOS[item.estado]?.label ?? item.estado,
    })),
    [estadosQuery.data],
  );
  const ingresos = useMemo(
    () => (ingresosQuery.data ?? []).map((item) => ({
      ...item,
      forma_pago_label: formatFormaPago(item.forma_pago),
      total: toNumber(item.total),
    })),
    [ingresosQuery.data],
  );

  const isLoading = resumenQuery.isLoading || ventasQuery.isLoading || productosQuery.isLoading || estadosQuery.isLoading;
  const isError = resumenQuery.isError || ventasQuery.isError || productosQuery.isError || estadosQuery.isError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gray-800 dark:border-slate-300 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-slate-400 font-medium">Cargando estadisticas...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl p-6 max-w-md text-center">
          <p className="text-red-700 dark:text-red-300 font-semibold">No se pudieron cargar las estadisticas.</p>
          <p className="text-red-500 dark:text-red-400 text-sm mt-1">Verifica la conexion e intenta de nuevo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tight">Estadisticas</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Resumen general del negocio</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          accent="bg-blue-600"
          label="Ventas hoy"
          value={money(resumen?.ventas_hoy ?? 0)}
          subtitle="Pedidos aprobados de hoy, cualquier forma de pago."
          icon={
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
        <KpiCard
          accent="bg-green-600"
          label="Ticket promedio"
          value={money(resumen?.ticket_promedio ?? 0)}
          subtitle="Ingresos aprobados / cantidad de pedidos aprobados."
          icon={
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
          }
        />
        <KpiCard
          accent="bg-amber-500"
          label="Pedidos activos"
          value={resumen?.pedidos_activos ?? 0}
          icon={
            <svg className="w-6 h-6 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
        <KpiCard
          accent="bg-purple-600"
          label="Pedidos totales"
          value={resumen?.pedidos_totales ?? 0}
          icon={
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
            </svg>
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard title="Ingresos aprobados por dia" subtitle="Cada barra suma pedidos aprobados de ese dia.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ventas}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="periodo" tickFormatter={formatPeriodo} label={{ value: "Fecha", position: "insideBottom", offset: -4 }} height={45} tick={{ fontSize: 11 }} />
              <YAxis label={{ value: "Ingresos ($)", angle: -90, position: "insideLeft" }} width={72} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value, name) => name === "total" ? [money(Number(value)), "Ingresos"] : [value, "Pedidos"]}
                labelFormatter={(label) => `Fecha: ${label}`}
                contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "13px" }}
              />
              <Legend verticalAlign="top" height={24} formatter={() => "Ingresos aprobados"} />
              <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Productos top" subtitle="Ranking por ingresos generados.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="nombre" tick={{ fontSize: 11 }} interval={0} height={86} angle={-25} textAnchor="end" label={{ value: "Producto", position: "insideBottom", offset: -2 }} />
              <YAxis label={{ value: "Ingresos ($)", angle: -90, position: "insideLeft" }} width={72} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => money(Number(value))}
                contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "13px" }}
              />
              <Legend verticalAlign="top" height={24} formatter={() => "Ingresos por producto"} />
              <Bar dataKey="total" fill="#16a34a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pedidos por estado" subtitle="Distribucion actual de pedidos.">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={estados} dataKey="cantidad" nameKey="label" outerRadius={100} innerRadius={50} paddingAngle={2} label>
                {estados.map((item, index) => (
                  <Cell key={item.estado} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "13px" }} />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                formatter={(value) => <span className="text-sm text-gray-700 dark:text-slate-300">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Ingresos aprobados por forma de pago" subtitle="Total aprobado agrupado por metodo.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ingresos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="forma_pago_label" label={{ value: "Forma de pago", position: "insideBottom", offset: -4 }} height={50} tick={{ fontSize: 11 }} />
              <YAxis label={{ value: "Ingresos aprobados ($)", angle: -90, position: "insideLeft" }} width={82} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => money(Number(value))}
                contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "13px" }}
              />
              <Legend verticalAlign="top" height={24} formatter={() => "Total aprobado"} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {ingresos.map((item, index) => (
                  <Cell key={item.forma_pago} fill={COLORS[(index + 2) % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
