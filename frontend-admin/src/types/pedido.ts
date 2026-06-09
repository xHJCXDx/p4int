export interface LineaVenta {
  producto_id: number;
  cantidad: number;
}

export interface DetalleInPedido {
  producto_id: number;
  cantidad: number;
  nombre_snapshot: string;
  precio_snapshot: number;
  subtotal_snap: number;
}

export interface Pedido {
  id?: number;
  usuario_id?: number;
  direccion_id?: number;
  estado_codigo?: string;
  forma_pago_codigo?: string;
  subtotal?: number;
  descuento?: number;
  costo_envio?: number;
  total?: number;
  notas?: string;
  detalles?: DetalleInPedido[];
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface DetallePedido {
  pedido_id: number;
  producto_id: number;
  cantidad: number;
  personalizacion?: number[];
  nombre_snapshot?: string;
  precio_snapshot?: number;
  subtotal_snap?: number;
  created_at?: string;
}

export interface Pago {
  id?: number;
  pedido_id: number;
  mp_payment_id?: number;
  mp_status: string;
  mp_status_detail?: string;
  external_reference: string;
  idempotency_key: string;
  payment_method_id?: string;
  transaction_amount: number;
  created_at?: string;
  updated_at?: string;
}

export interface HistorialEstadoPedido {
  id?: number;
  pedido_id: number;
  estado_desde?: string;
  estado_hacia: string;
  usuario_id?: number;
  motivo?: string;
  created_at?: string;
}
