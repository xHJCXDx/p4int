# Guía de Contribución - P4_P2

## 🔄 Flujo de CI/CD Automático

Este proyecto utiliza GitHub Actions para automatizar validaciones de código. Cuando haces `git push`, se ejecutan automáticamente:

### ✅ Verificaciones Automáticas

#### 1. **Backend Linting**
- Validación con `black` (formato de código Python)
- Validación con `isort` (ordenamiento de imports)
- Linting con `flake8` (errores de sintaxis)
- Ejecución de tests con `pytest`

#### 2. **Frontend Linting**
- Type checking con TypeScript (`tsc --noEmit`)
- Build con Vite (`npm run build`)
- Tests con Jest (si existen)

#### 3. **Validación de Proyecto**
- Verificación de `.gitignore`
- Verificación de `README.md`
- Revisión de archivos no commiteados

#### 4. **Auto-Commit de Cambios**
Si el code formatting falla, el CI automáticamente:
1. Ejecuta `black` y `isort` en el backend
2. Formatea el código
3. Hace commit automático: `chore: auto-format code with black and isort`
4. Pushea los cambios a `main`

**No necesitas hacer nada manual** — el CI lo hace todo.

---

## 📋 Requerimientos para Commit

Antes de hacer push, asegúrate de:

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

## 🚀 Flujo de Trabajo Local (Opcional)

Si querés formatear localmente antes de pushear:

```bash
# Backend
cd backend
black app/
isort app/

# Frontend (si tenés ESLint)
cd frontend
npm run lint -- --fix
```

## 🔧 Entender el Workflow

El archivo `.github/workflows/ci.yml` define:

- **Triggers**: Se ejecuta en `push` a `main` o `develop`, y en `pull_request` a `main`
- **Jobs**:
  - `backend-lint`: Valida Python
  - `frontend-lint`: Valida TypeScript/Node
  - `validation`: Chequeos generales
  - `auto-commit`: Auto-formatea si es necesario
  - `notification`: Reporta estado final

## ⚠️ Si el CI Falla

Si los checks fallan:

1. **Error de format**: El CI automáticamente lo arregla y pushea
2. **Error de type**: Arregla el tipo en `frontend/src/`
3. **Error de test**: Revisa los logs en GitHub Actions

## 📊 Monitorear CI

Ve a: `https://github.com/xHJCXDx/p4_p2/actions`

Allí ves todos los workflows ejecutados, logs, y estado de cada job.

---

## 🎯 Resumen

**Tu flujo es simplemente:**
```bash
# Haces cambios
git add .
git commit -m "feat: tu cambio"
git push origin main

# ✅ El CI automáticamente:
# - Valida código
# - Formatea si necesario
# - Pushea auto-correcciones
# - Notifica si hay errores
```

**No necesitas intervención manual.**
