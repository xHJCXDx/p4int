from fastapi import APIRouter, Depends, status, Query
from sqlmodel import Session
from app.core.database import get_session
from app.core.response import success_response, error_response, ApiResponse
from app.core.security import get_current_user
from app.modules.pagos.schema import PagoCreate, PagoRead, PagoUpdate
from app.modules.pagos import service
from app.modules.usuarios.model import Usuario

router = APIRouter(prefix="/api/v1/pagos", tags=["Pagos"])


@router.get("/pedido/{pedido_id}")
def read_pagos_pedido(
    pedido_id: int,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
) -> ApiResponse:
    try:
        service.verify_pago_read_permission(session, pedido_id, current_user)
        pagos = service.get_pagos_by_pedido(session, pedido_id)
        return success_response(
            data=[PagoRead.model_validate(p) for p in pagos],
            message="Pagos del pedido obtenidos exitosamente"
        )
    except PermissionError as e:
        return error_response(message=str(e), status_code=403)
    except ValueError as e:
        return error_response(message=str(e), status_code=404)


@router.get("/{pago_id}")
def read_pago(
    pago_id: int,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
) -> ApiResponse:
    pago = service.get_pago_by_id(session, pago_id)
    if not pago:
        return error_response(message="Pago no encontrado", status_code=404)

    return success_response(
        data=PagoRead.model_validate(pago),
        message="Pago obtenido exitosamente"
    )


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_pago(
    pago: PagoCreate,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
) -> ApiResponse:
    try:
        service.verify_pago_permission(current_user)
        new_pago = service.create_pago(session, pago)
        return success_response(
            data=PagoRead.model_validate(new_pago),
            message="Pago creado exitosamente",
            status_code=201
        )
    except PermissionError as e:
        return error_response(message=str(e), status_code=403)
    except ValueError as e:
        return error_response(message=str(e), status_code=400)


@router.put("/{pago_id}")
def update_pago(
    pago_id: int,
    pago_update: PagoUpdate,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
) -> ApiResponse:
    try:
        service.verify_pago_permission(current_user)
        db_pago = service.get_pago_by_id(session, pago_id)
        if not db_pago:
            return error_response(message="Pago no encontrado", status_code=404)
        updated_pago = service.update_pago(session, db_pago, pago_update.model_dump())
        return success_response(
            data=PagoRead.model_validate(updated_pago),
            message="Pago actualizado exitosamente"
        )
    except PermissionError as e:
        return error_response(message=str(e), status_code=403)
    except ValueError as e:
        return error_response(message=str(e), status_code=400)
