import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Categoria } from "../../models/Categoria";
import { useCategorias } from "../../hooks/useCategoria";
import { useToast } from "../../context/ToastContext";
import { InfoHint } from "../../components/InfoHint";

interface Props {
    categoriaAEditar?: Categoria | null;
    onCancelarEdicion?: () => void;
    onSuccess?: (categoria: Categoria) => void;
}

interface ErroresFormulario {
    nombre?: string;
}

type ParentOption = {
    id: number;
    label: string;
    group: string;
};

const estadoInicial = {
    nombre: "",
    descripcion: "",
    is_active: true,
    parent_id: "" as number | string,
};

const FormularioCategoria: React.FC<Props> = ({ categoriaAEditar, onCancelarEdicion, onSuccess }) => {
    const { agregar, editar, categorias } = useCategorias();
    const { showToast } = useToast();
    const [parentDropdownOpen, setParentDropdownOpen] = useState(false);
    const [parentSearch, setParentSearch] = useState("");
    const [expandedParentIds, setExpandedParentIds] = useState<Set<number>>(new Set());
    const parentDropdownRef = useRef<HTMLDivElement | null>(null);

    const [datosForm, setDatosForm] = useState(() => {
        if (!categoriaAEditar) return estadoInicial;

        return {
            nombre: categoriaAEditar.nombre,
            descripcion: categoriaAEditar.descripcion || "",
            is_active: categoriaAEditar.is_active ?? true,
            parent_id: categoriaAEditar.parent_id ?? "",
        };
    });

    const [errores, setErrores] = useState<ErroresFormulario>({});

    useEffect(() => {
        if (!categoriaAEditar) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDatosForm(estadoInicial);
            return;
        }

        setDatosForm({
            nombre: categoriaAEditar.nombre,
            descripcion: categoriaAEditar.descripcion || "",
            is_active: categoriaAEditar.is_active ?? true,
            parent_id: categoriaAEditar.parent_id ?? "",
        });
    }, [categoriaAEditar, categorias]);

    const childrenByParent = useMemo(() => {
        const map = new Map<number | null, Categoria[]>();
        for (const cat of categorias) {
            if (!cat.id) continue;
            const key = cat.parent_id ?? null;
            const arr = map.get(key) || [];
            arr.push(cat);
            map.set(key, arr);
        }
        for (const arr of map.values()) {
            arr.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
        }
        return map;
    }, [categorias]);

    const blockedIds = useMemo(() => {
        if (!categoriaAEditar?.id) return new Set<number>();
        const blocked = new Set<number>([categoriaAEditar.id]);
        const queue = [categoriaAEditar.id];
        while (queue.length > 0) {
            const current = queue.shift()!;
            const children = childrenByParent.get(current) || [];
            for (const child of children) {
                if (!child.id || blocked.has(child.id)) continue;
                blocked.add(child.id);
                queue.push(child.id);
            }
        }
        return blocked;
    }, [categoriaAEditar, childrenByParent]);

    const parentOptions = useMemo<ParentOption[]>(() => {
        const opciones: ParentOption[] = [];
        const selectedParentId = Number(datosForm.parent_id);

        const isAllowed = (cat: Categoria) =>
            Boolean(
                cat.id &&
                !blockedIds.has(cat.id) &&
                (cat.is_active !== false || Number(cat.id) === selectedParentId),
            );

        const walk = (cat: Categoria, rootName: string, path: string) => {
            if (!cat.id || !isAllowed(cat)) return;
            const children = childrenByParent.get(Number(cat.id)) || [];
            for (const child of children) {
                if (!child.id || !isAllowed(child)) continue;
                const label = `${path} > ${child.nombre}`;
                opciones.push({ id: child.id, label, group: rootName });
                walk(child, rootName, label);
            }
        };

        const roots = (childrenByParent.get(null) || []).filter(isAllowed);
        for (const root of roots) {
            if (!root.id) continue;
            opciones.push({
                id: root.id,
                label: `Usar solo ${root.nombre}`,
                group: root.nombre,
            });
            walk(root, root.nombre, root.nombre);
        }
        return opciones;
    }, [childrenByParent, blockedIds, datosForm.parent_id]);

    const parentSelected = useMemo(
        () => parentOptions.find((opt) => opt.id === Number(datosForm.parent_id)) ?? null,
        [parentOptions, datosForm.parent_id],
    );

    const parentSelectedLabel = parentSelected?.label || "Seleccionar...";

    const parentFiltered = useMemo(() => {
        const term = parentSearch.trim().toLowerCase();
        if (!term) return parentOptions;
        return parentOptions.filter((opt) => opt.label.toLowerCase().includes(term));
    }, [parentOptions, parentSearch]);

    const validarFormulario = () => {
        const nuevosErrores: ErroresFormulario = {};

        if (!datosForm.nombre.trim()) {
            nuevosErrores.nombre = "El nombre es obligatorio.";
        } else if (datosForm.nombre.trim().length < 3) {
            nuevosErrores.nombre = "El nombre debe tener al menos 3 caracteres.";
        }

        return nuevosErrores;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === "checkbox") {
            const checked = (e.target as HTMLInputElement).checked;
            setDatosForm({ ...datosForm, [name]: checked });
            return;
        }

        setDatosForm({ ...datosForm, [name]: value });
    };

    const enviarFormulario = async (e: React.FormEvent) => {
        e.preventDefault();
        const nuevosErrores = validarFormulario();
        setErrores(nuevosErrores);
        if (Object.keys(nuevosErrores).length > 0) return;

        const parentId = datosForm.parent_id !== "" ? Number(datosForm.parent_id) : null;

        const c = new Categoria({
            nombre: datosForm.nombre.trim(),
            descripcion: datosForm.descripcion.trim() || null,
            imagen_url: categoriaAEditar?.imagen_url || null,
            is_active: datosForm.is_active,
            parent_id: parentId,
        });

        try {
            const esSubcategoria = parentId !== null;
            const tipo = esSubcategoria ? "subcategoria" : "categoria";
            if (categoriaAEditar?.id) {
                c.id = categoriaAEditar.id;
                await editar(c);
                showToast(`La ${tipo} se ha actualizado correctamente.`);
                onSuccess?.(c);
            } else {
                const creada = await agregar(c);
                showToast(`La ${tipo} se ha creado correctamente.`);
                onSuccess?.(creada);
            }

            setDatosForm(estadoInicial);
            setErrores({});
        } catch {
            // El error se muestra por contexto global; mantenemos el formulario para corregir.
        }
    };

    useEffect(() => {
        if (!parentDropdownOpen) return;
        const onClickOutside = (event: MouseEvent) => {
            if (!parentDropdownRef.current) return;
            if (!parentDropdownRef.current.contains(event.target as Node)) {
                setParentDropdownOpen(false);
            }
        };
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setParentDropdownOpen(false);
        };
        window.addEventListener("mousedown", onClickOutside);
        window.addEventListener("keydown", onEscape);
        return () => {
            window.removeEventListener("mousedown", onClickOutside);
            window.removeEventListener("keydown", onEscape);
        };
    }, [parentDropdownOpen]);

    useEffect(() => {
        if (!parentDropdownOpen && parentSearch) {
            setParentSearch("");
        }
    }, [parentDropdownOpen, parentSearch]);

    const isParentAllowed = (cat: Categoria) => {
        const selectedParentId = Number(datosForm.parent_id);
        return Boolean(
            cat.id &&
            !blockedIds.has(cat.id) &&
            (cat.is_active !== false || Number(cat.id) === selectedParentId),
        );
    };

    const renderParentNodo = (cats: Categoria[], depth: number): ReactNode[] =>
        cats
            .filter(isParentAllowed)
            .map((cat) => {
                const catId = Number(cat.id);
                const children = (childrenByParent.get(catId) || []).filter(isParentAllowed);
                const hasChildren = children.length > 0;
                const isExpanded = expandedParentIds.has(catId);
                const selected = Number(datosForm.parent_id) === catId;

                return (
                    <div key={catId}>
                        <div
                            style={{ paddingLeft: `${12 + depth * 16}px` }}
                            onClick={() => {
                                if (!hasChildren) return;
                                setExpandedParentIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(catId)) next.delete(catId);
                                    else next.add(catId);
                                    return next;
                                });
                            }}
                            className={`flex items-center gap-1 pr-3 py-2 text-sm ${hasChildren ? "cursor-pointer" : ""} ${
                                selected ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                            }`}
                        >
                            {hasChildren ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedParentIds((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(catId)) next.delete(catId);
                                            else next.add(catId);
                                            return next;
                                        });
                                    }}
                                    className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 flex-shrink-0"
                                    aria-label={isExpanded ? "Contraer" : "Expandir"}
                                >
                                    {isExpanded ? "v" : ">"}
                                </button>
                            ) : (
                                <span className="w-5 flex-shrink-0" />
                            )}
                            <button
                                type="button"
                                className="inline-flex max-w-full min-w-0 text-left hover:underline"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDatosForm((prev) => ({ ...prev, parent_id: catId }));
                                    setParentDropdownOpen(false);
                                }}
                            >
                                <span className="truncate">{cat.nombre}</span>
                            </button>
                        </div>
                        {hasChildren && isExpanded && renderParentNodo(children, depth + 1)}
                    </div>
                );
            });

    return (
        <form onSubmit={enviarFormulario} className="space-y-6">
            <p className="text-sm text-gray-500">Los campos con * son obligatorios.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                    <input
                        type="text"
                        name="nombre"
                        value={datosForm.nombre}
                        onChange={handleChange}
                        className={`w-full border rounded p-2 ${errores.nombre ? "border-red-500" : "border-gray-300"}`}
                    />
                    {errores.nombre && <p className="text-red-500 text-xs mt-1">{errores.nombre}</p>}
                </div>

                <div ref={parentDropdownRef} className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Desea asignar esta categoria a otra?
                        <InfoHint text="Si vas a crear una categoria principal o general, ignora este campo o dejalo sin completar." />
                    </label>
                    <button
                        type="button"
                        onClick={() => setParentDropdownOpen((prev) => !prev)}
                        className="w-full border rounded p-2 bg-white border-gray-300 text-left flex items-center justify-between"
                        aria-haspopup="listbox"
                        aria-expanded={parentDropdownOpen}
                    >
                        <span className={datosForm.parent_id ? "text-gray-900" : "text-gray-600"}>{parentSelectedLabel}</span>
                        <span className="text-gray-500">{parentDropdownOpen ? "^" : "v"}</span>
                    </button>

                    {parentDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-40 rounded-lg border border-gray-300 bg-white shadow-lg">
                            <div className="p-2 border-b border-gray-100">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={parentSearch}
                                        onChange={(e) => setParentSearch(e.target.value)}
                                        placeholder="Buscar categoria..."
                                        className="w-full border border-gray-300 rounded p-2 pr-10 text-sm"
                                    />
                                    {parentSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setParentSearch("")}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            aria-label="Limpiar busqueda de categorias"
                                        >
                                            x
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto py-1" role="listbox">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDatosForm((prev) => ({ ...prev, parent_id: "" }));
                                        setParentDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50"
                                >
                                    Seleccionar...
                                </button>
                                {parentSearch.trim() ? (
                                    parentFiltered.length === 0 ? (
                                        <p className="px-3 py-2 text-sm text-gray-500">No hay categorias que coincidan.</p>
                                    ) : (
                                        parentFiltered.map((opt) => {
                                            const selected = Number(datosForm.parent_id) === opt.id;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setDatosForm((prev) => ({ ...prev, parent_id: opt.id }));
                                                        setParentDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                                                        selected ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            );
                                        })
                                    )
                                ) : (childrenByParent.get(null) || []).filter(isParentAllowed).length === 0 ? (
                                    <p className="px-3 py-2 text-sm text-gray-500">No hay categorias.</p>
                                ) : (
                                    renderParentNodo(childrenByParent.get(null) || [], 0)
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
                <textarea
                    name="descripcion"
                    rows={3}
                    value={datosForm.descripcion}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded p-2"
                />
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="is_active_cat"
                    name="is_active"
                    checked={datosForm.is_active}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="is_active_cat" className="text-sm text-gray-700">Categoria activa</label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                {(categoriaAEditar || onCancelarEdicion) && (
                    <button
                        type="button"
                        onClick={onCancelarEdicion}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        Cancelar
                    </button>
                )}
                <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-medium"
                >
                    {categoriaAEditar ? "Actualizar Categoria" : "Guardar Categoria"}
                </button>
            </div>
        </form>
    );
};

export default FormularioCategoria;
