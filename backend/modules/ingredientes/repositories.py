from sqlalchemy import asc, desc, func
from sqlmodel import Session, select

from backend.core.repository import BaseRepository
from backend.core.links import ProductoIngredienteLink
from backend.modules.ingredientes.models import Ingrediente, UnidadMedida


class IngredienteRepository(BaseRepository[Ingrediente]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Ingrediente)

    def get_by_id(self, record_id: int) -> Ingrediente | None:
        return self.session.exec(
            select(Ingrediente)
            .where(Ingrediente.id == record_id)
            .where(Ingrediente.deleted_at.is_(None))
        ).first()

    def get_by_id_any(self, record_id: int) -> Ingrediente | None:
        return self.session.exec(
            select(Ingrediente).where(Ingrediente.id == record_id)
        ).first()

    def get_by_nombre(self, nombre: str) -> Ingrediente | None:
        return self.session.exec(
            select(Ingrediente)
            .where(Ingrediente.nombre == nombre)
            .where(Ingrediente.deleted_at.is_(None))
        ).first()

    def get_unidad_by_id(self, unidad_id: int) -> UnidadMedida | None:
        return self.session.exec(
            select(UnidadMedida).where(UnidadMedida.id == unidad_id)
        ).first()

    def get_unidad_by_value(self, value: str) -> UnidadMedida | None:
        aliases = {
            "gr": "g",
            "gramo": "g",
            "gramos": "g",
            "l": "l",
            "litro": "l",
            "litros": "l",
            "unidad": "ud",
            "unidades": "ud",
            "porcion": "porciones",
            "porción": "porciones",
            "porc": "porciones",
        }
        normalized = aliases.get(value.strip().lower(), value.strip().lower())
        return self.session.exec(
            select(UnidadMedida).where(
                (func.lower(UnidadMedida.simbolo) == normalized)
                | (func.lower(UnidadMedida.nombre) == normalized)
            )
        ).first()

    def get_default_unidad(self) -> UnidadMedida | None:
        return self.get_unidad_by_value("ud") or self.get_unidad_by_value("unidad")

    def get_all_active(self) -> list[Ingrediente]:
        return list(
            self.session.exec(
                select(Ingrediente).where(Ingrediente.is_active, Ingrediente.deleted_at.is_(None))
            ).all()
        )

    def count_active(
        self,
        name: str | None = None,
        es_alergeno: bool | None = None,
        unidad_medida: str | None = None,
        is_active: bool | None = None,
        include_inactive: bool = False,
    ) -> int:
        stmt = select(func.count()).select_from(Ingrediente)
        if not include_inactive:
            stmt = stmt.where(Ingrediente.is_active, Ingrediente.deleted_at.is_(None))
        elif is_active is not None:
            stmt = stmt.where(Ingrediente.is_active == is_active)
        if name:
            stmt = stmt.where(Ingrediente.nombre.ilike(f"%{name}%"))
        if es_alergeno is not None:
            stmt = stmt.where(Ingrediente.es_alergeno == es_alergeno)
        if unidad_medida:
            unidad = self.get_unidad_by_value(unidad_medida)
            if unidad:
                stmt = stmt.where(Ingrediente.unidad_medida_id == unidad.id)
            else:
                return 0
        return int(self.session.exec(stmt).one())

    def get_active_paginated(
        self,
        offset: int = 0,
        limit: int = 10,
        name: str | None = None,
        es_alergeno: bool | None = None,
        unidad_medida: str | None = None,
        is_active: bool | None = None,
        sort_by: str | None = None,
        sort_dir: str = "asc",
        include_inactive: bool = False,
    ) -> list[Ingrediente]:
        stmt = select(Ingrediente)
        if not include_inactive:
            stmt = stmt.where(Ingrediente.is_active, Ingrediente.deleted_at.is_(None))
        elif is_active is not None:
            stmt = stmt.where(Ingrediente.is_active == is_active)
        if name:
            stmt = stmt.where(Ingrediente.nombre.ilike(f"%{name}%"))
        if es_alergeno is not None:
            stmt = stmt.where(Ingrediente.es_alergeno == es_alergeno)
        if unidad_medida:
            unidad = self.get_unidad_by_value(unidad_medida)
            if unidad:
                stmt = stmt.where(Ingrediente.unidad_medida_id == unidad.id)
            else:
                return []

        direction = desc if str(sort_dir).lower() == "desc" else asc
        sort_field = (sort_by or "").lower()
        sort_column = Ingrediente.stock_cantidad if sort_field == "stock" else Ingrediente.nombre
        if include_inactive and is_active is None:
            stmt = stmt.order_by(Ingrediente.is_active.desc(), direction(sort_column))
        else:
            stmt = stmt.order_by(direction(sort_column))

        return list(self.session.exec(stmt.offset(offset).limit(limit)).all())

    def has_product_links(self, ingrediente_id: int) -> bool:
        return self.session.exec(
            select(ProductoIngredienteLink.producto_id)
            .where(ProductoIngredienteLink.ingrediente_id == ingrediente_id)
            .limit(1)
        ).first() is not None
