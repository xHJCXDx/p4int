from typing import TypeVar, Generic, List, Optional, Type
from sqlmodel import Session, select, func

T = TypeVar('T')


class BaseRepository(Generic[T]):

    def __init__(self, session: Session, model: Type[T]):
        self.session = session
        self.model = model

    def get_all(self, limit: int = 100, offset: int = 0) -> tuple[List[T], int]:
        statement = select(self.model).offset(offset).limit(limit)
        items = self.session.exec(statement).all()

        count_statement = select(func.count(self.model.id))
        total = self.session.exec(count_statement).one()

        return items, total

    def get_by_id(self, entity_id: int) -> Optional[T]:
        return self.session.get(self.model, entity_id)

    def create(self, obj_in: T) -> T:
        self.session.add(obj_in)
        return obj_in

    def update(self, db_obj: T, obj_in: dict) -> T:
        obj_data = obj_in if isinstance(obj_in, dict) else obj_in.model_dump(exclude_unset=True)
        db_obj.sqlmodel_update(obj_data)
        self.session.add(db_obj)
        return db_obj

    def delete(self, db_obj: T) -> None:
        self.session.delete(db_obj)

    def flush(self) -> None:
        self.session.flush()

    def refresh(self, obj: T) -> T:
        self.session.flush()
        self.session.refresh(obj)
        return obj
