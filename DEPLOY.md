# Guia de Despliegue - Ofertas Ya Crawler

Guia completa para desplegar el sistema en un servidor limpio (Ubuntu/Debian).

## Requisitos del Servidor

- Ubuntu 22.04+ o Debian 12+
- 2GB RAM minimo (4GB recomendado)
- 20GB disco
- Acceso root/sudo

## Pasos de Instalacion

### 1. Actualizar sistema

```bash
apt update && apt upgrade -y
```

### 2. Instalar Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v  # Verificar version
```

### 3. Instalar Docker

```bash
apt install -y docker.io docker-compose-plugin
systemctl enable docker
systemctl start docker
```

### 4. Instalar PM2

```bash
npm install -g pm2
```

### 5. Clonar repositorio

```bash
cd /opt
git clone <repo-url> ofertas-ya
cd ofertas-ya
```

### 6. Instalar dependencias

```bash
npm install
```

### 7. Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

Editar `DATABASE_URL` con una contrasena segura:
```
DATABASE_URL="postgresql://root:TU_CONTRASENA_SEGURA@localhost:5433/ofertas_ya"
```

### 8. Modificar docker-compose para produccion

```bash
nano docker-compose.yml
```

Cambiar `POSTGRES_PASSWORD` al mismo valor que en `.env`:
```yaml
environment:
  POSTGRES_USER: root
  POSTGRES_PASSWORD: TU_CONTRASENA_SEGURA
  POSTGRES_DB: ofertas_ya
```

### 9. Iniciar PostgreSQL

```bash
docker compose up -d
```

### 10. Inicializar base de datos

```bash
npm run db:push
npm run db:generate
npm run db:seed
```

### 10.1. Configurar JWT Secret

Generar un secret seguro:

```bash
openssl rand -base64 32
```

Agregar al `.env`:
```
JWT_SECRET="el-secret-generado"
```

### 10.2. Crear usuario administrador

```bash
npm run db:create-user admin@tudominio.com tu-password-seguro
```

### 11. (Opcional) Restaurar backup desde desarrollo

Si tenés un backup de tu BD local:

```bash
# Copiar backup al servidor (desde tu maquina local)
scp backup.sqlOC root@tu-servidor:/root/ofertas-ya-crawler/
```

En el servidor, primero limpiar la BD y luego restaurar:

```bash
# Dropear y recrear la base de datos
docker exec -it ofertas-ya-crawler-postgres-1 psql -U root -d postgres -c "DROP DATABASE ofertas_ya;"
docker exec -it ofertas-ya-crawler-postgres-1 psql -U root -d postgres -c "CREATE DATABASE ofertas_ya;"

# Restaurar el backup
docker exec -i ofertas-ya-crawler-postgres-1 psql -U root -d ofertas_ya < backup.sqlOC
```

Nota: Verificar nombre del container con `docker ps` si es diferente.

### 12. Ejecutar primer scraping

```bash
npm run scrape
```

### 13. Configurar PM2

El archivo `ecosystem.config.cjs` incluye:
- **ofertas-ya-scraper**: Scraping diario a las 12:00
- **ofertas-ya-api**: API con auto-restart si se cae

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # Seguir instrucciones para auto-inicio
```

Verificar que todo esta corriendo:
```bash
pm2 list
```

## Verificacion

```bash
# Ver estadisticas de la BD
npm run stats

# Verificar API (directo)
curl http://localhost:3001/api/health

# Verificar API (via nginx puerto 80)
curl http://localhost/api/health

# Verificar API (desde IP publica)
curl http://TU_IP_PUBLICA/api/health

# Ver procesos PM2
pm2 list

# Ver proxima ejecucion del scraper
pm2 describe ofertas-ya-scraper

# Verificar nginx
systemctl status nginx
```

### Verificar autenticacion

```bash
# Obtener token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tudominio.com","password":"tu-password-seguro"}'

# Usar token en requests protegidos
curl -X POST http://localhost:3001/api/featured \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"canonicalProductId":"xxx"}'
```

## Firewall (UFW)

```bash
ufw allow ssh
ufw allow 3001/tcp     # API (si se expone)
ufw enable
```

## Nginx como Reverse Proxy + SSL

### Instalar Nginx y Certbot

```bash
apt install -y nginx certbot python3-certbot-nginx
```

### Crear configuracion

```bash
nano /etc/nginx/sites-available/ofertas-api
```

Contenido:
```nginx
server {
    listen 80;
    server_name api.tudominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Habilitar sitio

```bash
ln -s /etc/nginx/sites-available/ofertas-api /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Obtener SSL con Let's Encrypt

```bash
certbot --nginx -d api.tudominio.com
```

Auto-renovacion ya esta configurada por certbot:
```bash
systemctl status certbot.timer
```

## Mantenimiento

### Logs

```bash
pm2 logs                        # Ver todos los logs
pm2 logs ofertas-ya-scraper     # Logs del scraper
pm2 logs ofertas-ya-api         # Logs de la API
```

### Reiniciar servicios

```bash
pm2 restart ofertas-ya-scraper  # Reiniciar scraper
pm2 restart ofertas-ya-api      # Reiniciar API
pm2 restart all                 # Reiniciar todo
```

### Ejecutar scraping manual

```bash
pm2 trigger ofertas-ya-scraper  # Forzar ejecucion inmediata
# o
cd /opt/ofertas-ya && npm run scrape
```

### Actualizar codigo

```bash
cd /opt/ofertas-ya
git pull
npm install
pm2 restart all
```

### Base de datos

```bash
# Backup manual
docker exec ofertas-ya-crawler-postgres-1 pg_dump -U root ofertas_ya > backup.sql

# Restaurar desde backup (limpiar primero)
docker exec -it ofertas-ya-crawler-postgres-1 psql -U root -d postgres -c "DROP DATABASE ofertas_ya;"
docker exec -it ofertas-ya-crawler-postgres-1 psql -U root -d postgres -c "CREATE DATABASE ofertas_ya;"
docker exec -i ofertas-ya-crawler-postgres-1 psql -U root -d ofertas_ya < backup.sql
```

## Troubleshooting

### El scraper no se ejecuta

```bash
pm2 logs ofertas-ya-scraper --lines 50
```

### La API no responde

```bash
pm2 logs ofertas-ya-api --lines 50
pm2 restart ofertas-ya-api
```

### PostgreSQL no inicia

```bash
docker compose logs postgres
docker compose down && docker compose up -d
```

### Ver estado de todos los servicios

```bash
pm2 list
pm2 monit  # Monitor en tiempo real
```

### Problemas de permisos

```bash
chown -R $USER:$USER /opt/ofertas-ya
```

### Reiniciar todo desde cero

```bash
pm2 delete all
pm2 start ecosystem.config.cjs
pm2 save
```
