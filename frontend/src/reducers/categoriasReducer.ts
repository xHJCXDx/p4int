import { Categoria } from "../models/Categoria";

export type Action =
    | { type: "GET_CATEGORIAS"; payload: Categoria[] }
    | { type: "AGREGAR"; payload: Categoria }
    | { type: "ELIMINAR"; payload: number }
    | { type: "RESET"; payload: Categoria[] }
    | { type: "EDITAR"; payload: Categoria }
    | { type: "SET"; payload: Categoria[] };

export const categoriasReducer = (state: Categoria[], action: Action): Categoria[] => {
    switch (action.type) {
        case "GET_CATEGORIAS":
        case "SET":
        case "RESET":
            return action.payload;
        case "AGREGAR":
            return [...state, action.payload];
        case "ELIMINAR":
            return state.filter(c => c.id !== action.payload);
        case "EDITAR":
            return state.map(c => c.id === action.payload.id ? action.payload : c);
        default:
            return state;
    }
};
