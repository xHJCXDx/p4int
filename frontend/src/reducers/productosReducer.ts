import { Producto } from "../models/Producto";

export type ProductoAction =
    | { type: "GET_PRODUCTOS"; payload: Producto[] }
    | { type: "AGREGAR"; payload: Producto }
    | { type: "ELIMINAR"; payload: number }
    | { type: "RESET"; payload: Producto[] }
    | { type: "EDITAR"; payload: Producto }
    | { type: "SET"; payload: Producto[] };

export const productoReducer = (state: Producto[], action: ProductoAction): Producto[] => {
    switch (action.type) {
        case "GET_PRODUCTOS":
        case "SET":
        case "RESET":
            return action.payload;
        case "AGREGAR":
            return [...state, action.payload];
        case "ELIMINAR":
            return state.filter(p => p.id !== action.payload);
        case "EDITAR":
            return state.map(p => p.id === action.payload.id ? action.payload : p);
        default:
            return state;
    }
};
