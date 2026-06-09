from typing import Dict
from sqlmodel import Session
from app.modules.ingrediente.model import Ingrediente
from app.modules.ingrediente.unit_of_work import IngredienteUnitOfWork


def seed_ingredientes(session: Session) -> Dict[str, Ingrediente]:
    """Seed de ingredientes. Retorna dict nombre->Ingrediente para uso en seed_productos."""
    ingredientes_data = [
        {"nombre": "Queso Mozzarella", "descripcion": "Queso fresco derretible", "es_alergeno": False, "stock_cantidad": 200, "unidad_medida_codigo": "g"},
        {"nombre": "Tomate", "descripcion": "Tomate fresco", "es_alergeno": False, "stock_cantidad": 150, "unidad_medida_codigo": "u"},
        {"nombre": "Oregano", "descripcion": "Hierba aromática", "es_alergeno": False, "stock_cantidad": 300, "unidad_medida_codigo": "g"},
        {"nombre": "Maní", "descripcion": "Cacahuete", "es_alergeno": True, "stock_cantidad": 50, "unidad_medida_codigo": "g"},
        {"nombre": "Leche", "descripcion": "Leche fresca", "es_alergeno": True, "stock_cantidad": 100, "unidad_medida_codigo": "l"},
        {"nombre": "Huevo", "descripcion": "Huevo fresco", "es_alergeno": True, "stock_cantidad": 120, "unidad_medida_codigo": "u"},
        {"nombre": "Gluten", "descripcion": "Harina con gluten", "es_alergeno": True, "stock_cantidad": 250, "unidad_medida_codigo": "kg"},
        {"nombre": "Carne molida", "descripcion": "Carne vacuna molida", "es_alergeno": False, "stock_cantidad": 100, "unidad_medida_codigo": "kg"},
        {"nombre": "Cebolla", "descripcion": "Cebolla fresca", "es_alergeno": False, "stock_cantidad": 180, "unidad_medida_codigo": "u"},
        {"nombre": "Ajo", "descripcion": "Ajo fresco", "es_alergeno": False, "stock_cantidad": 200, "unidad_medida_codigo": "u"},
        {"nombre": "Coca-Cola 2L", "descripcion": "Botella de Coca-Cola 2 litros", "es_alergeno": False, "stock_cantidad": 200, "unidad_medida_codigo": "u"},
        {"nombre": "Naranja", "descripcion": "Naranja fresca para exprimir", "es_alergeno": False, "stock_cantidad": 150, "unidad_medida_codigo": "u"},
    ]

    ingredientes = {}
    with IngredienteUnitOfWork(session) as uow:
        for ing_data in ingredientes_data:
            existing = uow.ingredientes.get_by_nombre(ing_data["nombre"])
            if not existing:
                ing = Ingrediente(**ing_data)
                uow.ingredientes.create(ing)
                uow.ingredientes.flush()
                ingredientes[ing_data["nombre"]] = ing
            else:
                ingredientes[ing_data["nombre"]] = existing
    return ingredientes
