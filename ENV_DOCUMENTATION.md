# Environment variables

Документация по переменным окружения MH Schemes. Локальный `.env` создаётся из `.env.example` и не должен попадать в Git или архив, передаваемый третьим лицам.

После изменения `.env` очистите кеш конфигурации:

```bash
# В Docker
docker compose exec app php artisan optimize:clear

# На сервере
php8.4 artisan optimize:clear
php8.4 artisan config:cache
```

## Application

| Переменная | Назначение | Рекомендация |
|---|---|---|
| `APP_NAME` | Название приложения. Используется в интерфейсе, письмах, именах cookie и префиксах кеша. | `MyHeat` |
| `APP_ENV` | Имя окружения Laravel. Допустимы произвольные значения, обычно `local`, `staging`, `production`, `testing`. | Локально `local`, тестовый сервер `staging`, боевой сервер `production`. |
| `APP_KEY` | Главный ключ шифрования и подписи Laravel. | Создаётся через `php artisan key:generate`. Не публиковать и не менять после запуска без необходимости. Смена завершает существующие сессии и делает ранее зашифрованные данные недоступными. |
| `APP_DEBUG` | Показывает подробные исключения и stack trace в HTTP-ответах. | `true` только локально, на любом удалённом сервере `false`. |
| `APP_URL` | Публичный URL приложения для генерации абсолютных ссылок. | Указывать HTTPS-домен без внутреннего порта, например `https://pro.mhtest.ru`. |
| `APP_LOCALE` | Основная локаль Laravel. | `ru` или требуемая локаль. |
| `APP_FALLBACK_LOCALE` | Резервная локаль при отсутствии перевода. | Обычно совпадает с `APP_LOCALE`. |
| `APP_FAKER_LOCALE` | Локаль генератора тестовых данных Faker. | На production практически не используется. |

`APP_URL` не определяет протокол текущего HTTP-запроса за reverse proxy. Для HTTPS внешний proxy должен передавать `X-Forwarded-Proto`, а Laravel должен доверять этому proxy.

## Feature modes

| Переменная | Назначение | Значения |
|---|---|---|
| `DATABASE_ENABLED` | Разрешает database-авторизацию и загрузку списка схем на dashboard. Само соединение из `DB_*` при `false` не удаляется. | `true` для работы с БД, `false` для ограниченного режима без dashboard-данных. |
| `BETA_ACCESS_ENABLED` | Включает проверку beta-кодов и привязку доступа к устройству. | `false`, если beta-gate не нужен. |
| `BETA_ACCESS_COOKIE_SECURE` | Разрешает отправлять beta-cookie только по HTTPS. | На удалённом HTTPS-сервере `true`. |

При `DATABASE_ENABLED=false` API-код, который напрямую обращается к моделям, не становится автоматически недоступным. Это не универсальный сетевой выключатель БД.

## Authentication

| Переменная | Назначение | Значения |
|---|---|---|
| `AUTH_MODE` | Выбирает реализацию входа. | `stub` или `database`. |
| `AUTH_USERS_TABLE` | Имя существующей таблицы пользователей. | Обычно `users`. |
| `AUTH_LOGIN_COLUMN` | Колонка, по которой ищется пользователь. | Обычно `email`; если база использует логин, можно указать `login`. |
| `AUTH_PASSWORD_COLUMN` | Колонка с хешем пароля. | Обычно `password`. |

Режимы `AUTH_MODE`:

| Режим | Поведение |
|---|---|
| `stub` | Тестовый режим: принимает любые непустые логин и пароль и создаёт фиктивный `PHPSESSID`. Нельзя использовать публично. |
| `database` | Читает пользователя из `AUTH_USERS_TABLE`, проверяет пароль, вызывает Laravel `Auth::login()` и создаёт Laravel-сессию. |

Database-авторизация поддерживает bcrypt/Argon и legacy uppercase SHA-256 из основного MyHeat-проекта. Хеш в таблице `users` при входе не изменяется. Существующий `PHPSESSID` другого приложения не читается и не даёт доступ в режиме `database`.

Минимальные права пользователя PostgreSQL для авторизации и схем:

```sql
GRANT SELECT ON TABLE public.users TO myheatpro;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.schemes TO myheatpro;
GRANT USAGE, SELECT ON SEQUENCE public.schemes_id_seq TO myheatpro;
```

## Maintenance

| Переменная | Назначение | Рекомендация |
|---|---|---|
| `APP_MAINTENANCE_DRIVER` | Хранилище состояния `artisan down`. | `file` для одного сервера. |
| `APP_MAINTENANCE_STORE` | Cache store для maintenance mode при соответствующем драйвере. | Не требуется при `APP_MAINTENANCE_DRIVER=file`. |
| `PHP_CLI_SERVER_WORKERS` | Число worker-процессов встроенного `php artisan serve`. | Только для локальной разработки, не для PHP-FPM. |

## Password hashing

| Переменная | Назначение | Рекомендация |
|---|---|---|
| `BCRYPT_ROUNDS` | Стоимость bcrypt для новых хешей, создаваемых Laravel. | Обычно `12`; в тестах может быть меньше. Не влияет на проверку legacy SHA-256. |

## Logging

| Переменная | Назначение | Рекомендация |
|---|---|---|
| `LOG_CHANNEL` | Основной logging channel Laravel. | `stack`. |
| `LOG_STACK` | Список каналов внутри `stack`. | Локально `single`, на сервере удобно `daily`. |
| `LOG_DEPRECATIONS_CHANNEL` | Канал предупреждений об устаревшем API. | `null`, если отдельный канал не нужен. |
| `LOG_LEVEL` | Минимальный уровень записываемых событий. | Локально `debug`, на production `warning` или `error`. |

Логи по умолчанию записываются в `storage/logs`. Пользователь PHP-FPM должен иметь право записи в `storage` и `bootstrap/cache`.

## Database

| Переменная | Назначение | Пример PostgreSQL |
|---|---|---|
| `DB_CONNECTION` | Laravel-драйвер базы. | `pgsql` |
| `DB_HOST` | IP, DNS-имя или имя Docker-сервиса без протокола и порта. | `192.168.12.14` |
| `DB_PORT` | TCP-порт базы. | PostgreSQL `5432`, MySQL `3306`. |
| `DB_DATABASE` | Имя базы данных. | `myheat` |
| `DB_USERNAME` | Пользователь базы. | Отдельный пользователь с минимальными правами. |
| `DB_PASSWORD` | Пароль пользователя базы. | Секрет; рекомендуется заключать в двойные кавычки. |
| `DB_SSLMODE` | Режим TLS для PostgreSQL. | `prefer` для совместимости, `require` если сервер БД настроен на обязательный TLS. |

Локальный Docker использует соединение внутри Docker network:

```env
DATABASE_ENABLED=true
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=schemes_db
DB_USERNAME=schemes_user
DB_PASSWORD="schemes_pass"
```

Порт `3308` используется только при подключении к локальному MySQL с Windows host, а не из контейнера `app`.

Никогда не запускайте `migrate:fresh`, `db:wipe` или неизвестные сидеры на существующей общей базе без резервной копии и проверки SQL.

## Sessions

| Переменная | Назначение | Рекомендация |
|---|---|---|
| `SESSION_DRIVER` | Место хранения Laravel-сессий: `file`, `database`, `redis` и другие поддерживаемые драйверы. | `file` для одного сервера. |
| `SESSION_LIFETIME` | Время неактивности сессии в минутах. | Например `120`. |
| `SESSION_ENCRYPT` | Шифрует содержимое server-side сессии. | Обычно `false`; cookie всё равно подписывается Laravel. |
| `SESSION_PATH` | URL path, на котором браузер отправляет cookie. | `/`. |
| `SESSION_DOMAIN` | Домен cookie. `null` ограничивает cookie текущим host. | `null`, если не нужна общая сессия между поддоменами. |
| `SESSION_SECURE_COOKIE` | Отправляет session cookie только по HTTPS. | На удалённом HTTPS-сервере `true`. |
| `SESSION_HTTP_ONLY` | Запрещает JavaScript читать session cookie. | `true`. |
| `SESSION_SAME_SITE` | Ограничивает cross-site отправку cookie. | Обычно `lax`. |

При `SESSION_DRIVER=file` данные находятся в `storage/framework/sessions`. На нескольких web-серверах потребуется общее session-хранилище, например Redis или database.

## Broadcast, files, queues and cache

| Переменная | Назначение | Рекомендация |
|---|---|---|
| `BROADCAST_CONNECTION` | Драйвер broadcast-событий. | `log`, пока realtime broadcasting не используется. |
| `FILESYSTEM_DISK` | Диск Laravel Filesystem по умолчанию. | `local`, если внешнее object storage не используется. |
| `QUEUE_CONNECTION` | Обработчик очередей. | `sync`, пока отдельный queue worker не настроен. |
| `CACHE_STORE` | Хранилище кеша. | `file` для одного сервера. |
| `CACHE_PREFIX` | Префикс ключей кеша для разделения приложений в общем хранилище. | Нужен прежде всего для Redis/Memcached. |

`QUEUE_CONNECTION=sync` выполняет задачу сразу в текущем HTTP-процессе и не требует worker.

## Memcached

| Переменная | Назначение |
|---|---|
| `MEMCACHED_HOST` | Адрес Memcached. Используется только при выборе соответствующего cache/session-драйвера. |

## Redis

| Переменная | Назначение |
|---|---|
| `REDIS_CLIENT` | PHP-клиент Redis, обычно `phpredis`. |
| `REDIS_HOST` | Адрес Redis. |
| `REDIS_PASSWORD` | Пароль Redis или `null`. |
| `REDIS_PORT` | TCP-порт Redis, обычно `6379`. |

Эти параметры не используются приложением при `CACHE_STORE=file`, `SESSION_DRIVER=file` и `QUEUE_CONNECTION=sync`.

## Mail

| Переменная | Назначение |
|---|---|
| `MAIL_MAILER` | Драйвер отправки. `log` записывает письма в лог вместо реальной отправки. |
| `MAIL_SCHEME` | Схема подключения к mail server, если требуется драйвером. |
| `MAIL_HOST` | SMTP host. |
| `MAIL_PORT` | SMTP port. |
| `MAIL_USERNAME` | SMTP login. |
| `MAIL_PASSWORD` | SMTP password. |
| `MAIL_FROM_ADDRESS` | Email отправителя по умолчанию. |
| `MAIL_FROM_NAME` | Имя отправителя. `${APP_NAME}` подставляет значение другой env-переменной. |

## AWS and S3

| Переменная | Назначение |
|---|---|
| `AWS_ACCESS_KEY_ID` | Access key облачного хранилища. |
| `AWS_SECRET_ACCESS_KEY` | Secret key облачного хранилища. Не публиковать. |
| `AWS_DEFAULT_REGION` | Регион, например `us-east-1`. |
| `AWS_BUCKET` | Имя S3 bucket. |
| `AWS_USE_PATH_STYLE_ENDPOINT` | Использовать path-style S3 URL вместо virtual-hosted style. Часто требуется S3-совместимым сервисам. |

Эти переменные не используются при `FILESYSTEM_DISK=local`.

## Vite

| Переменная | Назначение | Рекомендация |
|---|---|---|
| `VITE_APP_NAME` | Название приложения, доступное frontend во время Vite build. | Обычно `${APP_NAME}`. |
| `VITE_HOST` | Интерфейс Vite dev server. | В Docker `0.0.0.0`. |
| `VITE_PORT` | Внутренний порт Vite dev server. | В Docker `5173`; host-порт проекта `5175`. |

`VITE_HOST` и `VITE_PORT` относятся к разработке. На сервере используется результат `npm run build` из `public/build`, файл `public/hot` должен отсутствовать.

## MyHeat integration

| Переменная | Назначение | Значение по умолчанию |
|---|---|---|
| `MH_INTEGRATION_URL` | Внешний endpoint интеграции и поиска котлов. | `https://mhtest.ru/api/integration` |
| `MH_ORIGIN` | Заголовок `Origin` исходящего server-to-server запроса. | `https://mhtest.ru` |
| `MH_REFERER` | Заголовок `Referer` исходящего запроса. | `https://mhtest.ru/podbor-oborudovaniya` |
| `MH_TIMEOUT` | Таймаут исходящего запроса в секундах. | `10` |

Frontend отправляет запрос на локальный `/api/integration`. Laravel пересылает payload во внешний `MH_INTEGRATION_URL`, поэтому браузер напрямую к этому домену не обращается.

## Storage path

Laravel по умолчанию использует каталог `<project>/storage`, поэтому отдельная переменная обычно не требуется.

| Переменная | Назначение | Рекомендация |
|---|---|---|
| `LARAVEL_STORAGE_PATH` | Полностью переопределяет путь к `storage`. | Не задавать без необходимости. Если hosting требует явный путь, использовать абсолютный `/opt/myheat/prowww/storage`. |

Неправильный `LARAVEL_STORAGE_PATH` влияет одновременно на логи, file-сессии, file-cache и скомпилированные Blade views. После переноса архива также нужно восстановить группу `www-data` и права записи на `storage` и `bootstrap/cache`.

## Recommended staging profile

```env
APP_NAME=MyHeat
APP_ENV=staging
APP_DEBUG=false
APP_URL=https://pro.mhtest.ru

DATABASE_ENABLED=true
DB_CONNECTION=pgsql
DB_HOST=192.168.12.14
DB_PORT=5432
DB_DATABASE=myheat
DB_USERNAME=myheatpro
DB_PASSWORD="replace-with-secret"
DB_SSLMODE=prefer

AUTH_MODE=database
AUTH_USERS_TABLE=users
AUTH_LOGIN_COLUMN=email
AUTH_PASSWORD_COLUMN=password

BETA_ACCESS_ENABLED=false
BETA_ACCESS_COOKIE_SECURE=true

SESSION_DRIVER=file
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax

CACHE_STORE=file
QUEUE_CONNECTION=sync

LOG_CHANNEL=stack
LOG_STACK=daily
LOG_LEVEL=warning
```

Production отличается как минимум значением `APP_ENV=production`, реальными секретами и production-доменом в `APP_URL`. На staging также нельзя включать `APP_DEBUG` на публично доступном сервере.

## Env syntax and secrets

Значения с пробелами, `#`, `=` и специальными символами заключайте в двойные кавычки:

```env
DB_PASSWORD="password#with=special characters"
```

Не публикуйте и не коммитьте:

- `APP_KEY`;
- `DB_PASSWORD`;
- `MAIL_PASSWORD`;
- `REDIS_PASSWORD`;
- `AWS_SECRET_ACCESS_KEY`;
- любые API-токены.

После случайной публикации секрет нужно заменить, а не просто удалить из сообщения или Git.
