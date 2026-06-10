from typing import List, Optional, Tuple
from datetime import datetime
from sqlmodel import Session
from app.modules.ingredientes.model import Ingrediente
from app.modules.ingredientes.schema import IngredienteCreate, IngredienteUpdate
from app.modules.ingredientes.unit_of_work import IngredienteUnitOfWork


def get_all(session: Session, limit: int = 100, offset: int = 0) -> Tuple[List[Ingrediente], int]:
    with IngredienteUnitOfWork(session) as uow:
        return uow.ingredientes.get_all(limit, offset)


def get_by_id(session: Session, ingrediente_id: int) -> Optional[Ingrediente]:
    with IngredienteUnitOfWork(session) as uow:
        return uow.ingredientes.get_by_id(ingrediente_id)


def create(session: Session, ingrediente_data: IngredienteCreate) -> Ingrediente:
    with IngredienteUnitOfWork(session) as uow:
        db_ingrediente = Ingrediente.model_validate(ingrediente_data)
        uow.ingredientes.create(db_ingrediente)
        uow.ingredientes.refresh(db_ingrediente)
    return db_ingrediente


def update(session: Session, db_ingrediente: Ingrediente, ingrediente_data: IngredienteUpdate) -> Ingrediente:
    with IngredienteUnitOfWork(session) as uow:
        ingrediente_dict = ingrediente_data.model_dump(exclude_unset=True)
        ingrediente_dict["updated_at"] = datetime.utcnow()
        uow.ingredientes.update(db_ingrediente, ingrediente_dict)
        uow.ingredientes.refresh(db_ingrediente)
    return db_ingrediente


def delete(session: Session, db_ingrediente: Ingrediente):
    with IngredienteUnitOfWork(session) as uow:
        uow.ingredientes.delete(db_ingrediente)
