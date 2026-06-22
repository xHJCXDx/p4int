import type { Categoria } from "./Categoria";
import type { Ingrediente } from "./Ingrediente";

export class Producto {
    id?: number;
    nombre: string;
    descripcion?: string | null;
    precio_base: number;
    imagenes_url?: string[] | null;
    stock_cantidad: number;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;

    categorias?: Categoria[];
    ingredientes?: Ingrediente[];

    constructor(data: Partial<Producto>) {
        this.id = data.id;
        this.nombre = data.nombre || "";
        this.descripcion = data.descripcion ?? null;
        this.precio_base = data.precio_base ?? 0;
        this.imagenes_url = data.imagenes_url || [];
        this.stock_cantidad = data.stock_cantidad ?? 0;
        this.is_active = data.is_active ?? true;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.deleted_at = data.deleted_at ?? null;
        this.categorias = data.categorias;
        this.ingredientes = data.ingredientes;
    }
}
