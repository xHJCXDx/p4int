"""Catálogos y constantes globales del sistema."""

# Unidades de Medida (Seed obligatorio)
UNIDADES_MEDIDA = [
    {"codigo": "kg", "nombre": "Kilogramos"},
    {"codigo": "g", "nombre": "Gramos"},
    {"codigo": "l", "nombre": "Litros"},
    {"codigo": "ml", "nombre": "Mililitros"},
    {"codigo": "u", "nombre": "Unidades"},
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
    {"codigo": "PENDIENTE", "descripcion": "Pedido creado, esperando confirmación de pago", "orden": 1, "es_terminal": False},
    {"codigo": "CONFIRMADO", "descripcion": "Pago recibido, en espera de preparación", "orden": 2, "es_terminal": False},
    {"codigo": "EN_PREP", "descripcion": "Preparando el pedido", "orden": 3, "es_terminal": False},
    {"codigo": "EN_CAMINO", "descripcion": "Pedido en camino al cliente", "orden": 4, "es_terminal": False},
    {"codigo": "ENTREGADO", "descripcion": "Pedido entregado al cliente", "orden": 5, "es_terminal": True},
    {"codigo": "CANCELADO", "descripcion": "Pedido cancelado", "orden": 99, "es_terminal": True},
]

# Transiciones permitidas en el FSM (mapa de estados)
TRANSICIONES_PERMITIDAS = {
    "PENDIENTE": ["CONFIRMADO", "CANCELADO"],
    "CONFIRMADO": ["EN_PREP", "CANCELADO"],
    "EN_PREP": ["EN_CAMINO", "CANCELADO"],
    "EN_CAMINO": ["ENTREGADO"],
    "ENTREGADO": [],  # Terminal
    "CANCELADO": [],  # Terminal
}

# Mapeo de acciones a estados (para transiciones simplificadas desde UI)
ACCIONES_A_ESTADOS = {
    "confirmar": "CONFIRMADO",
    "preparar": "EN_PREP",
    "enviar": "EN_CAMINO",
    "entregar": "ENTREGADO",
}

# Roles (Seed obligatorio)
ROLES = [
    {"codigo": "ADMIN", "nombre": "Administrador", "descripcion": "Administrador del sistema"},
    {"codigo": "STOCK", "nombre": "Gestor de Stock", "descripcion": "Gestor de Stock"},
    {"codigo": "PEDIDOS", "nombre": "Gestor de Pedidos", "descripcion": "Gestor de Pedidos"},
    {"codigo": "CLIENT", "nombre": "Cliente", "descripcion": "Cliente"},
]
