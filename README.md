# p4int — Food Store Order Management

**Materia:** Programacion IV - UTN
**Autores:** Hiro Cruz, Mauricio Manzano
**Video:** https://drive.google.com/drive/folders/1hJpwYz4_THrdsroQvjBBmfRlkrIrzk0F?usp=sharing

## Requisitos

- Python 3.10+
- Node.js 18+
- PostgreSQL 15+ (o Docker)

## Ejecucion con Docker

```bash
cp .env.example .env
# Completar las variables de entorno (MercadoPago, Cloudinary, etc.)

docker compose up -d
```

| Servicio | URL |
|----------|-----|
| Backend API | http://localhost:8000 |
| Documentacion Swagger | http://localhost:8000/docs |
| Frontend Tienda | http://localhost:5173 |
| Frontend Admin | http://localhost:5174 |

## Ejecucion sin Docker

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
fastapi dev app/main.py        # http://localhost:8000
```

### Frontend Tienda

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

### Frontend Admin

```bash
cd frontend-admin
npm install
npm run dev                    # http://localhost:5174
```

## Tests

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

## Arquitectura

### Estructura del proyecto

```
p4int/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── admin/                  Gestion de usuarios (ADMIN)
│   │   ├── core/                   Infraestructura compartida
│   │   │   ├── database.py             Conexion SQLModel + get_session
│   │   │   ├── security.py             JWT (access + refresh), bcrypt, roles
│   │   │   ├── repository.py           BaseRepository[T] generico
│   │   │   ├── unit_of_work.py         BaseUnitOfWork (commit/rollback)
│   │   │   ├── response.py             ApiResponse, BusinessRuleError, RFC 7807
│   │   │   ├── constants.py            FSM, roles, seeds
│   │   │   ├── rate_limit.py           slowapi (5 req/15min en auth)
│   │   │   ├── ws_manager.py           WebSocket por canales
│   │   │   ├── mercadopago.py          SDK MercadoPago
│   │   │   └── types.py               TypeDecorators portables
│   │   └── modules/                Dominios (screaming architecture)
│   │       ├── auth/                   Login, register, refresh, logout
│   │       ├── catalogo/               Datos maestros (estados, formas pago, unidades)
│   │       ├── categorias/             CRUD con jerarquia (CTE recursivo)
│   │       ├── direcciones/            CRUD direcciones de entrega
│   │       ├── estadisticas/           KPIs, ventas, top productos, ingresos
│   │       ├── ingredientes/           CRUD con stock y alergenos
│   │       ├── pagos/                  MercadoPago Checkout Pro + webhook
│   │       ├── pedidos/                CRUD + FSM + historial + snapshots
│   │       ├── productos/              CRUD con receta (ingredientes N:N)
│   │       ├── uploads/                Imagenes a Cloudinary
│   │       └── usuarios/               Modelo y seed de usuarios
│   └── tests/
│       ├── conftest.py                 Fixtures: engine, session, client, admin_client
│       ├── test_auth.py
│       ├── test_categoria/             test_router.py, test_service.py
│       ├── test_ingrediente/           test_router.py, test_service.py
│       ├── test_pedido/                test_router.py, test_service.py
│       ├── test_producto/              test_router.py, test_service.py
│       ├── test_estadisticas.py
│       ├── test_webhook_signature.py
│       └── test_ws.py
├── frontend/                       Tienda publica (React + Vite)
│   └── src/
│       ├── api/                        Axios clients
│       ├── components/                 UI components
│       ├── hooks/                      TanStack Query hooks
│       ├── pages/                      store/, admin/
│       ├── schemas/                    Zod validation
│       ├── store/                      Zustand (carrito, auth)
│       └── types/                      TypeScript types
├── frontend-admin/                 Panel administrativo (React + Vite)
│   └── src/
│       ├── api/
│       ├── components/
│       ├── hooks/
│       ├── pages/admin/
│       ├── schemas/
│       ├── store/
│       └── types/
└── docker-compose.yml              PostgreSQL + backend + frontends + ngrok
```

### Flujo de request (backend)

```
Router (HTTP) → Service (logica) → UnitOfWork (transaccion) → Repository (datos) → Model (SQLModel)
```

Cada modulo en `modules/` sigue la misma estructura interna:

```
model.py → schema.py → repository.py → service.py → unit_of_work.py → router.py → seed.py
```

### Patrones

| Patron | Donde |
|--------|-------|
| Unit of Work | `core/unit_of_work.py` — commit/rollback automatico, services nunca hacen commit directo |
| Repository generico | `core/repository.py` — CRUD + paginacion, cada modulo extiende |
| Soft Delete | `deleted_at` nullable, queries filtran `WHERE deleted_at IS NULL` |
| FSM | Transiciones de pedido validadas contra `TRANSICIONES_PERMITIDAS` en `constants.py` |
| Snapshot | `DetallePedido` guarda `nombre_snapshot` + `precio_snapshot` inmutables |
| Audit Trail | `HistorialEstadoPedido` append-only (solo INSERTs) |
| ApiResponse envelope | Todas las respuestas usan `{ success, message, data, status_code }` |
| JWT Bearer | Access token (30 min) + refresh token (7 dias), rate limit en auth |

### FSM de pedidos

```
PENDIENTE → CONFIRMADO → EN_PREP → ENTREGADO
    |            |           |
    v            v           v
CANCELADO    CANCELADO    CANCELADO
```

## Usuarios de prueba

| Email | Contrasena | Rol |
|-------|-----------|-----|
| admin@admin.com | admin123 | ADMIN |
| cliente@test.com | cliente123 | CLIENT |
| empleado@tienda.com | empleado123 | PEDIDOS |
| gerente@tienda.com | gerente123 | STOCK |
