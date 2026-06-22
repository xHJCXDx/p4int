import { useState, useEffect } from "react";

import { Ingrediente } from "../../models/Ingrediente";
import { useIngredientes } from "../../hooks/useIngrediente";
import { useToast } from "../../context/ToastContext";
import { InfoHint } from "../../components/InfoHint";

interface Props {
  ingredienteAEditar?: Ingrediente | null;
  nombreSugerido?: string;
  unidadSugerida?: "g" | "kg" | "L" | "ml" | "ud" | "porciones" | "gr" | "litros" | "unidad";
  onCancelarEdicion?: () => void;
  onSuccess?: (ingrediente: Ingrediente) => void;
}

interface ErroresFormulario {
  nombre?: string;
  unidad_medida?: string;
  stock_cantidad?: string;
}

const estadoInicial = {
  nombre: "",
  descripcion: "",
  es_alergeno: false,
  unidad_medida: "gr",
  stock_cantidad: "" as number | string,
};

const normalizarUnidad = (unidad?: string) => {
  const normalized = (unidad || "gr").trim().toLowerCase();
  if (["kg", "g", "gr", "gramo", "gramos"].includes(normalized)) return "gr";
  if (["ml", "l", "lt", "lts", "litro", "litros"].includes(normalized)) return "litros";
  if (["ud", "unidad", "unidades", "porcion", "porción", "porciones", "porc"].includes(normalized)) return "unidad";
  return "gr";
};

const FormularioIngrediente: React.FC<Props> = ({
  ingredienteAEditar,
  nombreSugerido,
  unidadSugerida = "gr",
  onCancelarEdicion,
  onSuccess,
}) => {
  const { agregar, editar } = useIngredientes();
  const { showToast } = useToast();

  const [datosForm, setDatosForm] = useState(() => {
    if (!ingredienteAEditar) return estadoInicial;
    return {
      nombre: ingredienteAEditar.nombre,
      descripcion: ingredienteAEditar.descripcion || "",
      es_alergeno: ingredienteAEditar.es_alergeno,
      unidad_medida: normalizarUnidad(ingredienteAEditar.unidad_medida),
      stock_cantidad: ingredienteAEditar.stock_cantidad ?? "",
    };
  });

  const [errores, setErrores] = useState<ErroresFormulario>({});

  useEffect(() => {
    if (ingredienteAEditar) {
      setDatosForm({
        nombre: ingredienteAEditar.nombre,
        descripcion: ingredienteAEditar.descripcion || "",
        es_alergeno: ingredienteAEditar.es_alergeno ?? false,
        unidad_medida: normalizarUnidad(ingredienteAEditar.unidad_medida),
        stock_cantidad: ingredienteAEditar.stock_cantidad ?? "",
      });
    } else {
      setDatosForm({
        ...estadoInicial,
        nombre: nombreSugerido?.trim() || "",
        unidad_medida: normalizarUnidad(unidadSugerida),
      });
    }
  }, [ingredienteAEditar, nombreSugerido, unidadSugerida]);

  const validarFormulario = () => {
    const nuevosErrores: ErroresFormulario = {};

    if (!datosForm.nombre.trim()) {
      nuevosErrores.nombre = "El nombre es obligatorio.";
    } else if (datosForm.nombre.trim().length < 2) {
      nuevosErrores.nombre = "El nombre debe tener al menos 2 caracteres.";
    }

    if (!datosForm.unidad_medida) {
      nuevosErrores.unidad_medida = "Selecciona una unidad de medida.";
    }

    if (datosForm.stock_cantidad !== "" && Number(datosForm.stock_cantidad) < 0) {
      nuevosErrores.stock_cantidad = "El stock inicial debe ser 0 o mayor.";
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

    if (name === "stock_cantidad") {
      if (value === "") {
        setDatosForm({ ...datosForm, stock_cantidad: value });
        return;
      }
      const numero = Number(value.replace(",", "."));
      setDatosForm({ ...datosForm, stock_cantidad: Math.max(0, numero) });
      return;
    }

    setDatosForm({ ...datosForm, [name]: value });
  };

  const enviarFormulario = async (e: React.FormEvent) => {
    e.preventDefault();
    const nuevosErrores = validarFormulario();
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    const i = new Ingrediente({
      nombre: datosForm.nombre.trim(),
      descripcion: datosForm.descripcion.trim() || null,
      es_alergeno: datosForm.es_alergeno,
      unidad_medida: datosForm.unidad_medida,
      stock_cantidad: datosForm.stock_cantidad === "" ? undefined : Number(datosForm.stock_cantidad),
    });

    try {
      if (ingredienteAEditar?.id) {
        i.id = ingredienteAEditar.id;
        await editar(i);
        showToast("El ingrediente se ha actualizado correctamente.");
        onSuccess?.(i);
      } else {
        const creado = await agregar(i);
        showToast("El ingrediente se ha creado correctamente.");
        onSuccess?.(creado);
      }
      setDatosForm({
        ...estadoInicial,
        nombre: nombreSugerido?.trim() || "",
        unidad_medida: normalizarUnidad(unidadSugerida),
      });
      setErrores({});
    } catch {
      // El error se muestra por contexto global; mantenemos el formulario para que el usuario corrija.
    }
  };

  return (
    <form onSubmit={enviarFormulario} className="space-y-6">
      <p className="text-sm text-gray-500">Los campos con * son obligatorios.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Ingrediente *</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de Medida *</label>
          <select
            name="unidad_medida"
            value={datosForm.unidad_medida}
            onChange={handleChange}
            className={`w-full border rounded p-2 bg-white ${errores.unidad_medida ? "border-red-500" : "border-gray-300"}`}
          >
            <option value="gr">gr</option>
            <option value="litros">lts</option>
            <option value="unidad">unidades</option>
          </select>
          {errores.unidad_medida && <p className="text-red-500 text-xs mt-1">{errores.unidad_medida}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stock Inicial
            <InfoHint text="Para solidos, carga stock en gramos (si queres 1 kg, ingresa 1000). Para liquidos, carga stock en ml (si queres 1 litro, ingresa 1000)." />
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            name="stock_cantidad"
            value={datosForm.stock_cantidad}
            onChange={handleChange}
            className={`w-full border rounded p-2 ${errores.stock_cantidad ? "border-red-500" : "border-gray-300"}`}
          />
          {errores.stock_cantidad && <p className="text-red-500 text-xs mt-1">{errores.stock_cantidad}</p>}
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

      <div className="flex items-center gap-2 mt-2">
        <input
          type="checkbox"
          id="es_alergeno"
          name="es_alergeno"
          checked={datosForm.es_alergeno}
          onChange={handleChange}
          className="w-4 h-4 text-red-600 rounded"
        />
        <label htmlFor="es_alergeno" className="text-sm text-gray-700 font-medium">
          Es un alergeno
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {(ingredienteAEditar || onCancelarEdicion) && (
          <button
            type="button"
            onClick={onCancelarEdicion}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancelar
          </button>
        )}
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-medium">
          {ingredienteAEditar ? "Actualizar Ingrediente" : "Guardar Ingrediente"}
        </button>
      </div>
    </form>
  );
};

export default FormularioIngrediente;
