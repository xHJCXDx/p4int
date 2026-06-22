import os
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from backend.core.settings import UPLOADS_DIR
from backend.modules.uploads.schemas import ImagenUploadResponse


ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024


def _detect_image_extension(raw: bytes) -> str | None:
    if raw.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if raw.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if raw.startswith(b"GIF87a") or raw.startswith(b"GIF89a"):
        return "gif"
    if len(raw) >= 12 and raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        return "webp"
    return None


class UploadService:
    def __init__(self) -> None:
        self._local_product_dir = Path(os.getenv("UPLOADS_DIR", str(UPLOADS_DIR))).expanduser() / "productos"

    async def upload_producto_imagen(self, file: UploadFile) -> ImagenUploadResponse:
        raw, ext = await self._read_valid_image(file)

        if self._cloudinary_enabled():
            return self._upload_cloudinary(raw)

        return self._upload_local(raw, ext)

    async def _read_valid_image(self, file: UploadFile) -> tuple[bytes, str]:
        if not file.filename:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Archivo invalido")

        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo esta vacio")
        if len(raw) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Maximo 8MB por imagen")

        detected = _detect_image_extension(raw)
        ext = (detected or "").lower()
        if ext == "jpeg":
            ext = "jpg"
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Formato no permitido. Usa JPG, PNG, WEBP o GIF.",
            )

        return raw, ext

    def _cloudinary_enabled(self) -> bool:
        return all(
            os.getenv(name)
            for name in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET")
        )

    def _upload_cloudinary(self, raw: bytes) -> ImagenUploadResponse:
        try:
            import cloudinary
            import cloudinary.uploader
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Cloudinary esta configurado pero falta instalar el paquete cloudinary",
            ) from exc

        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET"),
            secure=True,
        )
        result = cloudinary.uploader.upload(
            raw,
            folder="tienda/productos",
            resource_type="image",
            transformation=[
                {"fetch_format": "auto", "quality": "auto"},
                {"crop": "fill", "gravity": "auto", "width": 1200, "height": 900},
            ],
        )
        return ImagenUploadResponse(
            url=result["secure_url"],
            public_id=result.get("public_id"),
            provider="cloudinary",
        )

    def _upload_local(self, raw: bytes, ext: str) -> ImagenUploadResponse:
        self._local_product_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid4().hex}.{ext}"
        file_path = self._local_product_dir / filename
        file_path.write_bytes(raw)
        return ImagenUploadResponse(
            url=f"/uploads/productos/{filename}",
            public_id=f"productos/{filename}",
            provider="local",
        )

    def delete_imagen(self, public_id: str) -> dict[str, str]:
        clean_public_id = public_id.strip().lstrip("/")
        if not clean_public_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="public_id requerido")

        if self._cloudinary_enabled() and clean_public_id.startswith("tienda/"):
            return self._delete_cloudinary(clean_public_id)
        return self._delete_local(clean_public_id)

    def _delete_cloudinary(self, public_id: str) -> dict[str, str]:
        try:
            import cloudinary
            import cloudinary.uploader
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Cloudinary esta configurado pero falta instalar el paquete cloudinary",
            ) from exc

        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET"),
            secure=True,
        )
        result = cloudinary.uploader.destroy(public_id, resource_type="image")
        status_result = result.get("result", "unknown")
        if status_result not in {"ok", "not found"}:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Cloudinary no pudo borrar la imagen: {status_result}",
            )
        return {"provider": "cloudinary", "status": status_result}

    def _delete_local(self, public_id: str) -> dict[str, str]:
        filename = public_id.removeprefix("uploads/").removeprefix("productos/")
        if "/" in filename or "\\" in filename or not filename:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="public_id local invalido")

        file_path = (self._local_product_dir / filename).resolve()
        base_dir = self._local_product_dir.resolve()
        if base_dir not in file_path.parents:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ruta local invalida")

        if file_path.exists():
            file_path.unlink()
            status_result = "ok"
        else:
            status_result = "not found"
        return {"provider": "local", "status": status_result}
