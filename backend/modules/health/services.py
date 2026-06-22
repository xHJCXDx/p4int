from sqlalchemy import text

from backend.core.database import engine


class HealthService:
    def database_connected(self) -> bool:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
