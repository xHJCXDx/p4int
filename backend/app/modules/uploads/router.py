"""Router para upload de imágenes (solo ADMIN)."""

from fastapi import APIRouter, Depends, UploadFile, File
from app.core.response import success_response, error_response, ApiResponse
from app.core.security import require_roles
from app.modules.uploads import service

router = APIRouter(prefix="/api/v1/uploads", tags=["Uploads"])


@router.post("/imagen", dependencies=[Depends(require_roles("ADMIN"))])
async def upload_imagen(
    file: UploadFile = File(...),
) -> ApiResponse:
    """Sube una imagen a Cloudinary. Retorna la URL segura."""
    try:
        url = service.upload_image(file, folder="p4int")
        return success_response(data={"url": url}, message="Imagen subida exitosamente")
    except ValueError as e:
        return error_response(message=str(e), status_code=400)
