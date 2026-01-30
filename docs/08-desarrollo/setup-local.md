# Setup Local

## Requisitos

- Node.js 20+
- Docker (para PostgreSQL)
- npm o yarn

## Pasos

### 1. Clonar repositorio

```bash
git clone https://github.com/tu-usuario/ofertas-ya-crawler.git
cd ofertas-ya-crawler
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Iniciar PostgreSQL

```bash
npm run docker:up
```

Esto inicia PostgreSQL en el puerto **5433** (no 5432 para evitar conflictos).

### 4. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus valores:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ofertas_ya"
```

### 5. Inicializar base de datos

```bash
# Push del schema
npm run db:push

# Generar cliente Prisma (si es necesario)
npm run db:generate
```

### 6. Ejecutar primer scraping

```bash
# Dry run (sin guardar)
npm run scrape:superseis

# Con guardado
npm run scrape:superseis:save
```

### 7. Procesar matching

```bash
npm run match:process
```

### 8. Iniciar aplicacion

```bash
# API + Frontend
npm run dev:full

# O por separado:
npm run dev:api    # Puerto 3001
npm run dev:web    # Puerto 5173
```

### 9. Abrir en navegador

- Frontend: http://localhost:5173
- API: http://localhost:3001/api
- Prisma Studio: `npm run db:studio` (puerto 5555)

---

## Verificar Instalacion

### Verificar base de datos

```bash
npm run stats
```

Deberia mostrar estadisticas (puede estar vacio si no has scrapeado).

### Verificar scraper

```bash
npm run scrape:superseis -- --route=lacteos
```

Deberia mostrar productos scrapeados sin errores.

### Verificar API

```bash
curl http://localhost:3001/api/stores
```

Deberia retornar JSON con lista de tiendas.

---

## Troubleshooting

### Error: Puerto 5433 en uso

```bash
# Ver que esta usando el puerto
lsof -i :5433

# Matar proceso
kill -9 PID

# O cambiar puerto en docker-compose.yml
```

### Error: Extension pg_trgm no existe

El job de matching la crea automaticamente, pero si necesitas crearla manualmente:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Error: Prisma client not generated

```bash
npm run db:generate
```

### Error: Database does not exist

```bash
# Crear base de datos manualmente
docker exec -it ofertas-ya-postgres psql -U postgres -c "CREATE DATABASE ofertas_ya;"

# O recrear container
npm run docker:down
docker volume rm ofertas-ya-crawler_postgres-data
npm run docker:up
```

### Error: Connection refused al conectar a DB

Verificar que Docker esta corriendo:
```bash
docker ps
```

Verificar que el container esta healthy:
```bash
docker logs ofertas-ya-postgres
```

---

## Estructura de Archivos Despues del Setup

```
ofertas-ya-crawler/
├── node_modules/
├── generated/
│   └── prisma/          # Cliente Prisma generado
├── prisma/
│   └── schema.prisma
├── src/
│   └── ...
├── .env                  # Tu configuracion local
├── .env.example
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

---

## Comandos Utiles Post-Setup

```bash
# Ver estado de la base de datos
npm run db:studio

# Scrapear todo y guardar
npm run scrape:superseis:save && npm run scrape:stock:save

# Procesar matching
npm run match:process

# Ver estadisticas
npm run match:stats
```
