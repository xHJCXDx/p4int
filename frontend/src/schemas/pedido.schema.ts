import { z } from 'zod';

export const pedidoFormSchema = z.object({
  usuario_id: z.number().min(1, 'Usuario requerido'),
  direccion_id: z.number().optional().nullable(),
  estado_codigo: z.string().min(1, 'Estado requerido'),
  forma_pago_codigo: z.string().min(1, 'Forma de pago requerida'),
  subtotal: z.number().min(0.01, 'Subtotal debe ser mayor a 0'),
  descuento: z.number().min(0, 'Descuento no puede ser negativo').default(0),
  costo_envio: z.number().min(0, 'Costo de envío no puede ser negativo').default(50),
  total: z.number().min(0, 'Total debe ser mayor a 0'),
  notas: z.string().optional().default(''),
});

export type PedidoFormType = z.infer<typeof pedidoFormSchema>;
