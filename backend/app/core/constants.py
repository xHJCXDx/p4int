"""Catálogos y constantes globales del sistema."""

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
