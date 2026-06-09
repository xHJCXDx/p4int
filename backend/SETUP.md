# Setup - Backend P4_P2

Instrucciones para levantar el backend completo con base de datos seeded.

---

## Requisitos previos

- Python 3.8+
- pip
- PostgreSQL (instalado y corriendo)

---

## Paso 1: Configurar PostgreSQL

Asegurate de tener PostgreSQL corriendo. El backend se conecta por defecto a:

```
postgresql://postgres:postgres@localhost:5432/p4_p2_db
```

Si necesitas cambiar la URL, configurá la variable de entorno `DATABASE_URL` antes de iniciar el servidor.

La base de datos se crea automáticamente al iniciar el servidor si no existe.

---

## Paso 2: Instalar dependencias

```bash
cd p4_p2/backend

python -m venv .venv

# En Linux/Mac:
source .venv/bin/activate

# En Windows:
.venv\Scripts\activate

pip install -r requirements.txt
```

---

## Paso 3: Iniciar el servidor

```bash
# Desde p4_p2/backend
fastapi dev main.py
```

Al iniciar, el servidor:
- Crea la base de datos si no existe
- Crea todas las tablas
- Seedea datos iniciales (roles, catálogos, usuario admin)

Salida esperada:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Press CTRL+C to quit
```

---

## Verificar que está funcionando

```bash
# Ver categorías
curl http://localhost:8000/api/v1/categorias

# Ver productos
curl http://localhost:8000/api/v1/productos

# Swagger UI (documentación interactiva)
# Abrir en navegador: http://localhost:8000/docs
```

---

## Datos de admin

Credenciales por defecto:
- Email: `admin@admin.com`
- Password: `admin123`

**IMPORTANTE**: Cambiar la contraseña en producción.

---

## Estructura de la BD

Después del seed inicial:

### Categorías

```
Pizzas (id: 1)
  Pizzas Dulces (id: 4, parent_id: 1)
Empanadas (id: 2)
Bebidas (id: 3)
```

### Ingredientes (10 total)

- Queso Mozzarella, Tomate, Oregano, Maní, Leche, Huevo, Gluten, Carne molida, Cebolla, Ajo
- Alergenos: Maní, Leche, Huevo, Gluten

### Productos (7 total)

1. Pizza Margherita - $250
2. Pizza de Carne - $290
3. Empanadas de Carne - $120
4. Empanadas de Queso - $100
5. Coca-Cola 2L - $65
6. Jugo Natural Naranja - $45
7. Pizza de Chocolate - $200

---

## Endpoints para la demo

```bash
# 1. Login como admin
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@admin.com", "password": "admin123"}'

# 2. Ver categorías
curl "http://localhost:8000/api/v1/categorias"

# 3. Ver productos
curl "http://localhost:8000/api/v1/productos"

# 4. Crear un pedido
curl -X POST "http://localhost:8000/api/v1/pedidos" \
  -H "Content-Type: application/json" \
  -d '{
    "usuario_id": 1,
    "estado_codigo": "PENDIENTE",
    "forma_pago_codigo": "MERCADOPAGO",
    "subtotal": 250.0,
    "descuento": 0.0,
    "costo_envio": 50.0,
    "total": 300.0
  }'
```

---

## Troubleshooting

### "ModuleNotFoundError: No module named 'app'"

Asegurate de estar en el directorio `p4_p2/backend` cuando ejecutás los comandos.

```bash
cd p4_p2/backend
fastapi dev main.py
```

### "connection refused" o "could not connect to server"

PostgreSQL no está corriendo. Inicialo con:

```bash
sudo systemctl start postgresql
```

### "relation 'usuario' does not exist"

Reiniciá el servidor. Las tablas se crean automáticamente al iniciar.

---

## Notas

1. **Base de datos**: PostgreSQL (no requiere configuración adicional si se usa la URL por defecto)
2. **Seed data**: Se ejecuta automáticamente al iniciar el servidor
3. **JWT**: Expira en 30 minutos (cookie httpOnly)
4. **CORS**: Habilitado para `http://localhost:5173` (frontend Vite)
