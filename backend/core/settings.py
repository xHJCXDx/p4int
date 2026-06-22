import os
from pathlib import Path

DEFAULT_UPLOADS_DIR = Path(__file__).resolve().parents[1] / "img"
UPLOADS_DIR = Path(os.getenv("UPLOADS_DIR", str(DEFAULT_UPLOADS_DIR))).expanduser()

API_V1_PREFIX = "/api/v1"
CORS_ALLOW_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173,"
    "http://127.0.0.1:5173,"
    "http://localhost:4173,"
    "http://127.0.0.1:4173"
)


def env_flag(name: str, default: str = "false") -> bool:
    value = os.getenv(name, default).strip().lower()
    return value in ("1", "true", "yes", "on")


def env_list(name: str, default: str = "") -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def cors_origins() -> list[str]:
    return env_list("CORS_ORIGINS", DEFAULT_CORS_ORIGINS)
