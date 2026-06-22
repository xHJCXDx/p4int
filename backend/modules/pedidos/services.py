from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlmodel import Session

from backend.core.links import ProductoIngredienteLink
from backend.core.unit_of_work import UnitOfWork
from backend.core.ws_manager import ws_manager
from backend.modules.pedidos.models import DetallePedido, HistorialEstadoPedido, Pedido
from backend.modules.pedidos.schemas import (
    AvanzarEstadoRequest,
    DetallePedidoRead,
    HistorialEstadoPedidoRead,
    PedidoCreate,
    PedidoPaginatedResponse,
    PedidoRead,
    PedidoReadFull,
)

# Máquina de estados: estado_actual -> transiciones permitidas
_TRANSICIONES: dict[str, list[str]] = {
    "PENDIENTE": ["CONFIRMADO", "CANCELADO"],
    "CONFIRMADO": ["EN_PREP", "CANCELADO"],
    "EN_PREP": ["ENTREGADO", "CANCELADO"],
    "ENTREGADO": [],
    "CANCELADO": [],
}

# Estados desde los cuales el cliente puede cancelar
_CANCELABLES_CLIENTE = ["PENDIENTE", "CONFIRMADO"]
_ROLES_OPERADOR_PEDIDOS = ("ADMIN", "PEDIDOS")
_ROLES_VISOR_PEDIDOS = ("ADMIN", "PEDIDOS", "STOCK")
_BEBIDA_KEYWORDS = (
    "bebida",
    "bebidas",
    "agua",
    "aguas",
    "gaseosa",
    "gaseosas",
    "jugo",
    "jugos",
    "cerveza",
    "cervezas",
    "vino",
    "vinos",
    "refresco",
    "refrescos",
    "soda",
    "cola",
)


class PedidoService:
    def __init__(self, session: Session) -> None:
        self._session = session

    def _normalizar_texto(self, value: str) -> str:
        return (
            value.lower()
            .replace("á", "a")
            .replace("é", "e")
            .replace("í", "i")
            .replace("ó", "o")
            .replace("ú", "u")
        )

    def _es_producto_bebida(self, uow: UnitOfWork, producto_id: int, nombre_producto: str) -> bool:
        nombres_categoria = uow.pedidos.get_categoria_nombres_by_producto(producto_id)

        textos = [nombre_producto, *nombres_categoria]
        for texto in textos:
            normalized = self._normalizar_texto(texto)
            if any(keyword in normalized for keyword in _BEBIDA_KEYWORDS):
                return True
        return False

    def _get_or_404(self, uow: UnitOfWork, pedido_id: int) -> Pedido:
        pedido = uow.pedidos.get_by_id(pedido_id)
        if not pedido:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pedido con id={pedido_id} no encontrado",
            )
        return pedido

    def _serialize_full(self, uow: UnitOfWork, pedido: Pedido) -> PedidoReadFull:
        detalles = uow.detalles_pedido.get_by_pedido(pedido.id)
        historial = uow.historial_pedido.get_by_pedido(pedido.id)
        return PedidoReadFull(
            **PedidoRead.model_validate(pedido).model_dump(),
            detalles=[DetallePedidoRead.model_validate(d) for d in detalles],
            historial=[HistorialEstadoPedidoRead.model_validate(h) for h in historial],
        )

    def _build_stock_consumption_from_detalles(
        self,
        uow: UnitOfWork,
        detalles: list[DetallePedido],
    ) -> tuple[dict[int, int], dict[int, Decimal]]:
        consumo_productos: dict[int, int] = {}
        consumo_ingredientes: dict[int, Decimal] = {}
        cache_recetas: dict[int, list[ProductoIngredienteLink]] = {}

        for detalle in detalles:
            consumo_productos[detalle.producto_id] = (
                consumo_productos.get(detalle.producto_id, 0) + int(detalle.cantidad)
            )
            if detalle.producto_id not in cache_recetas:
                cache_recetas[detalle.producto_id] = uow.pedidos.get_receta_by_producto(detalle.producto_id)
                if not cache_recetas[detalle.producto_id]:
                    producto = uow.productos.get_by_id(detalle.producto_id)
                    nombre = producto.nombre if producto else f"id={detalle.producto_id}"
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"El producto '{nombre}' no es vendible porque no tiene receta configurada",
                    )

            for receta_link in cache_recetas[detalle.producto_id]:
                if Decimal(receta_link.cantidad) <= 0:
                    producto = uow.productos.get_by_id(detalle.producto_id)
                    nombre = producto.nombre if producto else f"id={detalle.producto_id}"
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"El producto '{nombre}' no es vendible porque tiene una receta inválida",
                    )
                consumo = Decimal(receta_link.cantidad) * int(detalle.cantidad)
                consumo_ingredientes[receta_link.ingrediente_id] = (
                    consumo_ingredientes.get(receta_link.ingrediente_id, Decimal("0")) + consumo
                )

        return consumo_productos, consumo_ingredientes

    def _validate_stock_available(
        self,
        uow: UnitOfWork,
        consumo_productos: dict[int, int],
        consumo_ingredientes: dict[int, Decimal],
    ) -> None:
        for producto_id, cantidad in consumo_productos.items():
            producto = uow.productos.get_by_id(producto_id)
            if not producto:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Producto con id={producto_id} no encontrado",
                )
            if not producto.disponible:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El producto '{producto.nombre}' no est\u00e1 disponible",
                )

        for ingrediente_id, consumo in consumo_ingredientes.items():
            ingrediente = uow.ingredientes.get_by_id(ingrediente_id)
            if not ingrediente:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Ingrediente con id={ingrediente_id} no encontrado",
                )
            if Decimal(ingrediente.stock_cantidad) < consumo:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Stock insuficiente del ingrediente '{ingrediente.nombre}' "
                        f"(disponible: {ingrediente.stock_cantidad})"
                    ),
                )

    def _apply_stock_delta(
        self,
        uow: UnitOfWork,
        consumo_productos: dict[int, int],
        consumo_ingredientes: dict[int, Decimal],
        *,
        sign: int,
    ) -> None:
        for ingrediente_id, consumo in consumo_ingredientes.items():
            ingrediente = uow.ingredientes.get_by_id(ingrediente_id)
            if not ingrediente:
                continue
            nuevo_stock = Decimal(ingrediente.stock_cantidad) + (sign * consumo)
            ingrediente.stock_cantidad = max(0, int(nuevo_stock))
            ingrediente.updated_at = datetime.utcnow()
            uow.ingredientes.add(ingrediente)

    def crear_pedido(self, usuario_id: int, data: PedidoCreate) -> PedidoReadFull:
        with UnitOfWork(self._session) as uow:

            # Validar forma de pago
            forma_pago = uow.formas_pago.get_by_codigo(data.forma_pago_codigo)
            if not forma_pago or not forma_pago.habilitado:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Forma de pago '{data.forma_pago_codigo}' no válida o deshabilitada",
                )

            # Validar dirección (si se proporcionó)
            if data.direccion_id is not None:
                d = uow.direcciones.get_by_id(data.direccion_id)
                if not d or d.usuario_id != usuario_id:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Dirección no encontrada",
                    )

            # Validar productos y armar snapshot (sin descontar stock en PENDIENTE)
            subtotal = Decimal("0")
            items_procesados = []
            ingredientes_por_producto: dict[int, set[int]] = {}
            detalles_simulados: list[DetallePedido] = []
            for item in data.items:
                producto = uow.productos.get_by_id(item.producto_id)
                if not producto:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Producto con id={item.producto_id} no encontrado",
                    )
                if not producto.disponible:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"El producto '{producto.nombre}' no está disponible",
                    )
                if item.producto_id not in ingredientes_por_producto:
                    ingredientes_por_producto[item.producto_id] = uow.pedidos.get_ingrediente_ids_by_producto(
                        item.producto_id
                    )

                ids_ingredientes_producto = ingredientes_por_producto[item.producto_id]
                personalizacion_limpia = sorted(
                    set(int(ing_id) for ing_id in item.personalizacion if int(ing_id) > 0)
                )

                es_bebida = self._es_producto_bebida(
                    uow=uow,
                    producto_id=item.producto_id,
                    nombre_producto=producto.nombre,
                )
                if es_bebida and personalizacion_limpia:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=(
                            f"El producto '{producto.nombre}' es una bebida y no permite personalizacion"
                        ),
                    )

                if not set(personalizacion_limpia).issubset(ids_ingredientes_producto):
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=(
                            f"La personalizacion del producto '{producto.nombre}' incluye ingredientes invalidos"
                        ),
                    )

                sub = producto.precio_base * item.cantidad
                subtotal += sub
                items_procesados.append((item, producto, producto.precio_base, sub, personalizacion_limpia))
                detalles_simulados.append(
                    DetallePedido(
                        pedido_id=0,
                        producto_id=item.producto_id,
                        cantidad=item.cantidad,
                        nombre_snapshot=producto.nombre,
                        precio_snapshot=producto.precio_base,
                        subtotal_snap=sub,
                        personalizacion=personalizacion_limpia,
                    )
                )

            consumo_productos, consumo_ingredientes = self._build_stock_consumption_from_detalles(
                uow, detalles_simulados
            )
            self._validate_stock_available(
                uow=uow,
                consumo_productos=consumo_productos,
                consumo_ingredientes=consumo_ingredientes,
            )

            descuento = Decimal("0")
            costo_envio = Decimal("50") if data.direccion_id else Decimal("0")
            total = subtotal - descuento + costo_envio

            # Crear el pedido
            pedido = Pedido(
                usuario_id=usuario_id,
                direccion_id=data.direccion_id,
                forma_pago_codigo=data.forma_pago_codigo,
                estado_codigo="PENDIENTE",
                subtotal=subtotal,
                descuento=descuento,
                costo_envio=costo_envio,
                total=total,
                notas=data.notas,
            )
            uow.pedidos.add(pedido)

            # Crear detalles con snapshot inmutable
            for item, producto, precio, sub, personalizacion_limpia in items_procesados:
                uow.detalles_pedido.add(
                    DetallePedido(
                        pedido_id=pedido.id,
                        producto_id=item.producto_id,
                        cantidad=item.cantidad,
                        nombre_snapshot=producto.nombre,
                        precio_snapshot=precio,
                        subtotal_snap=sub,
                        personalizacion=personalizacion_limpia,
                    )
                )

            # Primera entrada del historial (estado_desde=None -> creación)
            uow.historial_pedido.add(
                HistorialEstadoPedido(
                    pedido_id=pedido.id,
                    estado_desde=None,
                    estado_hacia="PENDIENTE",
                    usuario_id=usuario_id,
                )
            )

            result = self._serialize_full(uow, pedido)
            pedido_id_result = pedido.id
            pedido_usuario_id = pedido.usuario_id
            pedido_forma_pago = pedido.forma_pago_codigo

        if pedido_forma_pago != "MERCADOPAGO":
            evento = {
                "event": "pedido_creado",
                "pedido_id": pedido_id_result,
                "estado_hacia": "PENDIENTE",
            }
            ws_manager.broadcast_pedido_sync(pedido_id_result, pedido_usuario_id, evento)
        return result

    def get_all(
        self,
        usuario_id: int,
        rol: str,
        offset: int = 0,
        limit: int = 10,
    ) -> PedidoPaginatedResponse:
        with UnitOfWork(self._session) as uow:
            # ADMIN/PEDIDOS ven todos; CLIENT solo los propios.
            # STOCK y cualquier otro rol no tienen acceso al módulo de pedidos.
            if rol in _ROLES_VISOR_PEDIDOS:
                filtro = None
            elif rol == "CLIENT":
                filtro = usuario_id
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tenés permisos para listar pedidos",
                )

            total, pedidos = uow.pedidos.get_paginated(
                offset=offset,
                limit=limit,
                usuario_id=filtro,
            )
            items = [PedidoRead.model_validate(p) for p in pedidos]
        return PedidoPaginatedResponse(total=total, items=items)

    def get_by_id(self, pedido_id: int, usuario_id: int, rol: str) -> PedidoReadFull:
        with UnitOfWork(self._session) as uow:
            pedido = self._get_or_404(uow, pedido_id)

            if rol in _ROLES_VISOR_PEDIDOS:
                return self._serialize_full(uow, pedido)

            if rol == "CLIENT":
                if pedido.usuario_id != usuario_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="No tenés acceso a este pedido",
                    )
                return self._serialize_full(uow, pedido)

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tenés permisos para ver este pedido",
            )

    def avanzar_estado(
        self,
        pedido_id: int,
        data: AvanzarEstadoRequest,
        usuario_id: int,
        rol: str,
    ) -> PedidoReadFull:
        with UnitOfWork(self._session) as uow:
            pedido = self._get_or_404(uow, pedido_id)
            estado_actual = pedido.estado_codigo
            estado_nuevo = data.estado_hacia

            if rol in _ROLES_OPERADOR_PEDIDOS:
                pass
            elif rol == "CLIENT":
                if pedido.usuario_id != usuario_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="No tenés acceso a este pedido",
                    )
                if estado_nuevo != "CANCELADO":
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Como cliente solo podés cancelar pedidos",
                    )
                if estado_actual not in _CANCELABLES_CLIENTE:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"No podés cancelar un pedido en estado {estado_actual}",
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tenés permisos para cambiar el estado de pedidos",
                )

            # Validar que la transición sea válida según la FSM
            if estado_nuevo not in _TRANSICIONES.get(estado_actual, []):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Transición inválida: {estado_actual} -> {estado_nuevo}",
                )

            # Reglas extra para CANCELADO
            if estado_nuevo == "CANCELADO" and not data.motivo:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="El motivo es obligatorio al cancelar un pedido",
                )

            if estado_nuevo == "CONFIRMADO":
                detalles = uow.detalles_pedido.get_by_pedido(pedido.id)
                consumo_productos, consumo_ingredientes = self._build_stock_consumption_from_detalles(
                    uow, detalles
                )
                self._validate_stock_available(
                    uow=uow,
                    consumo_productos=consumo_productos,
                    consumo_ingredientes=consumo_ingredientes,
                )
                self._apply_stock_delta(
                    uow=uow,
                    consumo_productos=consumo_productos,
                    consumo_ingredientes=consumo_ingredientes,
                    sign=-1,
                )

            if estado_nuevo == "CANCELADO" and estado_actual != "PENDIENTE":
                detalles = uow.detalles_pedido.get_by_pedido(pedido.id)
                consumo_productos, consumo_ingredientes = self._build_stock_consumption_from_detalles(
                    uow, detalles
                )
                self._apply_stock_delta(
                    uow=uow,
                    consumo_productos=consumo_productos,
                    consumo_ingredientes=consumo_ingredientes,
                    sign=1,
                )

            # Actualizar estado del pedido
            pedido.estado_codigo = estado_nuevo
            pedido.updated_at = datetime.utcnow()

            # Registrar transición en el historial (append-only)
            uow.historial_pedido.add(
                HistorialEstadoPedido(
                    pedido_id=pedido.id,
                    estado_desde=estado_actual,
                    estado_hacia=estado_nuevo,
                    usuario_id=usuario_id,
                    motivo=data.motivo,
                )
            )

            result = self._serialize_full(uow, pedido)
            pedido_id_result = pedido.id
            pedido_usuario_id = pedido.usuario_id
            evento = {
                "event": "estado_cambiado",
                "pedido_id": pedido.id,
                "estado_desde": estado_actual,
                "estado_hacia": estado_nuevo,
            }
        ws_manager.broadcast_pedido_sync(pedido_id_result, pedido_usuario_id, evento)
        return result
