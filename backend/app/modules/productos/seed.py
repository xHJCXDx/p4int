from typing import Dict
from decimal import Decimal
from sqlmodel import Session, select
from app.modules.productos.model import Producto
from app.modules.productos.unit_of_work import ProductoUnitOfWork
from app.modules.ingredientes.model import Ingrediente
from app.modules.categorias.model import Categoria
from app.modules.catalogo.model import UnidadMedida


def seed_productos(session: Session, categorias: Dict[str, Categoria], ingredientes: Dict[str, Ingrediente]) -> None:
    """Seed de productos con sus relaciones a categorías e ingredientes."""
    productos_data = [
        {
            "nombre": "Pizza Margherita",
            "descripcion": "Pizza clásica italiana con queso y tomate",
            "precio_base": 250.0,
            "stock_cantidad": 50,
            "disponible": True,
            "categoria_id": categorias["Pizzas"].id,
            "ingredientes": [
                {"ref": "Queso Mozzarella", "cantidad": Decimal("0.300"), "unidad": "kg", "es_removible": True},
                {"ref": "Tomate", "cantidad": Decimal("0.200"), "unidad": "kg", "es_removible": True},
                {"ref": "Oregano", "cantidad": Decimal("5"), "unidad": "g", "es_removible": True},
            ]
        },
        {
            "nombre": "Pizza de Carne",
            "descripcion": "Pizza con carne molida, cebolla y ajo",
            "precio_base": 290.0,
            "stock_cantidad": 30,
            "disponible": True,
            "categoria_id": categorias["Pizzas"].id,
            "ingredientes": [
                {"ref": "Carne molida", "cantidad": Decimal("0.350"), "unidad": "kg", "es_removible": False},
                {"ref": "Cebolla", "cantidad": Decimal("0.100"), "unidad": "kg", "es_removible": True},
                {"ref": "Ajo", "cantidad": Decimal("10"), "unidad": "g", "es_removible": True},
                {"ref": "Queso Mozzarella", "cantidad": Decimal("0.250"), "unidad": "kg", "es_removible": True},
            ]
        },
        {
            "nombre": "Empanadas de Carne",
            "descripcion": "6 empanadas de carne casera",
            "precio_base": 120.0,
            "stock_cantidad": 40,
            "disponible": True,
            "categoria_id": categorias["Empanadas"].id,
            "ingredientes": [
                {"ref": "Carne molida", "cantidad": Decimal("0.200"), "unidad": "kg", "es_removible": False},
                {"ref": "Cebolla", "cantidad": Decimal("0.050"), "unidad": "kg", "es_removible": True},
                {"ref": "Gluten", "cantidad": Decimal("0.300"), "unidad": "kg", "es_removible": False},
            ]
        },
        {
            "nombre": "Empanadas de Queso",
            "descripcion": "6 empanadas de queso y cebolla",
            "precio_base": 100.0,
            "stock_cantidad": 40,
            "disponible": True,
            "categoria_id": categorias["Empanadas"].id,
            "ingredientes": [
                {"ref": "Queso Mozzarella", "cantidad": Decimal("0.300"), "unidad": "kg", "es_removible": False},
                {"ref": "Cebolla", "cantidad": Decimal("0.050"), "unidad": "kg", "es_removible": True},
                {"ref": "Gluten", "cantidad": Decimal("0.300"), "unidad": "kg", "es_removible": False},
            ]
        },
        {
            "nombre": "Coca-Cola 2L",
            "descripcion": "Bebida gaseosa clásica",
            "precio_base": 65.0,
            "stock_cantidad": 100,
            "disponible": True,
            "unidad_venta_codigo": "u",
            "categoria_id": categorias["Bebidas"].id,
            "ingredientes": [
                {"ref": "Coca-Cola 2L", "cantidad": Decimal("1"), "unidad": "u", "es_removible": False},
            ]
        },
        {
            "nombre": "Jugo Natural Naranja",
            "descripcion": "Jugo fresco de naranja recién exprimido",
            "precio_base": 45.0,
            "stock_cantidad": 25,
            "disponible": True,
            "unidad_venta_codigo": "l",
            "categoria_id": categorias["Bebidas"].id,
            "ingredientes": [
                {"ref": "Naranja", "cantidad": Decimal("3"), "unidad": "u", "es_removible": False},
            ]
        },
        {
            "nombre": "Pizza de Chocolate",
            "descripcion": "Pizza dulce de chocolate con frutos secos",
            "precio_base": 200.0,
            "stock_cantidad": 0,
            "disponible": False,
            "categoria_id": categorias["Pizzas Dulces"].id,
            "ingredientes": [
                {"ref": "Maní", "cantidad": Decimal("0.050"), "unidad": "kg", "es_removible": True},
                {"ref": "Leche", "cantidad": Decimal("0.200"), "unidad": "l", "es_removible": False},
            ]
        },
    ]

    with ProductoUnitOfWork(session) as uow:
        for prod_data in productos_data:
            existing = uow.productos.get_by_nombre(prod_data["nombre"])
            if not existing:
                cat_id = prod_data["categoria_id"]
                ingredientes_prod = prod_data.get("ingredientes", [])
                unidad_venta_codigo = prod_data.get("unidad_venta_codigo", None)
                _exclude = {"categoria_id", "ingredientes", "unidad_venta_codigo"}
                prod_fields = {k: v for k, v in prod_data.items() if k not in _exclude}

                unidad_venta_id = None
                if unidad_venta_codigo:
                    um = session.exec(select(UnidadMedida).where(UnidadMedida.codigo == unidad_venta_codigo)).first()
                    unidad_venta_id = um.id if um else None

                prod = Producto(**prod_fields, unidad_venta_id=unidad_venta_id)
                uow.productos.create(prod)
                uow.productos.flush()

                uow.productos.create_categoria_link(prod.id, cat_id, es_principal=True)

                for ing_info in ingredientes_prod:
                    ing = ingredientes[ing_info["ref"]]
                    um = session.exec(select(UnidadMedida).where(UnidadMedida.codigo == ing_info["unidad"])).first()
                    uow.productos.create_ingrediente_link(
                        prod.id, ing.id,
                        cantidad=ing_info["cantidad"],
                        unidad_medida_id=um.id if um else None,
                        es_removible=ing_info["es_removible"],
                    )
