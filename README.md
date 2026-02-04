# Шоирон — портал стихотворений

Минималистичный публичный портал для чтения, поиска и сохранения поэзии. Гости могут читать, искать и ставить реакции, админ управляет контентом через Django Admin.

## Стек
- Backend: Django + DRF + PostgreSQL + drf-spectacular
- Frontend: Next.js (App Router) + TypeScript + TailwindCSS + next-themes
- Docker Compose для локального запуска

## Быстрый старт
1. Создайте `.env` из `.env.example` и при необходимости измените значения.
2. Запустите:

```bash
docker compose up --build
```

После запуска:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Admin: `http://localhost:8000/admin`
- OpenAPI docs: `http://localhost:8000/api/docs`

Миграции применяются автоматически при старте backend. Если в `.env` установлен `SEED_DEMO=1`, демо-данные будут загружены.

## Админ-пользователь
Есть два варианта:
1. Через env bootstrap (по умолчанию): установите `DJANGO_SUPERUSER_USERNAME` и `DJANGO_SUPERUSER_PASSWORD` в `.env`.
2. Создать вручную:

```bash
docker compose exec backend python manage.py createsuperuser
```

## Загрузка демо-данных
```bash
docker compose exec backend python manage.py seed_demo
```

Сбросить и создать заново:
```bash
docker compose exec backend python manage.py seed_demo --force
```

## Тесты
Backend:
```bash
docker compose exec backend python manage.py test
```

Frontend:
```bash
docker compose exec frontend npm test
```

## Основные маршруты
- `/` — главная
- `/poems/{id}-{slug}` — страница стиха
- `/authors` — каталог авторов
- `/authors/{id}-{slug}` — страница автора
- `/search?q=` — поиск
- `/about`, `/contacts`, `/support`

## Развёртывание
- Выключить DEBUG и настроить `DJANGO_ALLOWED_HOSTS`.
- Настроить HTTPS и `SECURE_*` флаги.
- Для медиа можно подключить S3 (например, через `django-storages`).
- Настроить Redis для кэша (по умолчанию LocMemCache).
- Установить `DJANGO_PUBLIC_BASE_URL` для корректных абсолютных ссылок на медиа.

## Структура репозитория
```
/
  docker-compose.yml
  .env.example
  README.md
  backend/
  frontend/
```