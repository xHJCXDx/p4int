"""Servicio de upload de imágenes con Cloudinary."""

import os
import cloudinary
import cloudinary.uploader
from fastapi import UploadFile

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def upload_image(file: UploadFile, folder: str = "p4int") -> str:
    """Sube una imagen a Cloudinary y retorna la URL segura."""
    if file.content_type not in ALLOWED_TYPES:
        raise ValueError(f"Tipo de archivo no permitido: {file.content_type}. Usar JPEG, PNG o WebP.")

    contents = file.file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise ValueError("El archivo excede el tamaño máximo de 5 MB")

    result = cloudinary.uploader.upload(
        contents,
        folder=folder,
        resource_type="image",
    )
    return result["secure_url"]


def delete_image(public_id: str) -> bool:
    """Elimina una imagen de Cloudinary por su public_id."""
    result = cloudinary.uploader.destroy(public_id)
    return result.get("result") == "ok"
