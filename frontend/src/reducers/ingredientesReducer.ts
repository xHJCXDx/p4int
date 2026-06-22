import { Ingrediente } from "../models/Ingrediente";

export type IngredienteAction =
    | { type: "GET_INGREDIENTES"; payload: Ingrediente[] }
    | { type: "AGREGAR"; payload: Ingrediente }
    | { type: "ELIMINAR"; payload: number }
    | { type: "RESET"; payload: Ingrediente[] }
    | { type: "EDITAR"; payload: Ingrediente }
    | { type: "SET"; payload: Ingrediente[] };

export const ingredientesReducer = (state: Ingrediente[], action: IngredienteAction): Ingrediente[] => {
    switch (action.type) {
        case "GET_INGREDIENTES":
        case "SET":
        case "RESET":
            return action.payload;
        case "AGREGAR":
            return [...state, action.payload];
        case "ELIMINAR":
            return state.filter(i => i.id !== action.payload);
        case "EDITAR":
            return state.map(i => i.id === action.payload.id ? action.payload : i);
        default:
            return state;
    }
};
