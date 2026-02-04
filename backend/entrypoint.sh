#!/bin/sh
set -e

until python manage.py migrate --noinput; do
  echo "Waiting for database..."
  sleep 2
done

if [ "${SEED_DEMO}" = "1" ]; then
  python manage.py seed_demo
fi

if [ -n "${DJANGO_SUPERUSER_USERNAME}" ] && [ -n "${DJANGO_SUPERUSER_PASSWORD}" ]; then
  python manage.py bootstrap_admin
fi

python manage.py runserver 0.0.0.0:8000