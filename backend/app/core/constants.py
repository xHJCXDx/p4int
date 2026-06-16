"""Catálogos y constantes globales del sistema."""

from decimal import Decimal
from enum import Enum


class RolCode(str, Enum):
    ADMIN = "ADMIN"
    STOCK = "STOCK"
    PEDIDOS = "PEDIDOS"
    CLIENT = "CLIENT"


# Unidades de Medida (Seed obligatorio)
UNIDADES_MEDIDA = [
    {"codigo": "kg", "nombre": "kilogramo", "simbolo": "kg", "tipo": "masa"},
    {"codigo": "g", "nombre": "gramo", "simbolo": "g", "tipo": "masa"},
    {"codigo": "l", "nombre": "litro", "simbolo": "L", "tipo": "volumen"},
    {"codigo": "ml", "nombre": "mililitro", "simbolo": "mL", "tipo": "volumen"},
    {"codigo": "u", "nombre": "pieza", "simbolo": "u", "tipo": "unidad"},
    {"codigo": "doc", "nombre": "docena", "simbolo": "doc", "tipo": "unidad"},
    {"codigo": "m2", "nombre": "metro cuadrado", "simbolo": "m²", "tipo": "area"},
]

# Factores de conversión a unidad base por tipo:
# masa → gramo (g), volumen → mililitro (mL), unidad → pieza (u), area → m2
FACTORES_CONVERSION: dict[str, Decimal] = {
    "kg": Decimal("1000"),
    "g": Decimal("1"),
    "l": Decimal("1000"),
    "ml": Decimal("1"),
    "u": Decimal("1"),
    "doc": Decimal("12"),
    "m2": Decimal("1"),
}

# Tipo de cada unidad (para validar conversiones entre mismas magnitudes)
TIPO_UNIDAD: dict[str, str] = {um["codigo"]: um["tipo"] for um in UNIDADES_MEDIDA}


def convertir_unidad(cantidad: Decimal, codigo_origen: str, codigo_destino: str) -> Decimal:
    """Convierte cantidad de una unidad a otra del mismo tipo.
    Ej: convertir_unidad(200, "g", "kg") → 0.200
    """
    if codigo_origen == codigo_destino:
        return cantidad

    tipo_origen = TIPO_UNIDAD.get(codigo_origen)
    tipo_destino = TIPO_UNIDAD.get(codigo_destino)

    if not tipo_origen or not tipo_destino:
        raise ValueError(f"Unidad de medida desconocida: {codigo_origen} o {codigo_destino}")

    if tipo_origen != tipo_destino:
        raise ValueError(
            f"No se puede convertir entre {codigo_origen} ({tipo_origen}) "
            f"y {codigo_destino} ({tipo_destino})"
        )

    factor_origen = FACTORES_CONVERSION[codigo_origen]
    factor_destino = FACTORES_CONVERSION[codigo_destino]
    return cantidad * factor_origen / factor_destino

# Formas de Pago (Seed obligatorio)
FORMAS_PAGO = [
    {"codigo": "MERCADOPAGO", "descripcion": "Checkout MercadoPago", "habilitado": True},
    {"codigo": "EFECTIVO", "descripcion": "Retiro en local (Efectivo)", "habilitado": True},
    {"codigo": "TRANSFERENCIA", "descripcion": "Transferencia bancaria", "habilitado": True},
]

# Estados de Pedido (FSM - Finite State Machine)
# orden: secuencia en el flujo; es_terminal: si no permite transiciones salientes
ESTADOS_PEDIDO = [
    {"codigo": "PENDIENTE", "descripcion": "Pedido creado, pago pendiente", "orden": 1, "es_terminal": False},
    {"codigo": "CONFIRMADO", "descripcion": "Pago procesado y confirmado", "orden": 2, "es_terminal": False},
    {"codigo": "EN_PREP", "descripcion": "En preparación en cocina", "orden": 3, "es_terminal": False},
    {"codigo": "ENTREGADO", "descripcion": "Entrega confirmada", "orden": 4, "es_terminal": True},
    {"codigo": "CANCELADO", "descripcion": "Pedido cancelado", "orden": 5, "es_terminal": True},
]

# Transiciones permitidas en el FSM (mapa de estados)
TRANSICIONES_PERMITIDAS = {
    "PENDIENTE": ["CONFIRMADO", "CANCELADO"],
    "CONFIRMADO": ["EN_PREP", "CANCELADO"],
    "EN_PREP": ["ENTREGADO", "CANCELADO"],
    "ENTREGADO": [],  # Terminal
    "CANCELADO": [],  # Terminal
}

# Mapeo de acciones a estados (para transiciones simplificadas desde UI)
ACCIONES_A_ESTADOS = {
    "confirmar": "CONFIRMADO",
    "preparar": "EN_PREP",
    "entregar": "ENTREGADO",
}

# Roles (Seed obligatorio)
ROLES = [
    {"codigo": "ADMIN", "nombre": "Administrador", "descripcion": "Administrador del sistema"},
    {"codigo": "STOCK", "nombre": "Gestor de Stock", "descripcion": "Gestor de Stock"},
    {"codigo": "PEDIDOS", "nombre": "Gestor de Pedidos", "descripcion": "Gestor de Pedidos"},
    {"codigo": "CLIENT", "nombre": "Cliente", "descripcion": "Cliente"},
]
