# Shoiron

Shoiron is a poetry portal with:
- `frontend/`: public website (Next.js)
- `admin/`: Shoiron Dashboard (Next.js, separate service)
- `backend/`: Django + DRF API + PostgreSQL

## Services and Ports
- Public frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Django admin: `http://localhost:8000/admin`
- Dashboard frontend (dev override only): `http://localhost:3001`

## Admin Security Model
- Dashboard frontend runs as a separate container/service.
- `docker-compose.yml` keeps admin **internal-only** (`expose: 3001`, no published host port).
- Backend enforces session auth + RBAC on every dashboard endpoint.
- Soft-delete/trash is implemented for Authors, Poems, Employees, Roles.

## Quick Start (Dev)
1. Create env file:
```bash
cp .env.example .env
```
2. Start all services and expose dashboard locally:
```bash
docker compose -f docker-compose.yml -f docker-compose.admin-dev.yml up --build
```
3. Open:
- Public site: `http://localhost:3000`
- API docs: `http://localhost:8000/api/docs`
- Dashboard: `http://localhost:3001`

## Production-like Start (Admin Not Public)
```bash
docker compose up --build -d
```
In this mode dashboard has no host port mapping and stays internal.

## Restrict Admin Access in Production
Option A: expose dashboard only via reverse proxy vhost (`admin.<domain>`) and IP allowlist.
- Example nginx config: `deploy/nginx/admin.conf`

Option B: keep dashboard closed completely (no external route, no published port) and access only from internal network/VPN.

## Seed Data
At container startup:
- `SEED_DEMO=1` seeds sample authors/poems.
- `SEED_DASHBOARD=1` seeds dashboard admin role/user and permissions.

Default dashboard credentials come from env:
- `DASHBOARD_ADMIN_EMAIL`
- `DASHBOARD_ADMIN_PASSWORD`

## Dashboard Features
- Login + forgot password with temporary password email flow.
- Temporary password is one-time (`must_change_password`) and expires by `DASHBOARD_TEMP_PASSWORD_TTL_MINUTES`.
- RBAC modules: Authors, Poems, Employees, Roles (CRUD flags).
- Site Settings editor (logo, SEO, contacts, about markdown, analytics tags).
- Dashboard home stats:
  - total poems/authors
  - current month visits
  - top 5 poems
  - top 5 authors by poem visits
- Author avatar crop with circle preview.
- Markdown editor with toolbar + safe preview + local draft autosave.
- Server-side search/sort/pagination for dashboard lists.
- Trash filters + restore/permanent delete.

## Publish Visibility Rule
Public poem visibility requires:
- `poem.is_published = true`
- `author.is_published = true`
- neither entity is soft-deleted

## Environment Variables
Core variables (see `.env.example`):
- CORS/origins: `PUBLIC_ORIGIN`, `ADMIN_ORIGIN`, `DJANGO_CORS_ALLOWED_ORIGINS`, `DJANGO_CSRF_TRUSTED_ORIGINS`
- Dashboard seed/admin: `SEED_DASHBOARD`, `DASHBOARD_ADMIN_*`
- Temp password TTL: `DASHBOARD_TEMP_PASSWORD_TTL_MINUTES`
- Email: `DJANGO_EMAIL_*`, `DJANGO_DEFAULT_FROM_EMAIL`
- Admin dev port: `ADMIN_LOCAL_PORT`

## Tests
Backend tests:
```bash
docker compose run --rm backend python manage.py test
```

## Useful Commands
Apply migrations:
```bash
docker compose run --rm backend python manage.py migrate
```

Create superuser manually:
```bash
docker compose run --rm backend python manage.py createsuperuser
```
