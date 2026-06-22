from sqlmodel import Session, select

from backend.core.repository import BaseRepository
from backend.modules.direcciones.models import DireccionEntrega


class DireccionEntregaRepository(BaseRepository[DireccionEntrega]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, DireccionEntrega)

    def get_by_id(self, record_id: int) -> DireccionEntrega | None:
        return self.session.exec(
            select(DireccionEntrega)
            .where(DireccionEntrega.id == record_id)
            .where(DireccionEntrega.deleted_at.is_(None))
        ).first()

    def get_all_by_usuario(self, usuario_id: int) -> list[DireccionEntrega]:
        return list(
            self.session.exec(
                select(DireccionEntrega)
                .where(DireccionEntrega.usuario_id == usuario_id)
                .where(DireccionEntrega.deleted_at.is_(None))
            ).all()
        )

    def get_principal(self, usuario_id: int) -> DireccionEntrega | None:
        return self.session.exec(
            select(DireccionEntrega)
            .where(DireccionEntrega.usuario_id == usuario_id)
            .where(DireccionEntrega.es_principal == True)
            .where(DireccionEntrega.deleted_at.is_(None))
        ).first()

    def unset_all_principal(self, usuario_id: int) -> None:
        """Quita el flag es_principal de todas las direcciones del usuario."""
        direcciones = self.session.exec(
            select(DireccionEntrega)
            .where(DireccionEntrega.usuario_id == usuario_id)
            .where(DireccionEntrega.es_principal == True)
            .where(DireccionEntrega.deleted_at.is_(None))
        ).all()
        for d in direcciones:
            d.es_principal = False
        self.session.flush()
