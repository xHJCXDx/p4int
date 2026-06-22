from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlmodel import Session, SQLModel

from backend.core.database import engine
import backend.core.models_registry  # noqa: F401
from backend.core.schema_compat import ensure_schema_compatibility
from backend.core.settings import UPLOADS_DIR, env_flag
from backend.seeds.seed_data import run_all_seeds


@asynccontextmanager
async def lifespan(app: FastAPI):
    SQLModel.metadata.create_all(engine)
    ensure_schema_compatibility()
    (UPLOADS_DIR / "productos").mkdir(parents=True, exist_ok=True)

    if env_flag("RUN_SEED_ON_STARTUP", "false"):
        with Session(engine) as session:
            run_all_seeds(session)

    yield
