import { Producto } from "./Producto";

type CategoriaApiPayload = Partial<Categoria> & { subcategorias?: Categoria[] };

export class Categoria {
    id?: number;
    parent_id: number | null;
    nombre: string;
    descripcion?: string | null;
    imagen_url?: string | null;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;

    parent?: Categoria | null;
    subCategorias?: Categoria[];
    productos?: Producto[];

    constructor(data: CategoriaApiPayload) {
        this.id = data.id;
        this.parent_id = data.parent_id ?? null;
        this.nombre = data.nombre || "";
        this.descripcion = data.descripcion ?? null;
        this.imagen_url = data.imagen_url ?? null;
        this.is_active = data.is_active ?? true;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.deleted_at = data.deleted_at ?? null;
        this.parent = data.parent ?? null;
        this.subCategorias = data.subCategorias || data.subcategorias;
        this.productos = data.productos;
    }
}
