from sqlmodel import SQLModel


class ImagenUploadResponse(SQLModel):
    url: str
    public_id: str | None = None
    provider: str = "local"
