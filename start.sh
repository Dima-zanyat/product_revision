#!/usr/bin/env sh
set -eu

echo "Starting product_revision..."
python -V

if [ -z "${SECRET_KEY:-}" ]; then
  echo "ERROR: SECRET_KEY is not set."
  exit 1
fi

if [ -n "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is set."
else
  echo "WARNING: DATABASE_URL is not set. Falling back to SQLite."
fi

echo "Running migrations..."
tries=0
until python manage.py migrate --noinput; do
  tries=$((tries + 1))
  if [ "$tries" -ge "${MIGRATE_MAX_TRIES:-10}" ]; then
    echo "ERROR: migrate failed after $tries attempts."
    exit 1
  fi
  echo "migrate failed, retrying in 3s ($tries/${MIGRATE_MAX_TRIES:-10})..."
  sleep 3
done

echo "Collecting static..."
python manage.py collectstatic --noinput

echo "Starting gunicorn..."
exec gunicorn core.wsgi:application \
  --bind 0.0.0.0:${PORT:-8000} \
  --workers ${WEB_CONCURRENCY:-2} \
  --timeout ${GUNICORN_TIMEOUT:-120} \
  --access-logfile - \
  --error-logfile - \
  --log-level ${GUNICORN_LOG_LEVEL:-info}
