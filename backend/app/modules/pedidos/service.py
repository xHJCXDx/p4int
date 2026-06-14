from typing import List, Optional, Tuple
from decimal import Decimal
from datetime import datetime, timezone
from sqlmodel import Session
from app.modules.pedidos.model import Pedido, DetallePedido, HistorialEstadoPedido
from app.modules.pedidos.schema import PedidoCreate, PedidoCreateFromCheckout, PedidoUpdate, DetallePedidoCreate
from app.modules.pedidos.unit_of_work import PedidoUnitOfWork
from app.core.constants import TRANSICIONES_PERMITIDAS, ACCIONES_A_ESTADOS
from app.modules.productos.model import Producto, ProductoIngredienteLink
from app.modules.ingredientes.model import Ingrediente
from app.modules.usuarios.model import Usuario
from app.core.response import BusinessRuleError


def is_client_only(user: Usuario) -> bool:
    """Verifica si el usuario solo tiene rol CLIENT."""
    codes = [role.codigo for role in user.roles]
    return "CLIENT" in codes and "ADMIN" not in codes and "PEDIDOS" not in codes


def is_admin_or_pedidos(user: Usuario) -> bool:
    """Verifica si el usuario tiene rol ADMIN o PEDIDOS."""
    codes = [role.codigo for role in user.roles]
    return "ADMIN" in codes or "PEDIDOS" in codes


def resolver_estado_destino(accion: Optional[str], nuevo_estado: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """
    Resuelve el estado destino a partir de accion o nuevo_estado.
    Retorna (estado_destino, error_message). Si hay error, estado_destino es None.
    """
    estado_destino = nuevo_estado
    if accion:
        if accion == "cancelar":
            estado_destino = "CANCELADO"
        else:
            estado_destino = ACCIONES_A_ESTADOS.get(accion.lower())
            if not estado_destino:
                return None, f"Acción no reconocida: {accion}. Válidas: {list(ACCIONES_A_ESTADOS.keys())} o 'cancelar'"

    if not estado_destino:
        return None, "Debe proporcionar 'accion' o 'nuevo_estado'"

    return estado_destino, None


# ============ PEDIDO SERVICE ============
def get_all_pedidos(session: Session, limit: int = 10, offset: int = 0, current_user: Optional[Usuario] = None) -> Tuple[List[Pedido], int]:
    """
    Obtiene pedidos con paginación, excluyendo soft-deleted.
    Si el usuario es CLIENT, filtra solo sus pedidos.
    """
    with PedidoUnitOfWork(session) as uow:
        if current_user and is_client_only(current_user):
            return uow.pedidos.get_all_for_user(current_user.id, limit, offset)
        return uow.pedidos.get_all(limit, offset)


def get_pedido_by_id(session: Session, pedido_id: int) -> Optional[Pedido]:
    """Obtiene un pedido por ID, retorna None si está deleted o no existe."""
    with PedidoUnitOfWork(session) as uow:
        return uow.pedidos.get_by_id(pedido_id)


def get_pedido_with_permission(session: Session, pedido_id: int, current_user: Usuario) -> Pedido:
    """Obtiene un pedido verificando permisos del usuario."""
    pedido = get_pedido_by_id(session, pedido_id)
    if not pedido:
        raise ValueError("Pedido no encontrado")
    if is_client_only(current_user) and pedido.usuario_id != current_user.id:
        raise PermissionError("No tienes permiso para ver este pedido")
    return pedido


def verify_admin_or_pedidos(current_user: Usuario) -> None:
    """Verifica que el usuario tenga rol ADMIN o PEDIDOS."""
    if not is_admin_or_pedidos(current_user):
        raise PermissionError("No tienes permiso para esta operación")


def validate_transition_permission(current_user: Usuario, pedido: Pedido, estado_destino: str) -> None:
    """Valida permisos de transición de estado según el rol del usuario."""
    if is_client_only(current_user):
        if pedido.usuario_id != current_user.id:
            raise PermissionError("No tienes permiso para modificar pedidos ajenos")
        if estado_destino != "CANCELADO":
            raise PermissionError("CLIENT solo puede cancelar su propio pedido")
    elif not is_admin_or_pedidos(current_user):
        raise PermissionError("No tienes permiso para cambiar estados de pedidos")


def create_pedido(session: Session, pedido_data: PedidoCreate) -> Pedido:
    """Crea un nuevo pedido e inserta el primer registro en HistorialEstadoPedido."""
    with PedidoUnitOfWork(session) as uow:
        new_pedido = Pedido.model_validate(pedido_data)
        pedido = uow.pedidos.create(new_pedido)
        uow.pedidos.flush()

        historial = HistorialEstadoPedido(
            pedido_id=pedido.id,
            estado_desde=None,
            estado_hacia=pedido.estado_codigo,
            usuario_id=None,
            motivo=None
        )
        uow.historial.create(historial)
        uow.pedidos.refresh(pedido)
    return pedido


def create_pedido_from_checkout(session: Session, checkout_data: PedidoCreateFromCheckout, usuario_id: int) -> Pedido:
    """
    Crea pedido completo desde el checkout del cliente.
    Valida stock de ingredientes, calcula totales, crea detalles con snapshot,
    y descuenta stock de los ingredientes.
    """
    if not checkout_data.items:
        raise ValueError("El pedido debe tener al menos un producto")

    with PedidoUnitOfWork(session) as uow:
        # Validar stock de ingredientes y calcular subtotal
        subtotal = Decimal("0")
        productos_info = []
        consumo_ingredientes: dict[int, Decimal] = {}

        for linea in checkout_data.items:
            producto = uow.productos.get_by_id(linea.producto_id)
            if not producto:
                raise ValueError(f"Producto {linea.producto_id} no existe o fue eliminado")

            # S4.1 — rechazar productos no disponibles
            if not producto.disponible:
                raise BusinessRuleError(
                    detail=f"El producto '{producto.nombre}' no está disponible en este momento",
                    code="PRODUCTO_NO_DISPONIBLE",
                    status_code=400,
                )

            links = uow.productos.get_ingrediente_links(producto.id)

            for link in links:
                total_necesario = link.cantidad * linea.cantidad
                consumo_ingredientes[link.ingrediente_id] = (
                    consumo_ingredientes.get(link.ingrediente_id, Decimal("0")) + total_necesario
                )

            linea_subtotal = producto.precio_base * linea.cantidad
            subtotal += linea_subtotal
            # S4.2 — capturar personalizacion (IDs de ingredientes a remover)
            productos_info.append((producto, linea.cantidad, linea_subtotal, linea.personalizacion))

        # Validar stock suficiente de cada ingrediente
        for ing_id, cantidad_necesaria in consumo_ingredientes.items():
            ingrediente = uow.ingredientes.get_by_id(ing_id)
            if not ingrediente:
                raise ValueError(f"Ingrediente {ing_id} no existe o fue eliminado")
            if ingrediente.stock_cantidad < cantidad_necesaria:
                raise ValueError(
                    f"Stock insuficiente de ingrediente '{ingrediente.nombre}': "
                    f"disponible {ingrediente.stock_cantidad}, necesario {cantidad_necesaria}"
                )

        costo_envio = Decimal("50.0")
        total = subtotal + costo_envio

        pedido = Pedido(
            usuario_id=usuario_id,
            direccion_id=checkout_data.direccion_id,
            estado_codigo="PENDIENTE",
            forma_pago_codigo=checkout_data.forma_pago_codigo,
            notas=checkout_data.notas,
            subtotal=subtotal,
            descuento=Decimal("0"),
            costo_envio=costo_envio,
            total=total,
        )
        pedido = uow.pedidos.create(pedido)
        uow.pedidos.flush()

        # Crear detalles con snapshot
        for producto, cantidad, linea_subtotal, personalizacion in productos_info:
            detalle = DetallePedido(
                pedido_id=pedido.id,
                producto_id=producto.id,
                cantidad=cantidad,
                nombre_snapshot=producto.nombre,
                precio_snapshot=producto.precio_base,
                subtotal_snap=linea_subtotal,
                # S4.2 — almacenar IDs de ingredientes removidos por el cliente
                personalizacion=personalizacion,
            )
            uow.detalles.create(detalle)

        # Descontar stock de ingredientes a través del repository
        for ing_id, cantidad_necesaria in consumo_ingredientes.items():
            ingrediente = uow.ingredientes.get_by_id(ing_id)
            uow.ingredientes.update(ingrediente, {
                "stock_cantidad": ingrediente.stock_cantidad - cantidad_necesaria
            })

        # Historial inicial
        historial = HistorialEstadoPedido(
            pedido_id=pedido.id,
            estado_desde=None,
            estado_hacia="PENDIENTE",
            usuario_id=usuario_id,
        )
        uow.historial.create(historial)
        uow.pedidos.refresh(pedido)

    _notify_estado_change(pedido, None, "PENDIENTE", usuario_id=usuario_id, event="pedido_creado")
    return pedido


def update_pedido(session: Session, db_pedido: Pedido, pedido_data: PedidoUpdate) -> Pedido:
    """Actualiza un pedido (sin cambiar estado; usar transition_estado para eso)."""
    with PedidoUnitOfWork(session) as uow:
        update_dict = pedido_data.model_dump(exclude_unset=True)
        uow.pedidos.update(db_pedido, update_dict)
        uow.pedidos.refresh(db_pedido)
    return db_pedido


def delete_pedido(session: Session, db_pedido: Pedido):
    """Soft delete: marca con deleted_at."""
    with PedidoUnitOfWork(session) as uow:
        uow.pedidos.delete(db_pedido)


def transition_estado(
    session: Session,
    pedido_id: int,
    nuevo_estado: str,
    usuario_id: Optional[int] = None,
    motivo: Optional[str] = None
) -> Pedido:
    """
    Realiza transición de estado con validaciones de FSM.
    RN-01: Valida si transición es permitida.
    RN-05: Valida motivo obligatorio si el nuevo estado es CANCELADO.
    """
    with PedidoUnitOfWork(session) as uow:
        pedido = uow.pedidos.get_by_id(pedido_id)
        if not pedido:
            raise ValueError(f"Pedido {pedido_id} no encontrado")

        estado_actual = pedido.estado_codigo
        transiciones_validas = TRANSICIONES_PERMITIDAS.get(estado_actual, [])

        if nuevo_estado not in transiciones_validas:
            raise ValueError(
                f"Transición no permitida: {estado_actual} → {nuevo_estado}. "
                f"Transiciones permitidas: {transiciones_validas}"
            )

        if nuevo_estado == "CANCELADO" and not motivo:
            raise ValueError("Motivo obligatorio para cancelar un pedido")

        uow.pedidos.update_estado(pedido, nuevo_estado)

        if nuevo_estado == "CANCELADO" and motivo:
            uow.pedidos.update(pedido, {"motivo_cancelacion": motivo})

        historial = HistorialEstadoPedido(
            pedido_id=pedido_id,
            estado_desde=estado_actual,
            estado_hacia=nuevo_estado,
            usuario_id=usuario_id,
            motivo=motivo
        )
        uow.historial.create(historial)
        uow.pedidos.refresh(pedido)

    event_name = "pedido_cancelado" if nuevo_estado == "CANCELADO" else "estado_cambiado"
    _notify_estado_change(pedido, estado_actual, nuevo_estado, usuario_id=usuario_id, motivo=motivo, event=event_name)
    return pedido


def _notify_estado_change(
    pedido,
    estado_desde: Optional[str],
    estado_hacia: str,
    usuario_id: Optional[int] = None,
    motivo: Optional[str] = None,
    event: str = "estado_cambiado",
):
    """Notifica cambio de estado via WebSocket (fire-and-forget).

    Emite en el canal pedido:{id} y en el canal admin.
    Debe llamarse FUERA del bloque UoW (después del commit).
    """
    import asyncio
    from app.core.ws_manager import ws_manager

    message = {
        "event": event,
        "pedido_id": pedido.id,
        "estado_anterior": estado_desde,
        "estado_nuevo": estado_hacia,
        "usuario_id": usuario_id,
        "motivo": motivo,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(ws_manager.broadcast_pedido(pedido.id, message))
        else:
            loop.run_until_complete(ws_manager.broadcast_pedido(pedido.id, message))
    except RuntimeError:
        pass


# ============ DETALLE PEDIDO SERVICE ============
def get_detalles_by_pedido(session: Session, pedido_id: int) -> List[DetallePedido]:
    """Obtiene todos los detalles de un pedido."""
    with PedidoUnitOfWork(session) as uow:
        return uow.detalles.get_by_pedido(pedido_id)


def get_historial(session: Session, pedido_id: int) -> List[HistorialEstadoPedido]:
    """Obtiene el historial de estados de un pedido, ordenado por created_at ASC."""
    with PedidoUnitOfWork(session) as uow:
        return uow.historial.get_by_pedido(pedido_id)


def cancel_pedido(session: Session, pedido: Pedido, current_user: Usuario, motivo: Optional[str] = None) -> Pedido:
    """
    Cancela un pedido propio del cliente.
    Solo permite cancelar desde PENDIENTE o CONFIRMADO.
    S4.3: si el pedido está EN_PREP, solo ADMIN o PEDIDOS pueden cancelar.
    """
    if pedido.usuario_id != current_user.id and is_client_only(current_user):
        raise PermissionError("Solo podés cancelar tus propios pedidos")

    # S4.3 — EN_PREP requiere ADMIN o PEDIDOS; el cliente recibe 403
    if pedido.estado_codigo == "EN_PREP" and is_client_only(current_user):
        raise BusinessRuleError(
            detail="Solo ADMIN o PEDIDOS pueden cancelar pedidos en preparación",
            code="FORBIDDEN",
            status_code=403,
        )

    allowed = TRANSICIONES_PERMITIDAS.get(pedido.estado_codigo, [])
    if "CANCELADO" not in allowed:
        raise ValueError(
            f"No se puede cancelar un pedido en estado {pedido.estado_codigo}"
        )

    if not motivo:
        raise ValueError("Motivo obligatorio para cancelar un pedido (RN-05)")

    return transition_estado(
        session, pedido.id, "CANCELADO",
        usuario_id=current_user.id, motivo=motivo
    )


def create_detalle_pedido(session: Session, pedido_id: int, detalle_data: DetallePedidoCreate) -> DetallePedido:
    """Crea un detalle de pedido (immutable después de creación)."""
    with PedidoUnitOfWork(session) as uow:
        producto = uow.productos.get_by_id(detalle_data.producto_id)
        if not producto:
            raise ValueError(f"Producto {detalle_data.producto_id} no existe o ha sido eliminado")

        detalle_data.pedido_id = pedido_id
        new_detalle = DetallePedido.model_validate(detalle_data)
        uow.detalles.create(new_detalle)
        uow.detalles.refresh(new_detalle)
    return new_detalle
