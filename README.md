# p4int — Food Store Order Management System

**Materia:** Programacion IV - UTN
**Autores:** Hiro Cruz, Mauricio Manzano
**Repositorio publico** conforme a los requisitos de evaluacion.
**Video:** https://drive.google.com/drive/folders/1hJpwYz4_THrdsroQvjBBmfRlkrIrzk0F?usp=sharing

---

## Descripcion

Aplicacion fullstack que integra un backend REST (FastAPI + PostgreSQL) con dos frontends React (tienda publica y panel administrativo). El proyecto demuestra persistencia relacional, autenticacion JWT con Bearer tokens, control de acceso por roles, gestion de pedidos con maquina de estados, pagos con MercadoPago Checkout Pro, notificaciones en tiempo real via WebSocket y dashboard de estadisticas con graficos.

---

## Stack tecnologico

| Capa | Tecnologia |
|------|-----------|
| Backend | FastAPI, SQLModel, PostgreSQL, PyJWT, bcrypt |
| Frontend Tienda | React 18, TanStack Query, Zustand, Axios, Vite |
| Frontend Admin | React 18, TanStack Table, Recharts, Zustand, Vite |
| Pagos | MercadoPago Checkout Pro (SDK Python) |
| Imagenes | Cloudinary |
| Notificaciones | WebSocket con JWT auth |
| Infra | Docker Compose |
| Estilos | Tailwind CSS |
| Validacion | Zod (frontend), Pydantic (backend) |

---

## Requisitos previos

- Python 3.10+
- Node.js 18+
- PostgreSQL 15+ (o Docker)

---

## Instalacion y ejecucion

### 1. Variables de entorno

```bash
cp .env.example .env
# Editar .env con los valores reales (MP, Cloudinary, etc.)
```

### 2. Con Docker (recomendado)

```bash
docker compose up -d
```

Levanta PostgreSQL + backend en `http://localhost:8000`.

### 3. Sin Docker

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
fastapi dev app/main.py

# Frontend Tienda (puerto 5173)
cd frontend
npm install
npm run dev

# Frontend Admin (puerto 5174)
cd frontend-admin
npm install
npm run dev
```

### 4. Seed inicial

Al iniciar, el backend crea automaticamente:
- Roles: ADMIN, STOCK, PEDIDOS, CLIENT
- Estados de pedido: PENDIENTE, CONFIRMADO, EN_PREP, ENTREGADO, CANCELADO
- Formas de pago: MERCADOPAGO, EFECTIVO, TRANSFERENCIA
- Unidades de medida: kg, g, l, ml, u, doc, m2
- Usuario admin por defecto (ver logs del primer inicio)

### Tests

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

113 tests pasando, 1 skipped (checkout con Decimal requiere PostgreSQL).

---

## Arquitectura backend

### Capas

```
Router (HTTP) -> Service (logica) -> Repository (datos) -> Model (SQLModel)
                                  -> Unit of Work (transacciones)
```

### Patrones implementados

| Patron | Descripcion |
|--------|-------------|
| Unit of Work | Gestion transaccional atomica. El service nunca hace `session.commit()` directamente. |
| Repository | `BaseRepository[T]` generico; cada modulo extiende con queries propias. |
| Service Layer | Logica de negocio desacoplada del router y de la base de datos. |
| Soft Delete | Campo `deleted_at` (nullable). Las queries filtran `WHERE deleted_at IS NULL`. |
| Snapshot | `DetallePedido` almacena `nombre_snapshot` y `precio_snapshot` inmutables al momento de la compra. |
| Audit Trail | `HistorialEstadoPedido` append-only: solo INSERTs, nunca UPDATE ni DELETE. |
| FSM | Transiciones validadas en el service contra `TRANSICIONES_PERMITIDAS`. |

### Autenticacion y autorizacion

- Registro con asignacion automatica del rol CLIENT
- Login genera `access_token` (JWT, 30 min) + `refresh_token` (7 dias)
- Auth via header `Authorization: Bearer <token>`
- Refresh via `POST /api/v1/auth/refresh` con body `{ refresh_token }`
- Hash de contrasenas con bcrypt
- Rate limiting: 5 requests / 15 min en login y register (slowapi)

### Maquina de estados (FSM)

```
PENDIENTE -> CONFIRMADO -> EN_PREP -> ENTREGADO
    |             |           |
    v             v           v
CANCELADO    CANCELADO    CANCELADO
```

- Cancelacion requiere motivo obligatorio (RN-05)
- CLIENT solo puede cancelar sus propios pedidos (PENDIENTE o CONFIRMADO)
- Cada transicion genera registro en `HistorialEstadoPedido`

### Endpoints principales

| Modulo | Ruta | Descripcion |
|--------|------|-------------|
| Auth | `/api/v1/auth/*` | Register, login, logout, refresh, me |
| Categorias | `/api/v1/categorias/*` | CRUD con jerarquia (parent_id) |
| Productos | `/api/v1/productos/*` | CRUD con receta (ingredientes N:N) |
| Ingredientes | `/api/v1/ingredientes/*` | CRUD con stock y alergenos |
| Pedidos | `/api/v1/pedidos/*` | CRUD + FSM + historial |
| Pagos | `/api/v1/pagos/*` | Crear pago MP, webhook IPN, consultar |
| Estadisticas | `/api/v1/estadisticas/*` | KPIs, ventas, top productos, ingresos |
| Uploads | `/api/v1/uploads/*` | Upload imagenes a Cloudinary |
| Catalogo | `/api/v1/catalogo/*` | Datos maestros (estados, formas pago, unidades) |
| Direcciones | `/api/v1/direcciones/*` | CRUD direcciones de entrega |
| Usuarios | `/api/v1/admin/usuarios/*` | Gestion de usuarios (ADMIN) |
| WebSocket | `/ws?token=<jwt>` | Notificaciones real-time de estados |

Documentacion interactiva: `http://localhost:8000/docs`

### Respuestas estandarizadas

```json
{
  "success": true,
  "message": "Productos obtenidos",
  "data": { "items": [], "total": 15, "page": 1, "size": 10, "pages": 2 },
  "status_code": 200
}
```

---

## Frontend Tienda (puerto 5173)

- **Home:** catalogo con filtros por categoria, busqueda y paginacion
- **Detalle producto:** ingredientes, alergenos, agregar al carrito
- **Carrito:** cantidades ajustables, persistencia en localStorage (Zustand)
- **Checkout:** seleccion de direccion + forma de pago. Si elige MERCADOPAGO, redirige a Checkout Pro
- **Mis Pedidos:** historial con estados actualizados en tiempo real via WebSocket
- **WebSocket:** notificacion toast cuando cambia el estado de un pedido

## Frontend Admin (puerto 5174)

- **Dashboard:** 4 KPIs + grafico de ventas (BarChart) + pedidos por estado (PieChart) + top productos
- **Categorias:** CRUD con subcategorias
- **Productos:** CRUD con receta, upload de imagenes a Cloudinary (preview + eliminar)
- **Ingredientes:** CRUD con stock, unidades de medida, alergenos
- **Pedidos:** tabla con transiciones de estado, motivo de cancelacion
- **WebSocket:** notificacion toast al recibir cambios de estado

### Diferenciacion por rol

| Rol | Acceso |
|-----|--------|
| ADMIN | Dashboard, categorias, productos, ingredientes, pedidos, usuarios |
| STOCK | Productos (lectura), ingredientes |
| PEDIDOS | Pedidos con transiciones de estado |

---

## Estructura del proyecto

```
p4int/
├── backend/
│   ├── app/
│   │   ├── core/               Config, security, DB, rate limit, WS, Cloudinary, MP
│   │   └── modules/            Modulos por dominio (screaming architecture)
│   │       ├── auth/
│   │       ├── categorias/
│   │       ├── estadisticas/
│   │       ├── ingredientes/
│   │       ├── pagos/
│   │       ├── pedidos/
│   │       ├── productos/
│   │       ├── uploads/
│   │       └── usuarios/
│   ├── tests/                  113 tests (pytest + TestClient + SQLite)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                   Tienda publica
├── frontend-admin/             Panel de administracion
├── docker-compose.yml
├── .env.example
└── INFORME_TECNICO.md
```

---

## Usuarios de prueba

| Email | Contrasena | Roles |
|-------|-----------|-------|
| admin@admin.com | admin123 | ADMIN |
| cliente@test.com | cliente123 | CLIENT |
| empleado@tienda.com | empleado123 | PEDIDOS |
| gerente@tienda.com | gerente123 | STOCK |
