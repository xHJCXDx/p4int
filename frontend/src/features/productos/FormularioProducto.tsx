import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Producto } from "../../models/Producto";
import { useCategorias } from "../../hooks/useCategoria";
import { useIngredientes } from "../../hooks/useIngrediente";
import { useProductos } from "../../hooks/useProducto";
import { useToast } from "../../context/ToastContext";
import { api, getApiErrorMessage } from "../../api/http";
import { InfoHint } from "../../components/InfoHint";

interface Props {
  productoAEditar?: Producto | null;
  onCancelarEdicion?: () => void;
  onSuccess?: (producto: Producto) => void;
}

interface ErroresFormulario {
  nombre?: string;
  precio_base?: string;
  categoria_id?: string;
  ingredientes?: string;
}

type IngredientesSeleccionados = Record<number, string>;

type EstadoFormulario = {
  nombre: string;
  descripcion: string;
  precio_base: number | string;
  imagenes_url: string[];
  is_active: boolean;
  categoria_id: number | string;
  ingredientes: IngredientesSeleccionados;
};

type DraftPayload = EstadoFormulario & { ingredienteSearch: string };

const DRAFT_KEY = "producto_form_draft_v3";
const CREATE_CATEGORY_OPTION = "__create_category__";

const estadoInicial: EstadoFormulario = {
  nombre: "",
  descripcion: "",
  precio_base: 0,
  imagenes_url: [],
  is_active: true,
  categoria_id: "",
  ingredientes: {},
};

const toNumberOrEmpty = (value: unknown): number | string => {
  if (value === "" || value === null || value === undefined) return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : "";
};

const parseDraft = (): DraftPayload | null => {
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DraftPayload> & {
      categoria_principal_id?: unknown;
      subcategoria_id?: unknown;
      imagenes_url?: unknown;
    };
    const categoriaDesdeFormatoViejo =
      toNumberOrEmpty(parsed.subcategoria_id) || toNumberOrEmpty(parsed.categoria_principal_id);
    const imagenesRaw = (parsed as { imagenes_url?: unknown }).imagenes_url;
    const imagenesDraft = Array.isArray(imagenesRaw)
      ? imagenesRaw.filter((item): item is string => typeof item === "string")
      : typeof imagenesRaw === "string"
        ? imagenesRaw
            .split(",")
            .map((url: string) => url.trim())
            .filter(Boolean)
        : [];
    return {
      nombre: typeof parsed.nombre === "string" ? parsed.nombre : "",
      descripcion: typeof parsed.descripcion === "string" ? parsed.descripcion : "",
      precio_base: parsed.precio_base ?? 0,
      imagenes_url: imagenesDraft,
      is_active: typeof parsed.is_active === "boolean" ? parsed.is_active : true,
      categoria_id: toNumberOrEmpty(parsed.categoria_id) || categoriaDesdeFormatoViejo,
      ingredientes: (parsed.ingredientes as IngredientesSeleccionados) || {},
      ingredienteSearch: typeof parsed.ingredienteSearch === "string" ? parsed.ingredienteSearch : "",
    };
  } catch {
    return null;
  }
};

const hasDraftContent = (form: EstadoFormulario, ingredienteSearch: string) => {
  return Boolean(
    form.nombre.trim() ||
      form.descripcion.trim() ||
      Number(form.precio_base) > 0 ||
      form.imagenes_url.length > 0 ||
      form.categoria_id ||
      Object.keys(form.ingredientes).length > 0 ||
      ingredienteSearch.trim(),
  );
};

const unidadCargaReceta = (unidad?: string | null) => {
  const normalized = (unidad || "unidad").trim().toLowerCase();
  if (["gr", "g", "gramo", "gramos", "kg", "kilo", "kilos", "kilogramo", "kilogramos"].includes(normalized)) {
    return "gr";
  }
  if (["litro", "litros", "l", "ml", "mililitro", "mililitros"].includes(normalized)) {
    return "ml";
  }
  return unidad || "unidad";
};

const isMedallonLike = (nombre?: string | null) => {
  const normalized = (nombre || "").trim().toLowerCase();
  return normalized.includes("medallon") || normalized.includes("medallÃ³n");
};

const resolveIngredientDisplayUnit = (nombre?: string | null, unidad?: string | null) => {
  if (isMedallonLike(nombre)) return "unidad";
  return unidad || "unidad";
};

const FormularioProducto: React.FC<Props> = ({ productoAEditar, onCancelarEdicion, onSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { agregar, editar } = useProductos();
  const { showToast } = useToast();
  const { categorias: listaCategorias } = useCategorias();
  const { ingredientes: listaIngredientes } = useIngredientes();

  const categoriasActivas = useMemo(
    () =>
      listaCategorias
        .filter((cat) => cat.id && cat.is_active !== false)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [listaCategorias],
  );

  const categoriasById = useMemo(
    () => new Map(categoriasActivas.filter((cat) => cat.id).map((cat) => [Number(cat.id), cat])),
    [categoriasActivas],
  );

  const categoriasChildrenByParent = useMemo(() => {
    const map = new Map<number | null, typeof categoriasActivas>();
    for (const cat of categoriasActivas) {
      const key = cat.parent_id ?? null;
      const arr = map.get(key) || [];
      arr.push(cat);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    }
    return map;
  }, [categoriasActivas]);

  const shouldRestoreDraft = Boolean(
    !productoAEditar && (location.state as { restoreDraft?: boolean } | null)?.restoreDraft,
  );

  const [datosForm, setDatosForm] = useState<EstadoFormulario>(() => {
    if (productoAEditar) {
      return {
        nombre: productoAEditar.nombre,
        descripcion: productoAEditar.descripcion || "",
        precio_base: productoAEditar.precio_base,
        imagenes_url: productoAEditar.imagenes_url || [],
        is_active: productoAEditar.is_active ?? true,
        categoria_id: productoAEditar.categorias?.[0]?.id ?? "",
        ingredientes: (productoAEditar.ingredientes || []).reduce((acc, ing) => {
          if (ing.id) acc[ing.id] = String(ing.cantidad ?? 1);
          return acc;
        }, {} as IngredientesSeleccionados),
      };
    }

    const draft = shouldRestoreDraft ? parseDraft() : null;
    if (draft) {
      return {
        nombre: draft.nombre,
        descripcion: draft.descripcion,
        precio_base: draft.precio_base,
        imagenes_url: draft.imagenes_url,
        is_active: draft.is_active,
        categoria_id: draft.categoria_id,
        ingredientes: draft.ingredientes,
      };
    }

    return estadoInicial;
  });

  const [ingredienteSearch, setIngredienteSearch] = useState(() => {
    const draft = shouldRestoreDraft ? parseDraft() : null;
    return draft?.ingredienteSearch ?? "";
  });
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [imagenUrlInput, setImagenUrlInput] = useState("");
  const [imagenError, setImagenError] = useState<string | null>(null);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const apiOrigin = useMemo(
    () => (api.defaults.baseURL || "").replace(/\/api\/v1\/?$/, ""),
    [],
  );

  const resolveImageUrl = (url: string) => {
    if (!url) return url;
    if (url.startsWith("/uploads/")) return `${apiOrigin}${url}`;
    return url;
  };

  useEffect(() => {
    if (!productoAEditar) return;
    setDatosForm({
      nombre: productoAEditar.nombre,
      descripcion: productoAEditar.descripcion || "",
      precio_base: productoAEditar.precio_base,
      imagenes_url: productoAEditar.imagenes_url || [],
      is_active: productoAEditar.is_active ?? true,
      categoria_id: productoAEditar.categorias?.[0]?.id ?? "",
      ingredientes: (productoAEditar.ingredientes || []).reduce((acc, ing) => {
        if (ing.id) acc[ing.id] = String(ing.cantidad ?? 1);
        return acc;
      }, {} as IngredientesSeleccionados),
    });
    setIngredienteSearch("");
    setImagenUrlInput("");
    setImagenError(null);
  }, [productoAEditar]);

  useEffect(() => {
    if (productoAEditar) return;

    if (!hasDraftContent(datosForm, ingredienteSearch)) {
      sessionStorage.removeItem(DRAFT_KEY);
      return;
    }

    const payload: DraftPayload = {
      ...datosForm,
      ingredienteSearch,
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  }, [productoAEditar, datosForm, ingredienteSearch]);

  const [categoriaDropdownOpen, setCategoriaDropdownOpen] = useState(false);
  const [categoriaSearch, setCategoriaSearch] = useState("");
  const [expandedCategoriaIds, setExpandedCategoriaIds] = useState<Set<number>>(new Set());
  const categoriaDropdownRef = useRef<HTMLDivElement | null>(null);

  const getCategoriaPathLabel = (categoriaId: number) => {
    const parts: string[] = [];
    const visited = new Set<number>();
    let currentId: number | null = categoriaId;
    while (currentId !== null) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const current = categoriasById.get(currentId);
      if (!current) break;
      parts.unshift(current.nombre);
      currentId = current.parent_id ?? null;
    }
    return parts.join(" > ");
  };

  const categoriaSeleccionadaLabel = useMemo(() => {
    const selectedId = Number(datosForm.categoria_id);
    if (!selectedId || !Number.isFinite(selectedId)) return "Seleccionar categoria...";
    return getCategoriaPathLabel(selectedId) || "Seleccionar categoria...";
  }, [datosForm.categoria_id, categoriasById]);

  const categoriasBusqueda = useMemo(() => {
    const term = categoriaSearch.trim().toLowerCase();
    if (!term) return [];
    return categoriasActivas
      .filter((cat) => cat.id)
      .map((cat) => ({
        id: Number(cat.id),
        nombre: cat.nombre,
        pathLabel: getCategoriaPathLabel(Number(cat.id)),
      }))
      .filter((item) => item.pathLabel.toLowerCase().includes(term))
      .sort((a, b) => a.pathLabel.localeCompare(b.pathLabel, "es"));
  }, [categoriaSearch, categoriasActivas, categoriasById]);

  const categoriasRaiz = useMemo(() => categoriasChildrenByParent.get(null) || [], [categoriasChildrenByParent]);

  useEffect(() => {
    if (!categoriaDropdownOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!categoriaDropdownRef.current) return;
      if (!categoriaDropdownRef.current.contains(event.target as Node)) {
        setCategoriaDropdownOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCategoriaDropdownOpen(false);
      }
    };
    window.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onEscape);
    };
  }, [categoriaDropdownOpen]);

  useEffect(() => {
    if (!categoriaDropdownOpen && categoriaSearch) {
      setCategoriaSearch("");
    }
  }, [categoriaDropdownOpen, categoriaSearch]);

  useEffect(() => {
    if (!categoriaDropdownOpen) return;
    const selectedId = Number(datosForm.categoria_id);
    if (!selectedId || !Number.isFinite(selectedId)) return;

    const chain: number[] = [];
    let current = categoriasById.get(selectedId);
    while (current?.parent_id) {
      chain.push(Number(current.parent_id));
      current = categoriasById.get(Number(current.parent_id));
    }
    if (chain.length === 0) return;

    setExpandedCategoriaIds((prev) => {
      const next = new Set(prev);
      chain.forEach((id) => next.add(id));
      return next;
    });
  }, [categoriaDropdownOpen, datosForm.categoria_id, categoriasById]);

  const ingredientesFiltrados = useMemo(() => {
    const term = ingredienteSearch.trim().toLowerCase();
    return listaIngredientes
      .filter((ing) => ing.is_active !== false)
      .filter((ing) => (term ? ing.nombre.toLowerCase().includes(term) : true))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [listaIngredientes, ingredienteSearch]);

  const ingredientesSeleccionados = useMemo(
    () =>
      listaIngredientes
        .filter((ing) => ing.id && Object.prototype.hasOwnProperty.call(datosForm.ingredientes, ing.id))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [listaIngredientes, datosForm.ingredientes],
  );

  const validarFormulario = () => {
    const nuevosErrores: ErroresFormulario = {};

    if (!datosForm.nombre.trim()) {
      nuevosErrores.nombre = "El nombre es obligatorio.";
    } else if (datosForm.nombre.trim().length < 3) {
      nuevosErrores.nombre = "El nombre debe tener al menos 3 caracteres.";
    }

    if (datosForm.precio_base === "" || Number(datosForm.precio_base) <= 0) {
      nuevosErrores.precio_base = "El precio es obligatorio.";
    }

    if (!datosForm.categoria_id) {
      nuevosErrores.categoria_id = "Debes seleccionar una categoria.";
    }

    if (Object.keys(datosForm.ingredientes).length === 0) {
      nuevosErrores.ingredientes = "Debes seleccionar al menos un ingrediente.";
    }

    for (const [id, cantidadRaw] of Object.entries(datosForm.ingredientes)) {
      const cantidad = Number(cantidadRaw);
      if (cantidadRaw === "" || Number.isNaN(cantidad) || cantidad <= 0) {
        nuevosErrores.ingredientes = `La cantidad del ingrediente #${id} debe ser mayor a 0.`;
        break;
      }
    }

    return nuevosErrores;
  };

  const guardarBorradorAntesDeCrearCategoria = () => {
    if (productoAEditar) return;
    const payload: DraftPayload = { ...datosForm, ingredienteSearch };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  };

  const navegarANuevaCategoria = () => {
    guardarBorradorAntesDeCrearCategoria();
    navigate("/categorias/nueva", {
      state: {
        returnTo: `${location.pathname}${location.search}`,
      },
    });
  };

  const navegarANuevoIngrediente = (nombreSugerido?: string) => {
    guardarBorradorAntesDeCrearCategoria();
    navigate("/ingredientes/nuevo", {
      state: {
        returnTo: `${location.pathname}${location.search}`,
        suggestedName: nombreSugerido?.trim() || undefined,
      },
    });
  };

  const cerrarSelectorCategoria = () => {
    setCategoriaDropdownOpen(false);
    setCategoriaSearch("");
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const seleccionarCategoria = (value: number | typeof CREATE_CATEGORY_OPTION) => {
    if (value === CREATE_CATEGORY_OPTION) {
      cerrarSelectorCategoria();
      navegarANuevaCategoria();
      return;
    }
    setDatosForm((prev) => ({ ...prev, categoria_id: value }));
    cerrarSelectorCategoria();
  };

  const toggleCategoriaExpandida = (categoriaId: number) => {
    setExpandedCategoriaIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoriaId)) next.delete(categoriaId);
      else next.add(categoriaId);
      return next;
    });
  };

  const renderCategoriaTreeRows = (items: typeof categoriasActivas, depth = 0): React.ReactNode => {
    return items.map((cat) => {
      if (!cat.id) return null;
      const children = categoriasChildrenByParent.get(Number(cat.id)) || [];
      const hasChildren = children.length > 0;
      const expanded = expandedCategoriaIds.has(Number(cat.id));
      const selected = Number(datosForm.categoria_id) === Number(cat.id);

      return (
        <div key={cat.id}>
          <div
            onClick={() => {
              if (hasChildren) toggleCategoriaExpandida(Number(cat.id));
            }}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              seleccionarCategoria(Number(cat.id));
            }}
            className={`flex items-center gap-2 px-3 py-2 border-l-2 ${hasChildren ? "cursor-pointer" : ""} ${
              selected ? "bg-blue-50 border-blue-500" : "border-transparent hover:bg-gray-50"
            }`}
            style={{ paddingLeft: `${12 + depth * 18}px` }}
          >
            <span
              className={`text-gray-500 text-xs w-5 h-5 inline-flex items-center justify-center rounded ${
                hasChildren ? "bg-gray-100" : ""
              }`}
              aria-hidden="true"
            >
              {hasChildren ? (expanded ? "v" : ">") : "•"}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                seleccionarCategoria(Number(cat.id));
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                seleccionarCategoria(Number(cat.id));
              }}
              className={`inline-flex max-w-full min-w-0 text-left hover:underline ${
                selected ? "text-blue-700 font-semibold" : "text-gray-700 font-medium"
              }`}
            >
              <span className="truncate">{cat.nombre}</span>
            </button>
          </div>
          {hasChildren && expanded && <div>{renderCategoriaTreeRows(children, depth + 1)}</div>}
        </div>
      );
    });
  };

  const validarImagenUrl = (url: string): string | null => {
    if (!/^https?:\/\//i.test(url) && !url.startsWith("/uploads/")) {
      return "Ingresa un link valido (http/https) o ruta interna.";
    }
    return null;
  };

  const agregarImagenUrl = (urlOverride?: string) => {
    const url = (urlOverride ?? imagenUrlInput).trim();
    if (!url) return;
    const validationError = validarImagenUrl(url);
    if (validationError) {
      setImagenError(validationError);
      return;
    }
    if (datosForm.imagenes_url.includes(url)) {
      setImagenError("Ese link ya esta agregado.");
      setImagenUrlInput("");
      return;
    }
    if (datosForm.imagenes_url.length >= 20) {
      setImagenError("Maximo 20 imagenes por producto.");
      return;
    }
    setDatosForm((prev) => ({ ...prev, imagenes_url: [...prev.imagenes_url, url] }));
    setImagenError(null);
    setImagenUrlInput("");
  };

  const quitarImagen = (index: number) => {
    setDatosForm((prev) => ({
      ...prev,
      imagenes_url: prev.imagenes_url.filter((_, idx) => idx !== index),
    }));
  };

  const subirArchivosImagen = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const restantes = 20 - datosForm.imagenes_url.length;
    if (restantes <= 0) {
      setImagenError("Ya alcanzaste el maximo de 20 imagenes.");
      return;
    }

    const selected = Array.from(files).slice(0, restantes);
    setSubiendoImagen(true);
    setImagenError(null);
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const formData = new FormData();
        formData.append("file", file);
        const { data } = await api.post<{ url: string }>("/productos/upload-imagen", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploaded.push(data.url);
      }
      setDatosForm((prev) => ({
        ...prev,
        imagenes_url: [...prev.imagenes_url, ...uploaded],
      }));
    } catch (error) {
      setImagenError(getApiErrorMessage(error, "No se pudieron subir las imagenes."));
    } finally {
      setSubiendoImagen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setDatosForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    if (type === "number" && name === "precio_base") {
      if (value === "") {
        setDatosForm((prev) => ({ ...prev, [name]: value }));
        return;
      }
      const numericValue = Number(value.replace(",", "."));
      setDatosForm((prev) => ({ ...prev, [name]: Math.max(0, numericValue) }));
      return;
    }

    if (name === "categoria_id") {
      if (value === CREATE_CATEGORY_OPTION) {
        navegarANuevaCategoria();
        return;
      }
      setDatosForm((prev) => ({ ...prev, categoria_id: value }));
      return;
    }

    setDatosForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleIngrediente = (id: number) => {
    setDatosForm((prev) => {
      const next = { ...prev.ingredientes };
      if (next[id] !== undefined) {
        delete next[id];
      } else {
        next[id] = "1";
      }
      return { ...prev, ingredientes: next };
    });
  };

  const cambiarCantidadIngrediente = (id: number, value: string) => {
    setDatosForm((prev) => ({
      ...prev,
      ingredientes: {
        ...prev.ingredientes,
        [id]: value,
      },
    }));
  };

  const quitarIngredienteSeleccionado = (id: number) => {
    setDatosForm((prev) => {
      const next = { ...prev.ingredientes };
      delete next[id];
      return { ...prev, ingredientes: next };
    });
  };

  const enviarFormulario = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const imagenesFinales = [...datosForm.imagenes_url];
    const pendingImageUrl = imagenUrlInput.trim();
    if (pendingImageUrl) {
      const validationError = validarImagenUrl(pendingImageUrl);
      if (validationError) {
        setImagenError(validationError);
        return;
      }
      if (!imagenesFinales.includes(pendingImageUrl)) {
        if (imagenesFinales.length >= 20) {
          setImagenError("Maximo 20 imagenes por producto.");
          return;
        }
        imagenesFinales.push(pendingImageUrl);
      }
      setImagenError(null);
      setImagenUrlInput("");
      setDatosForm((prev) => ({ ...prev, imagenes_url: imagenesFinales }));
    }

    const nuevosErrores = validarFormulario();
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      const detalleErrores = Object.values(nuevosErrores).filter(Boolean).join(" ");
      setSubmitError(detalleErrores || "Hay errores en el formulario.");
      return;
    }

    const ingredientesPayload = Object.entries(datosForm.ingredientes).map(([id, cantidad]) => ({
      ingrediente_id: Number(id),
      cantidad: Number(cantidad),
    }));

    const categoriaPayload = Number(datosForm.categoria_id);

    const p = new Producto({
      nombre: datosForm.nombre.trim(),
      descripcion: datosForm.descripcion.trim() || null,
      precio_base: Number(datosForm.precio_base),
      imagenes_url: imagenesFinales,
      is_active: datosForm.is_active,
      categorias: [{ categoria_id: categoriaPayload }] as unknown as Producto["categorias"],
      ingredientes: ingredientesPayload as unknown as Producto["ingredientes"],
    });

    try {
      if (productoAEditar?.id) {
        p.id = productoAEditar.id;
        await editar(p);
        showToast("El producto se ha actualizado correctamente.");
        onSuccess?.(p);
      } else {
        const creado = await agregar(p);
        showToast("El producto se ha creado correctamente.");
        onSuccess?.(creado);
      }
      setDatosForm(estadoInicial);
      setIngredienteSearch("");
      setImagenUrlInput("");
      setImagenError(null);
      setErrores({});
      sessionStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, "No se pudo actualizar el producto."));
    }
  };

  return (
    <form onSubmit={enviarFormulario} className="space-y-6">
      <p className="text-sm text-gray-500">Los campos con * son obligatorios.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:items-start">
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Precio Base ($) *</label>
          <input
            type="number"
            min={0}
            step={1}
            name="precio_base"
            value={datosForm.precio_base}
            onChange={handleChange}
            className={`w-full border rounded p-2 ${errores.precio_base ? "border-red-500" : "border-gray-300"}`}
          />
          {errores.precio_base && <p className="text-red-500 text-xs mt-1">{errores.precio_base}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Es un producto activo?</label>
          <div className="py-2">
            <label htmlFor="is_active" className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={datosForm.is_active}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Producto activo
            </label>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
          <textarea
            name="descripcion"
            rows={3}
            value={datosForm.descripcion}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Imagenes</label>
          <div className="h-full min-h-[8rem] rounded border border-gray-200 p-3 flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                type="url"
                value={imagenUrlInput}
                onChange={(e) => setImagenUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarImagenUrl();
                  }
                }}
                placeholder="Pega un link directo de imagen (https://...)"
                className="w-full border border-gray-300 rounded p-2"
              />
              <button
                type="button"
                onClick={() => agregarImagenUrl()}
                className="px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 whitespace-nowrap"
              >
                Agregar link
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => void subirArchivosImagen(e.target.files)}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => void subirArchivosImagen(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-3 py-2 rounded bg-gray-200 text-gray-800 text-sm hover:bg-gray-300 text-center"
              >
                Subir archivo
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full px-3 py-2 rounded bg-gray-200 text-gray-800 text-sm hover:bg-gray-300 text-center"
              >
                Tomar foto
              </button>
              {subiendoImagen && <span className="text-sm text-gray-500 self-center">Subiendo...</span>}
            </div>

            {imagenError && <p className="text-xs text-red-600">{imagenError}</p>}

            {datosForm.imagenes_url.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {datosForm.imagenes_url.map((img, idx) => (
                  <div key={`${img}-${idx}`} className="relative border rounded overflow-hidden bg-gray-50">
                    <img
                      src={resolveImageUrl(img)}
                      alt={`Imagen ${idx + 1}`}
                      className="w-full h-24 object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="p-1 text-[10px] text-gray-500 truncate">{img}</div>
                    <button
                      type="button"
                      onClick={() => quitarImagen(idx)}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 text-white text-xs hover:bg-black"
                      aria-label={`Quitar imagen ${idx + 1}`}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200 space-y-6">
        <div className="space-y-3">
          <h3 className="block text-sm font-medium text-gray-700 mb-1">Categoria *</h3>
          <div ref={categoriaDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setCategoriaDropdownOpen((prev) => !prev)}
              className={`w-full border rounded p-2 bg-white text-left flex items-center justify-between ${errores.categoria_id ? "border-red-500" : "border-gray-300"}`}
              aria-haspopup="listbox"
              aria-expanded={categoriaDropdownOpen}
            >
              <span className={datosForm.categoria_id ? "text-gray-900" : "text-gray-500"}>{categoriaSeleccionadaLabel}</span>
              <span className="text-gray-500">{categoriaDropdownOpen ? "^" : "v"}</span>
            </button>

            {categoriaDropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-40 mt-1 rounded-lg border border-gray-300 bg-white shadow-lg">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <input
                      type="text"
                      value={categoriaSearch}
                      onChange={(e) => setCategoriaSearch(e.target.value)}
                      placeholder="Buscar categoria..."
                      className="w-full border border-gray-300 rounded p-2 pr-10 text-sm"
                    />
                    {categoriaSearch && (
                      <button
                        type="button"
                        onClick={() => setCategoriaSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                        aria-label="Limpiar busqueda de categorias"
                      >
                        x
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto py-1" role="listbox">
                  {categoriaSearch.trim() ? (
                    categoriasBusqueda.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-500">No hay categorias que coincidan.</p>
                    ) : (
                      <div className="py-1">
                        {categoriasBusqueda.map((item) => {
                          const selected = Number(datosForm.categoria_id) === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => seleccionarCategoria(item.id)}
                              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                selected ? "bg-blue-50 text-blue-700 border-l-4 border-blue-500" : "hover:bg-gray-50"
                              }`}
                            >
                              {item.pathLabel}
                            </button>
                          );
                        })}
                      </div>
                    )
                  ) : categoriasRaiz.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-500">No hay categorias disponibles.</p>
                  ) : (
                    <div className="py-1">{renderCategoriaTreeRows(categoriasRaiz, 0)}</div>
                  )}

                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => seleccionarCategoria(CREATE_CATEGORY_OPTION)}
                      className="w-full text-left px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                    >
                      + Crear nueva categoria
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={navegarANuevaCategoria}
            className="w-full text-sm font-medium bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-1"
          >
            <span className="font-bold text-blue-600">Crear categoria</span>
          </button>

          {errores.categoria_id && <p className="text-red-500 text-xs mt-1">{errores.categoria_id}</p>}
        </div>

        <div className="space-y-3">
          <h3 className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
            Ingredientes y cantidades
            <InfoHint text="Para ingredientes solidos, la cantidad se ingresa en gramos (si queres 1 kg, carga 1000). Para ingredientes liquidos, la cantidad se ingresa en ml (si queres 1 litro, carga 1000). El sistema convierte automaticamente al mostrar stock." />
          </h3>

          <div className="relative">
            <input
              type="text"
              value={ingredienteSearch}
              onChange={(e) => setIngredienteSearch(e.target.value)}
              placeholder="Buscar ingrediente..."
              className="w-full border border-gray-300 rounded p-2 pr-10"
            />
            {ingredienteSearch && (
              <button
                type="button"
                onClick={() => setIngredienteSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                aria-label="Limpiar busqueda de ingredientes"
              >
                x
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => navegarANuevoIngrediente(ingredienteSearch)}
            className="w-full text-sm font-medium bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-1"
          >
            <span className="font-bold text-blue-600">Crear ingrediente</span>
          </button>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="text-sm font-medium text-blue-900">Seleccionados ({ingredientesSeleccionados.length})</p>
            {ingredientesSeleccionados.length === 0 ? (
              <p className="text-xs text-blue-800 mt-1">Todavia no agregaste ingredientes.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {ingredientesSeleccionados.map((ing) => (
                  <span
                    key={ing.id}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-3 py-1 text-xs"
                  >
                    {ing.nombre}
                    <button
                      type="button"
                      onClick={() => ing.id && quitarIngredienteSeleccionado(ing.id)}
                      className="rounded-full bg-blue-700 px-1.5 py-0.5 leading-none hover:bg-blue-800"
                      aria-label={`Quitar ${ing.nombre}`}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto pr-1 space-y-3">
            {ingredientesFiltrados.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">No hay ingredientes que coincidan con la busqueda.</p>
                <button
                  type="button"
                  onClick={() => navegarANuevoIngrediente(ingredienteSearch)}
                  className="text-sm text-blue-700 hover:text-blue-900 underline underline-offset-2"
                >
                  {ingredienteSearch.trim()
                    ? `Crear ingrediente "${ingredienteSearch.trim()}"`
                    : "Crear ingrediente nuevo"}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ingredientesFiltrados.map((ing) => {
                const seleccionado = ing.id
                  ? Object.prototype.hasOwnProperty.call(datosForm.ingredientes, ing.id)
                  : false;
                const stock = Number(ing.stock_cantidad ?? 0);
                const sinStock = stock <= 0;
                const unidadVisible = resolveIngredientDisplayUnit(ing.nombre, ing.unidad_medida);
                return (
                  <div
                    key={ing.id}
                    className={`rounded border p-3 ${
                      sinStock ? "bg-zinc-300 border-zinc-400 text-zinc-700" : "border-gray-200 bg-white"
                    }`}
                  >
                    <label className="flex items-center justify-between gap-2 text-sm cursor-pointer">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={seleccionado}
                          onChange={() => ing.id && toggleIngrediente(ing.id)}
                          disabled={sinStock}
                          className="text-blue-600 rounded"
                        />
                        {ing.nombre}
                      </span>
                      {sinStock && <span className="text-xs text-zinc-700 font-semibold">Sin stock</span>}
                    </label>

                    {seleccionado && ing.id && (
                      <div className="mt-2">
                        <label className="block text-xs text-gray-600 mb-1">
                          Cantidad usada ({unidadCargaReceta(unidadVisible)}) por unidad de producto
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={unidadVisible === "unidad" ? 1 : 0.01}
                          value={datosForm.ingredientes[ing.id]}
                          onChange={(e) => cambiarCantidadIngrediente(ing.id!, e.target.value)}
                          className="w-full border rounded p-2 text-sm border-gray-300"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {errores.ingredientes && <p className="text-red-500 text-xs mt-1">{errores.ingredientes}</p>}
        </div>

      </div>

      <div className="flex justify-end gap-2 pt-4">
        {submitError && (
          <p className="mr-auto text-sm text-red-600 self-center">{submitError}</p>
        )}
        {(productoAEditar || onCancelarEdicion) && (
          <button
            type="button"
            onClick={onCancelarEdicion}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancelar
          </button>
        )}
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-medium">
          {productoAEditar ? "Actualizar Producto" : "Guardar Producto"}
        </button>
      </div>
    </form>
  );
};

export default FormularioProducto;
