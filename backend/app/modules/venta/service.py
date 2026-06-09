from typing import List, Optional, Tuple
from datetime import datetime
from sqlmodel import Session
from app.modules.venta.model import Pedido, DetallePedido, Pago, HistorialEstadoPedido
from app.modules.venta.schema import PedidoCreate, PedidoCreateFromCheckout, PedidoUpdate, DetallePedidoCreate, PagoCreate
from app.modules.venta.unit_of_work import VentaUnitOfWork
from app.core.constants import TRANSICIONES_PERMITIDAS, ACCIONES_A_ESTADOS
from app.modules.producto.model import Producto, ProductoIngredienteLink
from app.modules.ingrediente.model import Ingrediente
from app.modules.usuario.model import Usuario


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
def get_all_pedidos(session: Session, limit: int = 10, offset: int = 0, usuario_id: Optional[int] = None) -> Tuple[List[Pedido], int]:
    """
    Obtiene pedidos con paginación, excluyendo soft-deleted.
    Si usuario_id es provided, filtra solo los pedidos de ese usuario (CLIENT).
    """
    with VentaUnitOfWork(session) as uow:
        if usuario_id:
            return uow.pedidos.get_all_for_user(usuario_id, limit, offset)
        return uow.pedidos.get_all(limit, offset)


def get_pedido_by_id(session: Session, pedido_id: int) -> Optional[Pedido]:
    """Obtiene un pedido por ID, retorna None si está deleted o no existe."""
    with VentaUnitOfWork(session) as uow:
        return uow.pedidos.get_by_id(pedido_id)


def create_pedido(session: Session, pedido_data: PedidoCreate) -> Pedido:
    """Crea un nuevo pedido e inserta el primer registro en HistorialEstadoPedido."""
    with VentaUnitOfWork(session) as uow:
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
    if not checkout_data.linea_ventas:
        raise ValueError("El pedido debe tener al menos un producto")

    with VentaUnitOfWork(session) as uow:
        # Validar stock de ingredientes y calcular subtotal
        subtotal = 0.0
        productos_info = []
        consumo_ingredientes: dict[int, int] = {}

        for linea in checkout_data.linea_ventas:
            producto = uow.productos.get_by_id(linea.producto_id)
            if not producto:
                raise ValueError(f"Producto {linea.producto_id} no existe o fue eliminado")

            links = uow.productos.get_ingrediente_links(producto.id)

            for link in links:
                total_necesario = link.cantidad * linea.cantidad
                consumo_ingredientes[link.ingrediente_id] = (
                    consumo_ingredientes.get(link.ingrediente_id, 0) + total_necesario
                )

            linea_subtotal = producto.precio_base * linea.cantidad
            subtotal += linea_subtotal
            productos_info.append((producto, linea.cantidad, linea_subtotal))

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

        costo_envio = 50.0
        total = subtotal + costo_envio

        pedido = Pedido(
            usuario_id=usuario_id,
            direccion_id=checkout_data.direccion_id,
            estado_codigo="PENDIENTE",
            forma_pago_codigo=checkout_data.forma_pago_codigo,
            notas=checkout_data.notas,
            subtotal=subtotal,
            descuento=0.0,
            costo_envio=costo_envio,
            total=total,
        )
        pedido = uow.pedidos.create(pedido)
        uow.pedidos.flush()

        # Crear detalles con snapshot
        for producto, cantidad, linea_subtotal in productos_info:
            detalle = DetallePedido(
                pedido_id=pedido.id,
                producto_id=producto.id,
                cantidad=cantidad,
                nombre_snapshot=producto.nombre,
                precio_snapshot=producto.precio_base,
                subtotal_snap=linea_subtotal,
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
    return pedido


def update_pedido(session: Session, db_pedido: Pedido, pedido_data: PedidoUpdate) -> Pedido:
    """Actualiza un pedido (sin cambiar estado; usar transition_estado para eso)."""
    with VentaUnitOfWork(session) as uow:
        update_dict = pedido_data.model_dump(exclude_unset=True)
        uow.pedidos.update(db_pedido, update_dict)
        uow.pedidos.refresh(db_pedido)
    return db_pedido


def delete_pedido(session: Session, db_pedido: Pedido):
    """Soft delete: marca con deleted_at."""
    with VentaUnitOfWork(session) as uow:
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
    with VentaUnitOfWork(session) as uow:
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

        historial = HistorialEstadoPedido(
            pedido_id=pedido_id,
            estado_desde=estado_actual,
            estado_hacia=nuevo_estado,
            usuario_id=usuario_id,
            motivo=motivo
        )
        uow.historial.create(historial)
        uow.pedidos.refresh(pedido)
    return pedido


# ============ DETALLE PEDIDO SERVICE ============
def get_detalles_by_pedido(session: Session, pedido_id: int) -> List[DetallePedido]:
    """Obtiene todos los detalles de un pedido."""
    with VentaUnitOfWork(session) as uow:
        return uow.detalles.get_by_pedido(pedido_id)


def create_detalle_pedido(session: Session, detalle_data: DetallePedidoCreate) -> DetallePedido:
    """Crea un detalle de pedido (immutable después de creación)."""
    with VentaUnitOfWork(session) as uow:
        producto = uow.productos.get_by_id(detalle_data.producto_id)
        if not producto:
            raise ValueError(f"Producto {detalle_data.producto_id} no existe o ha sido eliminado")

        new_detalle = DetallePedido.model_validate(detalle_data)
        uow.detalles.create(new_detalle)
        uow.detalles.refresh(new_detalle)
    return new_detalle


# ============ PAGO SERVICE ============
def get_pagos_by_pedido(session: Session, pedido_id: int) -> List[Pago]:
    """Obtiene todos los pagos de un pedido."""
    with VentaUnitOfWork(session) as uow:
        return uow.pagos.get_by_pedido(pedido_id)


def get_pago_by_id(session: Session, pago_id: int) -> Optional[Pago]:
    """Obtiene un pago por ID."""
    with VentaUnitOfWork(session) as uow:
        return uow.pagos.get_by_id(pago_id)


def create_pago(session: Session, pago_data: PagoCreate) -> Pago:
    """Crea un registro de pago."""
    with VentaUnitOfWork(session) as uow:
        pedido = uow.pedidos.get_by_id(pago_data.pedido_id)
        if not pedido:
            raise ValueError(f"Pedido {pago_data.pedido_id} no existe o ha sido eliminado")

        new_pago = Pago.model_validate(pago_data)
        uow.pagos.create(new_pago)
        uow.pagos.refresh(new_pago)
    return new_pago


def update_pago(session: Session, db_pago: Pago, pago_data: dict) -> Pago:
    """Actualiza un pago (para cambios de estado MP)."""
    with VentaUnitOfWork(session) as uow:
        update_dict = {k: v for k, v in pago_data.items() if v is not None}
        uow.pagos.update(db_pago, update_dict)
        uow.pagos.refresh(db_pago)
    return db_pago
