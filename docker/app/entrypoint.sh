#!/bin/sh
set -e

if [ ! -f /var/www/.env ]; then
  cp /var/www/.env.example /var/www/.env
fi

cd /var/www

mkdir -p /tmp/laravel/framework/views
chmod -R 777 /tmp/laravel || true
mkdir -p /var/www/storage/framework/views
mkdir -p /var/www/storage/framework/cache
mkdir -p /var/www/bootstrap/cache

chmod -R 777 /var/www/storage /var/www/bootstrap/cache || true

if [ ! -d vendor ]; then
  composer install --no-interaction --prefer-dist
fi

if ! grep -q "^APP_KEY=base64:" .env; then
  php artisan key:generate --force
fi

php artisan migrate --seed --force

exec "$@"
