from sqlmodel import Session
from app.core.unit_of_work import BaseUnitOfWork
from app.admin.repository import AdminRepository


class AdminUnitOfWork(BaseUnitOfWork):
    """Unit of Work for Admin dashboard (read-only queries)."""

    def __init__(self, session: Session):
        super().__init__(session)
        self.repo = AdminRepository(session)
