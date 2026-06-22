import { useContext } from "react";
import { ProductosContext } from "../context/ProductoContext";

export const useProductos = () => {
    const context = useContext(ProductosContext);
    if (!context) throw new Error("useProductos debe usarse dentro del Provider");
    return context;
};
