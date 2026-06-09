from typing import Dict
from sqlmodel import Session
from app.modules.categoria.model import Categoria
from app.modules.categoria.unit_of_work import CategoriaUnitOfWork


def seed_categorias(session: Session) -> Dict[str, Categoria]:
    """Seed de categorías. Retorna dict nombre->Categoria para uso en seed_productos."""
    categorias_data = [
        {
            "nombre": "Pizzas",
            "descripcion": "Pizzas artesanales",
            "parent_id": None,
            "imagen_url": "https://via.placeholder.com/200?text=Pizzas"
        },
        {
            "nombre": "Empanadas",
            "descripcion": "Empanadas caseras",
            "parent_id": None,
            "imagen_url": "https://via.placeholder.com/200?text=Empanadas"
        },
        {
            "nombre": "Bebidas",
            "descripcion": "Bebidas frías y calientes",
            "parent_id": None,
            "imagen_url": "https://via.placeholder.com/200?text=Bebidas"
        },
        {
            "nombre": "Pizzas Dulces",
            "descripcion": "Pizzas de postre",
            "parent_id": 1,
            "imagen_url": "https://via.placeholder.com/200?text=Pizzas+Dulces"
        },
    ]

    categorias = {}
    with CategoriaUnitOfWork(session) as uow:
        for cat_data in categorias_data:
            existing = uow.categorias.get_by_nombre(cat_data["nombre"])
            if not existing:
                cat = Categoria(**cat_data)
                uow.categorias.create(cat)
                uow.categorias.flush()
                categorias[cat_data["nombre"]] = cat
            else:
                categorias[cat_data["nombre"]] = existing
    return categorias
