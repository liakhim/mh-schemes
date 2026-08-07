# Требования к серверу

Требования для production-развертывания проекта MH Schemes.

## Обязательное окружение

- OS: Linux-сервер или хостинг с поддержкой Laravel-приложений.
- Web server: Nginx или Apache.
- Document root: директория `public/` проекта Laravel.
- PHP: `8.4+`.
- PHP extensions: `pdo_mysql`, `zip`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `fileinfo`.
- Composer: `2.x`.
- Database: MySQL `8+` или совместимая MariaDB с поддержкой JSON-полей.
- Node.js: `22+` для сборки frontend на сервере.
- npm: версия, совместимая с Node.js 22.
- Git: нужен, если деплой выполняется через `git clone` / `git pull`.

## Если frontend собирается не на сервере

Node.js и npm на сервере не обязательны, если в деплой попадает уже собранный результат `npm run build` из директории `public/build`.

## Рекомендуемые ресурсы

- CPU: от 1 vCPU.
- RAM: минимум 1 GB, рекомендуется 2 GB+ при сборке frontend на сервере.
- Disk: от 2 GB свободного места для приложения, зависимостей, логов и временных файлов.
- PHP memory_limit: минимум `256M`, рекомендуется `512M` для Composer и artisan-команд.
- Upload/post size: по фактическим ограничениям API; специальных больших загрузок проект не требует.

## Права и директории

- Пользователь web server/PHP должен иметь права на запись в `storage/` и `bootstrap/cache/`.
- Файл `.env` создается только на сервере и не коммитится в Git.
- Для production нужно выполнить `php artisan storage:link`, если используются публичные файлы из storage.

## Production `.env`

Минимально важные значения:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.example

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_db
DB_USERNAME=your_user
DB_PASSWORD=your_password

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database
```

## Команды первого деплоя

```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan key:generate --force
php artisan migrate --seed --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Docker-ориентир проекта

Локальная Docker-конфигурация использует:

- PHP-FPM `8.4`.
- MySQL `8.4`.
- Node.js `22-alpine`.
- Nginx `1.27-alpine`.

Эти версии можно использовать как ориентир для production-сервера.
