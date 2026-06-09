from typing import Dict
from sqlmodel import Session
from app.modules.producto.model import Producto
from app.modules.producto.unit_of_work import ProductoUnitOfWork
from app.modules.ingrediente.model import Ingrediente
from app.modules.categoria.model import Categoria


def seed_productos(session: Session, categorias: Dict[str, Categoria], ingredientes: Dict[str, Ingrediente]) -> None:
    """Seed de productos con sus relaciones a categorías e ingredientes."""
    productos_data = [
        {
            "nombre": "Pizza Margherita",
            "descripcion": "Pizza clásica italiana con queso y tomate",
            "precio_base": 250.0,
            "categoria_id": categorias["Pizzas"].id,
            "ingredientes": [
                {"ref": "Queso Mozzarella", "cantidad": 3, "es_removible": True},
                {"ref": "Tomate", "cantidad": 2, "es_removible": True},
                {"ref": "Oregano", "cantidad": 1, "es_removible": True},
            ]
        },
        {
            "nombre": "Pizza de Carne",
            "descripcion": "Pizza con carne molida, cebolla y ajo",
            "precio_base": 290.0,
            "categoria_id": categorias["Pizzas"].id,
            "ingredientes": [
                {"ref": "Carne molida", "cantidad": 3, "es_removible": False},
                {"ref": "Cebolla", "cantidad": 2, "es_removible": True},
                {"ref": "Ajo", "cantidad": 1, "es_removible": True},
                {"ref": "Queso Mozzarella", "cantidad": 2, "es_removible": True},
            ]
        },
        {
            "nombre": "Empanadas de Carne",
            "descripcion": "6 empanadas de carne casera",
            "precio_base": 120.0,
            "categoria_id": categorias["Empanadas"].id,
            "ingredientes": [
                {"ref": "Carne molida", "cantidad": 2, "es_removible": False},
                {"ref": "Cebolla", "cantidad": 1, "es_removible": True},
                {"ref": "Gluten", "cantidad": 3, "es_removible": False},
            ]
        },
        {
            "nombre": "Empanadas de Queso",
            "descripcion": "6 empanadas de queso y cebolla",
            "precio_base": 100.0,
            "categoria_id": categorias["Empanadas"].id,
            "ingredientes": [
                {"ref": "Queso Mozzarella", "cantidad": 3, "es_removible": False},
                {"ref": "Cebolla", "cantidad": 1, "es_removible": True},
                {"ref": "Gluten", "cantidad": 3, "es_removible": False},
            ]
        },
        {
            "nombre": "Coca-Cola 2L",
            "descripcion": "Bebida gaseosa clásica",
            "precio_base": 65.0,
            "categoria_id": categorias["Bebidas"].id,
            "ingredientes": [
                {"ref": "Coca-Cola 2L", "cantidad": 1, "es_removible": False},
            ]
        },
        {
            "nombre": "Jugo Natural Naranja",
            "descripcion": "Jugo fresco de naranja recién exprimido",
            "precio_base": 45.0,
            "categoria_id": categorias["Bebidas"].id,
            "ingredientes": [
                {"ref": "Naranja", "cantidad": 3, "es_removible": False},
            ]
        },
        {
            "nombre": "Pizza de Chocolate",
            "descripcion": "Pizza dulce de chocolate con frutos secos",
            "precio_base": 200.0,
            "categoria_id": categorias["Pizzas Dulces"].id,
            "ingredientes": [
                {"ref": "Maní", "cantidad": 2, "es_removible": True},
                {"ref": "Leche", "cantidad": 3, "es_removible": False},
            ]
        },
    ]

    with ProductoUnitOfWork(session) as uow:
        for prod_data in productos_data:
            existing = uow.productos.get_by_nombre(prod_data["nombre"])
            if not existing:
                cat_id = prod_data.pop("categoria_id")
                ingredientes_prod = prod_data.pop("ingredientes", [])

                prod = Producto(**prod_data)
                uow.productos.create(prod)
                uow.productos.flush()

                uow.productos.create_categoria_link(prod.id, cat_id, es_principal=True)

                for ing_info in ingredientes_prod:
                    ing = ingredientes[ing_info["ref"]]
                    uow.productos.create_ingrediente_link(
                        prod.id, ing.id,
                        cantidad=ing_info["cantidad"],
                        es_removible=ing_info["es_removible"],
                    )
