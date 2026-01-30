# Variables de Entorno

## Archivo .env

El proyecto usa un archivo `.env` en la raiz para configuracion.

## Variables Requeridas

### DATABASE_URL

URL de conexion a PostgreSQL.

```env
DATABASE_URL="postgresql://usuario:password@host:puerto/database"
```

**Valores por defecto (desarrollo):**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ofertas_ya"
```

**Componentes:**
- `postgres`: Usuario de PostgreSQL
- `postgres`: Password
- `localhost`: Host (usar nombre del servicio Docker en produccion)
- `5433`: Puerto (5433 para evitar conflictos con PostgreSQL local)
- `ofertas_ya`: Nombre de la base de datos

---

## Variables Opcionales

### NODE_ENV

Entorno de ejecucion.

```env
NODE_ENV=development  # o production
```

### API_PORT

Puerto del servidor API (default: 3001).

```env
API_PORT=3001
```

### VITE_API_URL

URL de la API para el frontend (default: http://localhost:3001).

```env
VITE_API_URL=http://localhost:3001
```

---

## Ejemplo Completo

### Desarrollo (.env)

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ofertas_ya"

# API
API_PORT=3001

# Frontend
VITE_API_URL=http://localhost:3001

# Environment
NODE_ENV=development
```

### Produccion (.env.production)

```env
# Database (ejemplo con servicio externo)
DATABASE_URL="postgresql://user:password@db.example.com:5432/ofertas_ya"

# API
API_PORT=3001

# Frontend
VITE_API_URL=https://api.ofertas-ya.com

# Environment
NODE_ENV=production
```

---

## Docker Compose

Las variables de PostgreSQL en Docker estan definidas en `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ofertas_ya
    ports:
      - "5433:5432"
```

**Nota:** El puerto externo es `5433`, el interno es `5432`.

---

## Prisma

Prisma usa `DATABASE_URL` automaticamente desde `.env`:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## Vite

Variables con prefijo `VITE_` estan disponibles en el frontend:

```typescript
// En codigo frontend
const apiUrl = import.meta.env.VITE_API_URL
```

---

## Seguridad

**Nunca commitear `.env` con credenciales reales.**

El archivo `.env` debe estar en `.gitignore`:

```gitignore
# .gitignore
.env
.env.local
.env.production
```

Solo commitear `.env.example` con valores de ejemplo:

```env
# .env.example
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ofertas_ya"
API_PORT=3001
```
