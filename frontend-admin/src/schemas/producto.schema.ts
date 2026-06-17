import { z } from 'zod';

export const ingredienteEnRecetaSchema = z.object({
  ingrediente_id: z.coerce.number(),
  cantidad: z.coerce.number().positive('La cantidad debe ser mayor a 0').default(1),
  es_removible: z.boolean().default(false),
  unidad_medida_id: z.coerce.number({ error: 'La unidad de medida es requerida' }).int().positive('La unidad de medida es requerida'),
});

export const productoFormSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').min(3, 'Minimo 3 caracteres'),
  descripcion: z.string().optional().default(''),
  precio_base: z.coerce.number().min(0.01, 'El precio debe ser mayor a 0'),
  stock_cantidad: z.coerce.number().min(0, 'El stock no puede ser negativo').optional().default(0),
  imagenes_url: z.array(z.string()).optional().default([]),
  categoria_ids: z.array(z.coerce.number()).default([]),
  ingredientes: z.array(ingredienteEnRecetaSchema).default([]),
});

export type ProductoFormType = z.infer<typeof productoFormSchema>;
