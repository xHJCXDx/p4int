import { z } from 'zod';

export const ingredienteFormSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').min(3, 'Minimo 3 caracteres'),
  descripcion: z.string().default(''),
  es_alergeno: z.boolean().default(false),
  stock_cantidad: z.number().int().min(0, 'El stock no puede ser negativo').default(0),
  unidad_medida_codigo: z.string().min(1, 'La unidad de medida es requerida'),
});

export type IngredienteFormType = z.infer<typeof ingredienteFormSchema>;
