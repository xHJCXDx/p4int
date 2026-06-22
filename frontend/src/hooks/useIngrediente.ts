import { useContext } from "react";
import { IngredientesContext } from "../context/IngredienteContext";

export const useIngredientes = () => {
    const context = useContext(IngredientesContext);
    if (!context) throw new Error("useIngredientes debe usarse dentro del Provider");
    return context;
};
