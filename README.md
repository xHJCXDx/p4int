# Tienda de Alimentos - Parcial 2

**Materia:** Programacion IV - UTN  
**Autores:** Hiro Cruz, Mauricio Manzano  
**Repositorio publico** conforme a los requisitos de evaluacion.
**Video:** https://drive.google.com/drive/folders/1hJpwYz4_THrdsroQvjBBmfRlkrIrzk0F?usp=sharing 

---

## Descripcion

Aplicacion fullstack que integra un backend REST (FastAPI + PostgreSQL) con dos frontends React (tienda publica y panel administrativo). El proyecto demuestra persistencia relacional, autenticacion JWT, control de acceso por roles, gestion de pedidos con maquina de estados y patrones de arquitectura backend.

---

## Requisitos previos

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

---

## Instalacion y ejecucion

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
fastapi dev app/main.py
```

Servidor disponible en `http://localhost:8000`.  
Documentacion interactiva: `http://localhost:8000/docs` (Swagger UI) y `/redoc`.

El backend crea la base de datos automaticamente si no existe y ejecuta el seed de datos obligatorios al iniciar.

### Frontend - Tienda publica

```bash
cd frontend
npm install
npm run dev
```

Disponible en `http://localhost:5173`.

### Frontend - Panel administrativo

```bash
cd frontend-admin
npm install
npm run dev
```

Disponible en `http://localhost:5174`.

---

## Estructura del proyecto

```
p4_p2/
├── backend/
│   └── app/
│       ├── core/               Configuracion central (database, security, constants, response, repository, unit_of_work)
│       ├── usuario/            Autenticacion, registro, roles (model, schema, service, repository, router, unit_of_work)
│       ├── categoria/          CRUD categorias con autorreferencia (parent_id)
│       ├── producto/           CRUD productos con relaciones N:N a categorias e ingredientes
│       ├── ingrediente/        CRUD ingredientes con stock, unidad de medida y alergenos
│       ├── venta/              Pedidos, detalles, pagos, historial de estados (FSM)
│       ├── direccion/          Direcciones de entrega del usuario
│       ├── catalogo/           Tablas de referencia: UnidadMedida, FormaPago, EstadoPedido
│       ├── admin/              Gestion de usuarios y asignacion de roles
│       ├── seed.py             Seed de datos de ejemplo (productos, ingredientes, categorias)
│       └── main.py             Punto de entrada, lifespan, registro de routers, CORS
│
├── frontend/                   Tienda publica (React + TypeScript + Vite)
│   └── src/
│       ├── api/                Instancia de Axios con interceptor
│       ├── components/         Componentes reutilizables (Toast, ConfirmDialog, tablas)
│       ├── hooks/              Custom hooks con TanStack Query (useQuery, useMutation)
│       ├── pages/store/        Home, carrito, checkout, mis pedidos, detalle de producto
│       ├── pages/admin/        Login empleado, cajero
│       ├── store/              Zustand (auth, carrito)
│       └── types/              Interfaces TypeScript
│
└── frontend-admin/             Panel de administracion (React + TypeScript + Vite)
    └── src/
        ├── api/                Instancia de Axios con interceptor
        ├── components/         Tablas (TanStack Table), formularios, Toast, ConfirmDialog
        ├── hooks/              Custom hooks con TanStack Query
        ├── pages/              Categorias, productos, ingredientes, pedidos
        ├── store/              Zustand (auth)
        └── types/              Interfaces TypeScript
```

---

## Backend - Arquitectura y patrones

### Capas de la aplicacion

| Capa | Responsabilidad |
|------|----------------|
| Router | Recibe HTTP requests. Define path/query params con `Annotated`, `Query` y `Path`. Retorna `ApiResponse`. |
| Service | Logica de negocio stateless. Nunca accede a la session directamente. |
| Unit of Work | Context manager que encapsula la transaccion. Commit automatico al salir, rollback en caso de error. |
| Repository | Acceso a datos. `BaseRepository[T]` generico con CRUD base; cada modulo extiende con queries propias. |
| Schema | Contratos de entrada/salida con Pydantic. Separacion en Create, Read, Update. |

### Patrones implementados

| Patron | Descripcion |
|--------|-------------|
| Unit of Work | Gestion transaccional atomica. El service nunca hace `session.commit()` directamente. |
| Repository | `BaseRepository[T]` generico; cada modulo extiende con queries propias. |
| Service Layer | Logica de negocio desacoplada del router y de la base de datos. |
| Soft Delete | Campo `deleted_at` (TIMESTAMPTZ nullable). Las queries filtran `WHERE deleted_at IS NULL`. |
| Snapshot | `DetallePedido` almacena `nombre_snapshot` y `precio_snapshot` inmutables al momento de la compra. |
| Audit Trail Append-Only | `HistorialEstadoPedido` solo permite INSERTs, nunca UPDATE ni DELETE. |
| FSM (Maquina de estados) | Transiciones validadas en el service. El router no decide la logica de estados. |

### Autenticacion y autorizacion

- Registro de usuarios con asignacion automatica del rol CLIENT.
- Login con email/password genera cookie httpOnly `access_token` (JWT, 30 minutos).
- Endpoint `GET /api/v1/auth/me` retorna los datos del usuario autenticado.
- Hash de contrasenas con bcrypt (cost factor 12).

### Sistema de roles (RBAC)

| Rol | Codigo | Capacidades |
|-----|--------|-------------|
| Administrador | ADMIN | CRUD completo de todo el sistema |
| Gestor de Stock | STOCK | Leer productos, gestionar ingredientes, unidades de medida y stock |
| Gestor de Pedidos | PEDIDOS | Ver y avanzar estados de pedidos |
| Cliente | CLIENT | Catalogo, carrito, pedidos propios |

Los roles se seedean automaticamente al iniciar la aplicacion. El decorador `require_roles()` protege los endpoints.

### Endpoints principales

**Autenticacion** (`/api/v1/auth/`)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | /register | Registrar usuario (asigna rol CLIENT) |
| POST | /login | Login, genera cookie httpOnly con JWT |
| POST | /logout | Elimina cookie de sesion |
| GET | /me | Datos del usuario autenticado |

**Categorias** (`/api/v1/categorias/`)

| Metodo | Ruta | Descripcion | Rol requerido |
|--------|------|-------------|---------------|
| GET | / | Listado publico con paginacion y filtro por parent_id | - |
| GET | /{id} | Detalle de categoria | - |
| POST | / | Crear categoria | ADMIN |
| PUT | /{id} | Actualizar categoria | ADMIN |
| DELETE | /{id} | Soft delete | ADMIN |

Soporta jerarquia con autorreferencia (`parent_id`).

**Productos** (`/api/v1/productos/`)

| Metodo | Ruta | Descripcion | Rol requerido |
|--------|------|-------------|---------------|
| GET | / | Listado publico con filtros (categoria, disponibilidad, busqueda) y paginacion | - |
| GET | /{id} | Detalle con categorias e ingredientes | - |
| POST | / | Crear producto con categorias e ingredientes | ADMIN |
| PUT | /{id} | Actualizar producto | ADMIN |
| DELETE | /{id} | Soft delete | ADMIN |

El stock y la disponibilidad se calculan dinamicamente a partir del stock de ingredientes asociados.

**Ingredientes** (`/api/v1/ingredientes/`)

| Metodo | Ruta | Descripcion | Rol requerido |
|--------|------|-------------|---------------|
| GET | / | Listado con paginacion | - |
| GET | /{id} | Detalle | - |
| POST | / | Crear ingrediente | ADMIN |
| PUT | /{id} | Actualizar (incluye stock) | ADMIN |
| DELETE | /{id} | Soft delete | ADMIN |

Incluye campos `stock_cantidad`, `unidad_medida_codigo` y `es_alergeno`.

**Unidades de medida y catalogos** (`/api/v1/ingredientes/unidades-medida/`)

| Metodo | Ruta | Descripcion | Rol requerido |
|--------|------|-------------|---------------|
| GET | / | Listar unidades de medida | - |
| POST | / | Crear unidad de medida | ADMIN, STOCK |
| DELETE | /{codigo} | Eliminar unidad de medida | ADMIN, STOCK |

**Pedidos** (`/api/v1/pedidos/`)

| Metodo | Ruta | Descripcion | Rol requerido |
|--------|------|-------------|---------------|
| GET | / | Listar pedidos (CLIENT ve solo los propios) | Autenticado |
| GET | /{id} | Detalle del pedido | Autenticado |
| POST | / | Crear pedido desde checkout (valida stock, calcula totales, descuenta ingredientes) | Autenticado |
| PUT | /{id} | Actualizar pedido (notas, costo de envio) | ADMIN, PEDIDOS |
| DELETE | /{id} | Soft delete | ADMIN, PEDIDOS |
| POST | /{id}/transition-estado | Avanzar estado (FSM validado) | Autenticado |
| GET | /{id}/detalles | Detalles del pedido con snapshots | Autenticado |
| POST | /{id}/detalles | Agregar detalle | ADMIN, PEDIDOS |
| GET | /{id}/pagos | Listar pagos | Autenticado |
| POST | /{id}/pagos | Registrar pago | ADMIN, PEDIDOS |
| PUT | /{id}/pagos/{pago_id} | Actualizar pago | ADMIN, PEDIDOS |

**Maquina de estados (FSM):**

```
PENDIENTE --> CONFIRMADO --> EN_PREP --> EN_CAMINO --> ENTREGADO
    |              |            |
    v              v            v
CANCELADO     CANCELADO    CANCELADO
```

- La cancelacion requiere motivo obligatorio.
- El CLIENT solo puede cancelar sus propios pedidos (desde PENDIENTE o CONFIRMADO).
- Cada transicion genera un registro en `HistorialEstadoPedido` (append-only).

**Direcciones de entrega** (`/api/v1/direcciones/`)

| Metodo | Ruta | Descripcion | Rol requerido |
|--------|------|-------------|---------------|
| GET | / | Listar direcciones del usuario autenticado | Autenticado |
| POST | / | Crear direccion | Autenticado |
| PUT | /{id} | Actualizar direccion | Autenticado |
| DELETE | /{id} | Soft delete | Autenticado |
| PATCH | /{id}/principal | Marcar como principal | Autenticado |

**Administracion** (`/api/v1/admin/`)

| Metodo | Ruta | Descripcion | Rol requerido |
|--------|------|-------------|---------------|
| GET | /usuarios | Listado paginado con filtro por rol | ADMIN |
| PUT | /usuarios/{id} | Actualizar usuario | ADMIN |
| DELETE | /usuarios/{id} | Soft delete | ADMIN |
| POST | /usuarios/{id}/roles | Asignar rol | ADMIN |

### Modelo de datos

**Relaciones principales:**

- Producto - Categoria: N:N mediante `ProductoCategoriaLink` (campo extra `es_principal`)
- Producto - Ingrediente: N:N mediante `ProductoIngredienteLink` (campos extra `cantidad`, `es_removible`)
- Categoria - Categoria: autorreferencia con `parent_id` (subcategorias)
- Usuario - Rol: N:N mediante `UsuarioRolLink` (campos extra `asignado_por_id`, `expires_at`)
- Pedido - DetallePedido: 1:N
- Pedido - Pago: 1:N
- Pedido - HistorialEstadoPedido: 1:N
- Usuario - DireccionEntrega: 1:N

**Catalogos (tablas de referencia):**

- `UnidadMedida`: kg, g, l, ml, u, oz, lb, taza, cda, cdta
- `FormaPago`: MERCADOPAGO, EFECTIVO, TRANSFERENCIA
- `EstadoPedido`: PENDIENTE, CONFIRMADO, EN_PREP, EN_CAMINO, ENTREGADO, CANCELADO

### Seed de datos

El backend ejecuta automaticamente al iniciar:

1. Creacion de tablas (si no existen)
2. Seed de roles (ADMIN, STOCK, PEDIDOS, CLIENT)
3. Seed de catalogos (unidades de medida, formas de pago, estados de pedido)
4. Seed de usuarios de prueba
5. Seed de datos de ejemplo (ingredientes, categorias, productos con recetas)

**Usuarios de prueba:**

| Email | Contrasena | Roles |
|-------|-----------|-------|
| admin@admin.com | admin123 | ADMIN |
| cliente@test.com | cliente123 | CLIENT |
| empleado@tienda.com | empleado123 | PEDIDOS |
| gerente@tienda.com | gerente123 | STOCK |

### Respuestas estandarizadas

Todas las respuestas siguen el formato:

```json
{
  "success": true,
  "message": "Productos obtenidos exitosamente",
  "data": {
    "items": [],
    "total": 15,
    "limit": 10,
    "offset": 0
  },
  "status_code": 200
}
```

### Configuracion y seguridad

- CORS configurado para `localhost:5173`, `localhost:5174`, `localhost:5175`
- bcrypt para hash de contrasenas (cost factor >= 12)
- JWT con PyJWT: access token en cookie httpOnly (30 minutos)
- API REST documentada automaticamente en `/docs` (Swagger UI) y `/redoc`

---

## Frontend - Tienda publica

### Modulos implementados

**Home Store:** catalogo de productos con filtros por categoria, busqueda por nombre y paginacion.

**Detalle de producto:** vista individual con ingredientes, alergenos y boton de agregar al carrito.

**Carrito:** tabla de items con cantidades ajustables, subtotales y total general. Persistencia en localStorage con middleware persist de Zustand.

**Checkout:** seleccion de direccion de entrega, forma de pago y confirmacion del pedido. El pedido se crea en una transaccion atomica (Unit of Work) que valida stock, calcula totales, crea detalles con snapshot y descuenta ingredientes.

**Mis pedidos:** historial de pedidos del usuario con estados, detalles expandibles y paginacion.

**Cajero:** pantalla de empleado para avanzar estados de pedidos (confirmar, preparar, enviar, entregar).

### Gestion de estado

- `useAuthStore` (Zustand): autenticacion, usuario actual, login/logout/register.
- `useCarritoStore` (Zustand): items del carrito con persist en localStorage.
- TanStack Query: `useQuery` para listados, `useMutation` para altas/ediciones con invalidacion de cache (`invalidateQueries`).

### Navegacion

- React Router v6 con rutas publicas y protegidas.
- `ProtectedRoute` valida autenticacion y roles.
- Parametros dinamicos en la URL (ej: `/store/producto/:id`).

---

## Frontend - Panel administrativo

### Modulos implementados

**Login:** autenticacion para empleados. Redireccion segun rol (ADMIN/PEDIDOS a pedidos, STOCK a productos).

**Categorias:** CRUD completo con soporte para subcategorias (parent_id).

**Productos:** CRUD completo con asignacion de categorias e ingredientes. Imagenes multiples (array de URLs).

**Ingredientes:** CRUD completo con gestion de stock, unidades de medida y marcado de alergenos. Gestion de unidades de medida (crear/eliminar).

**Pedidos:** listado de todos los pedidos con detalle, estados y transiciones.

### Diferenciacion por rol

- ADMIN: acceso completo, ve columnas ID y acciones en todas las tablas.
- STOCK: acceso a productos e ingredientes en modo lectura (sin columnas ID ni acciones).
- PEDIDOS: acceso a pedidos con transiciones de estado.

### Componentes

- Tablas con TanStack Table: ordenamiento, filtro global, paginacion y columnas condicionales segun rol.
- Toast: notificaciones de exito/error con auto-cierre.
- ConfirmDialog: dialogo modal de confirmacion (reemplaza `window.confirm`).
- Formularios con validacion.

---

## Stack tecnologico

| Capa | Tecnologia |
|------|-----------|
| Backend | FastAPI |
| Base de datos | PostgreSQL + SQLModel (SQLAlchemy 2.0) |
| Autenticacion | PyJWT + bcrypt |
| Frontend | React 18 + TypeScript |
| Routing | React Router v6 |
| Estado global | Zustand |
| Estado de servidor | TanStack Query |
| Tablas | TanStack Table |
| Validacion frontend | Zod |
| Estilos | Tailwind CSS |
| HTTP Client | Axios |
| Build | Vite |
