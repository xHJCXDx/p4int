from fastapi import APIRouter, HTTPException, status

from backend.modules.health.services import HealthService

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def health_check():
    return {"status": "ok"}


@router.get("/db")
def db_check():
    try:
        HealthService().database_connected()
        return {"status": "ok", "database": "connected"}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        ) from exc
