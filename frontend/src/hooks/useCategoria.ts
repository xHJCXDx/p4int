import { useContext } from "react";
import { CategoriasContext } from "../context/CategoriaContext";

export const useCategorias = () => {
    const context = useContext(CategoriasContext);
    if (!context) throw new Error("useCategorias debe usarse dentro del Provider");
    return context;
};
