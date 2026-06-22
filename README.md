<div align="center">
  <h1>Proyecto Integrador Programación IV</h1>
  <p><strong>Tienda - UTN 2026</strong></p>
  
  ![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
  ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
  ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
  ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
  ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
</div>

---

## Integrante
- **Hiro Cruz**

## Video Explicativo
https://drive.google.com/drive/folders/1RZ6fKvs8RPR8pEcN214fGSqk2BVNZFac?usp=sharing

---

## Stack Tecnológico

### Backend
- **Framework:** FastAPI (Python)
- **Base de Datos:** SQLModel + PostgreSQL
- **Arquitectura:** Diseño por Módulos (Repository + Service + Unit of Work)
- **Funcionalidades Clave:**
  - *Manejo de Inventario:* Gestión de ingredientes y recetas con control de stock estricto.
  - *WebSockets:* Seguimiento de cambios de estado de pedidos en tiempo real.
  - *Pagos Integrados:* Pasarela de MercadoPago con webhooks y llave de idempotencia (`idempotency_key`).
  - *Robustez y Seguridad:* Rate Limit en memoria, Exception Handlers globales para validaciones Pydantic y errores HTTP.
  - *Observabilidad:* Middleware de Logging y Timing (`X-Process-Time-ms`) incorporado.
  - *Soft delete* en entidades principales.

### Frontend
- **Core:** React + TypeScript (Vite)
- **Gestión de Estado & Fetching:** TanStack Query + Axios
- **Navegación:** React Router
- **Estilos:** Tailwind CSS con componentes UI modernos (pantalla completa, flexbox).
- **Visualización de Datos:** Recharts para dashboard estadístico e informes.

---

## Cómo Correr el Proyecto

Antes de ejecutar, asegúrese de revisar la sección de **[Variables de Entorno](#variables-de-entorno)**. En ambos modos se debe partir copiando `.env.example` a `.env`.

### Opción 1: Con Docker (Recomendado)

Desde una terminal en el directorio raíz del proyecto:

```bash
git clone https://github.com/xHJCXDx/p4int.git
cd Proyecto_Integrador_ProgIV/p4int
cp .env.example .env
docker compose up -d --build
docker compose ps
```
> **Nota para Windows PowerShell:** Si `cp` no está disponible, utilice `Copy-Item .env.example .env`.

#### Seed Inicial con Docker
Por defecto, el seed no se ejecuta automáticamente. En el archivo `.env` encontrará:
```env
RUN_SEED_ON_STARTUP=false
```
Para cargar datos iniciales (usuarios demo, roles, catálogos, imágenes predefinidas), modifíquelo a `true` antes de inicializar los contenedores, o si ya están en ejecución, ejecute manualmente el script de reseteo:
```bash
docker compose exec backend python -m backend.seeds.reset_db
```

#### Servicios Disponibles
- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend (API):** [http://localhost:8000](http://localhost:8000)
- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **PGAdmin:** [http://localhost:5050](http://localhost:5050)
  - **Email:** Valor de `PGADMIN_DEFAULT_EMAIL`
  - **Password:** Valor de `PGADMIN_DEFAULT_PASSWORD`
  - *(Conexión a BD: Host `db`, Port `5432`)*

#### Usuarios Demo (creados por Seed)
- **Administrador:** `admin@tienda.com` / `admin123`
- **Gestor de stock:** `stock@tienda.com` / `stock123`
- **Gestor de pedidos:** `pedidos@tienda.com` / `pedidos123`
- **Cliente:** `cliente@tienda.com` / `cliente123`

#### Manejo del Stack
- **Ejecutar tests:** `docker compose exec backend pytest tests`
- **Apagar stack:** `docker compose down`
- **Apagar stack y borrar datos:** `docker compose down -v`

---

### Opción 2: Local (Sin Docker)

```bash
cp .env.example .env
```

#### 1. Backend
Posiciónese en la raíz del proyecto y ejecute:
```bash
python -m venv .venv
# En Windows: .venv\Scripts\Activate.ps1
# En Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

#### 2. Seed Manual & Tests
```bash
PYTHONPATH=. python backend/seeds/reset_db.py  # Seed completo
pytest tests                                  # Tests
```

#### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Variables de Entorno

El archivo `.env.example` incluye valores preparados para entornos de desarrollo.
- `SECRET_KEY`: Clave para firmar JWT (debe ser segura en producción).
- `DATABASE_URL`: Conexión a PostgreSQL (Docker usa `db`, local usa `localhost:5438`).
- `RUN_SEED_ON_STARTUP`: `true` ejecuta el seed al iniciar.
- `VITE_API_URL` & `VITE_WS_URL`: Endpoints del backend HTTP y WebSocket.
- `MP_ACCESS_TOKEN` & `MP_WEBHOOK_SECRET`: Integración con MercadoPago.
- `BACKEND_URL` & `FRONTEND_URL`: URLs públicas para redirecciones (ej. MercadoPago / Ngrok).
- `UPLOADS_DIR`: Directorio de almacenamiento estático para las imágenes de productos locales.

---

## Nota de Migración: Stock de Productos

El campo legado `Producto.stock_cantidad` permanece temporalmente en la base de datos y en partes de la API para mantener compatibilidad con clientes existentes, pero **ya no es la fuente de verdad** para ventas ni disponibilidad.

- La fuente de verdad del stock vendible son los ingredientes asociados al producto.
- El stock expuesto para un producto se calcula como unidades completas producibles según el ingrediente limitante de su receta.
- Si un producto no tiene receta/ingredientes válidos, su stock calculado es `0` y no es vendible hasta configurar la receta.
- Bebidas y productos simples deben modelarse con un ingrediente equivalente requerido en cantidad `1` por unidad vendida, por ejemplo “Coca Cola” producto → ingrediente “Coca Cola” 1:1.
- `PATCH /productos/{id}/stock` y `ProductoUpdate.stock_cantidad` son compatibilidad legada/deprecada: enviar stock manual no modifica la disponibilidad.

Para migraciones futuras, no borrar datos legados hasta validar la creación de ingredientes 1:1 o recetas reales para los productos que antes dependían de `Producto.stock_cantidad`.

---

## Comandos de Validación

**Backend:**
```bash
python -m compileall backend
pytest tests
```

**Frontend:**
```bash
cd frontend
npx tsc --noEmit
npm run build
npm run lint
```

---

## Estructura del Proyecto

```text
p4intg/
 ├── backend/                 # API FastAPI y lógica del servidor
 │   ├── core/                # Configuración DB, UoW, WebSockets, Logs y Rate Limit
 │   ├── img/                 # Directorio de subida de imágenes de productos locales
 │   ├── modules/             # Módulos del dominio (Auth, Pagos, Productos, etc.)
 │   ├── seeds/               # Scripts de carga inicial y reseteo de DB (reset_db.py)
 │   └── main.py              # Entrada principal de la API
 ├── frontend/                # SPA React + Vite
 │   └── src/
 │       ├── components/      # Componentes UI reutilizables y layouts
 │       ├── features/        # Lógica agrupada por funcionalidad (Usuarios, Pedidos)
 │       └── pages/           # Vistas principales de la aplicación
 ├── docker/                  # Configuraciones para contenedores (Nginx, base de datos)
 ├── tests/                   # Pruebas automatizadas (Backend)
 ├── docker-compose.yml       # Orquestador de servicios
 └── requirements.txt         # Dependencias de Python
```

---
<div align="center">
  <small>2026 © Proyecto Integrador Prog IV - Tienda (Hiro Cruz)</small>
</div>
