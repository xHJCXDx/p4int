"""Router para upload de imágenes (solo ADMIN)."""

from fastapi import APIRouter, Depends, UploadFile, File, status
from app.core.response import success_response, error_response, ApiResponse
from app.core.security import require_roles
from app.core.constants import RolCode
from app.modules.uploads import service
from app.modules.uploads.schema import CloudinaryResponse

router = APIRouter(prefix="/api/v1/uploads", tags=["Uploads"])


@router.post("/imagen", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(RolCode.ADMIN))])
async def upload_imagen(
    file: UploadFile = File(...),
) -> ApiResponse:
    """Sube una imagen a Cloudinary. Retorna la URL segura y metadatos."""
    try:
        result = service.upload_image(file, folder="p4int")
        return success_response(data=CloudinaryResponse(**result).model_dump(), message="Imagen subida exitosamente")
    except ValueError as e:
        return error_response(detail=str(e), status_code=400, code="UPLOAD_ERROR")
    except Exception as e:
        return error_response(detail=f"Error al subir imagen: {e}", status_code=502, code="CLOUDINARY_ERROR")


@router.delete("/imagen/{public_id:path}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_roles(RolCode.ADMIN))])
def delete_imagen(public_id: str):
    """Elimina una imagen de Cloudinary por su public_id."""
    success = service.delete_image(public_id)
    if not success:
        return error_response(detail="No se pudo eliminar la imagen", status_code=400, code="DELETE_ERROR")
