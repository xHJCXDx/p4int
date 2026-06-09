import { z } from 'zod';

export const categoriaFormSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').min(2, 'Mínimo 2 caracteres'),
  descripcion: z.string().optional().default(''),
  imagen_url: z.string().optional().default(''),
  parent_id: z.number().optional().nullable(),
});

export type CategoriaFormType = z.infer<typeof categoriaFormSchema>;
