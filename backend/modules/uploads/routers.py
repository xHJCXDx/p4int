from fastapi import APIRouter, Depends, File, UploadFile

from backend.modules.auth.dependencies import require_roles
from backend.modules.auth.models import Rol, Usuario
from backend.modules.uploads.schemas import ImagenUploadResponse
from backend.modules.uploads.services import UploadService

router = APIRouter(prefix="/uploads", tags=["uploads"])


def get_upload_service() -> UploadService:
    return UploadService()


@router.post("/imagen", response_model=ImagenUploadResponse, status_code=201)
async def upload_imagen(
    file: UploadFile = File(...),
    svc: UploadService = Depends(get_upload_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return await svc.upload_producto_imagen(file)


@router.delete("/imagen/{public_id:path}", status_code=200)
def delete_imagen(
    public_id: str,
    svc: UploadService = Depends(get_upload_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return svc.delete_imagen(public_id)
