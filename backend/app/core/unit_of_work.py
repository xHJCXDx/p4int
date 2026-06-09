from sqlmodel import Session


class BaseUnitOfWork:
    """Base Unit of Work class that manages repositories.

    Uso correcto (auto-commit al salir sin error):
        with MyUnitOfWork(session) as uow:
            uow.repo.create(entity)
            # commit automático al salir del bloque
    """

    def __init__(self, session: Session):
        self.session = session

    def rollback(self) -> None:
        """Rollback all changes"""
        self.session.rollback()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.rollback()
        else:
            self.session.commit()
