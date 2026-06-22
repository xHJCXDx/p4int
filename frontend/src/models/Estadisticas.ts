export interface EstadisticasResumen {
  ventas_hoy: number | string;
  ticket_promedio: number | string;
  pedidos_activos: number;
  pedidos_totales: number;
}

export interface VentaPorPeriodo {
  periodo: string;
  total: number | string;
  pedidos: number;
}

export interface ProductoTop {
  producto_id: number;
  nombre: string;
  cantidad: number;
  total: number | string;
}

export interface PedidoPorEstado {
  estado: string;
  cantidad: number;
}

export interface IngresoPorFormaPago {
  forma_pago: string;
  total: number | string;
}
