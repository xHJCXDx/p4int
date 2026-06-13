from fastapi import APIRouter, Depends, status, Query
from sqlmodel import Session
from app.core.database import get_session
from app.core.response import success_response, paginated_response, error_response, ApiResponse
from app.core.security import require_roles
from app.modules.ingredientes.schema import IngredienteCreate, IngredienteRead, IngredienteUpdate
from app.modules.ingredientes import service

router = APIRouter(prefix="/api/v1/ingredientes", tags=["Ingredientes"])


@router.get("/")
def read_ingredientes(
    session: Session = Depends(get_session),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(10, ge=1, le=100, description="Elementos por página"),
) -> ApiResponse:
    offset = (page - 1) * size
    ingredientes, total = service.get_all(session, size, offset)

    return paginated_response(
        items=[IngredienteRead.model_validate(i) for i in ingredientes],
        total=total,
        page=page,
        size=size,
        message="Ingredientes obtenidos exitosamente",
    )

@router.post("/", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles("ADMIN", "STOCK"))])
def create_ingrediente(ingrediente: IngredienteCreate, session: Session = Depends(get_session)) -> ApiResponse:
    """Crear ingrediente (solo ADMIN)."""
    new_ingrediente = service.create(session, ingrediente)
    return success_response(
        data=IngredienteRead.model_validate(new_ingrediente),
        message="Ingrediente creado exitosamente",
        status_code=201
    )

@router.put("/{ingrediente_id}", dependencies=[Depends(require_roles("ADMIN", "STOCK"))])
def update_ingrediente(ingrediente_id: int, ingrediente: IngredienteUpdate, session: Session = Depends(get_session)) -> ApiResponse:
    """Actualizar ingrediente (solo ADMIN)."""
    db_ingrediente = service.get_by_id(session, ingrediente_id)
    if not db_ingrediente:
        return error_response(message="Ingrediente no encontrado", status_code=404)
    updated_ingrediente = service.update(session, db_ingrediente, ingrediente)
    return success_response(
        data=IngredienteRead.model_validate(updated_ingrediente),
        message="Ingrediente actualizado exitosamente"
    )

@router.delete("/{ingrediente_id}", dependencies=[Depends(require_roles("ADMIN", "STOCK"))])
def delete_ingrediente(ingrediente_id: int, session: Session = Depends(get_session)) -> ApiResponse:
    """Eliminar ingrediente (solo ADMIN)."""
    db_ingrediente = service.get_by_id(session, ingrediente_id)
    if not db_ingrediente:
        return error_response(message="Ingrediente no encontrado", status_code=404)
    service.delete(session, db_ingrediente)
    return success_response(
        message="Ingrediente eliminado exitosamente",
        status_code=204
    )
