# Beget Deploy

## Requirements

- PHP 8.4+
- MySQL 8+
- Composer 2
- Node.js 22+ or local `npm run build` artifact upload
- Web root must point to Laravel `public/`

## First Deploy

```bash
git clone https://github.com/liakhim/mh-schemes.git mh-schemes
cd mh-schemes

composer install --no-dev --optimize-autoloader
npm ci
npm run build

cp .env.example .env
php artisan key:generate --force
```

Set production values in `.env`:

```env
APP_NAME="MH Schemes"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.example

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_db
DB_USERNAME=your_user
DB_PASSWORD=your_password

DATABASE_ENABLED=true
AUTH_MODE=database
AUTH_USERS_TABLE=users
AUTH_LOGIN_COLUMN=email
AUTH_PASSWORD_COLUMN=password

SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=sync
```

`AUTH_MODE=stub` keeps the temporary development login that accepts any non-empty credentials. Never use it in production. Database mode reads the existing user and password hash without updating the `users` row, then stores the authenticated Laravel session using `SESSION_DRIVER`.

Run database setup and cache warmup:

```bash
php artisan migrate --seed --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Update Deploy

```bash
cd mh-schemes
git pull --ff-only
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Beget Notes

- In Beget panel, set the site document root to the repository `public/` directory if the panel allows custom root.
- If custom root is not available on shared hosting, place the Laravel app outside the public site directory and copy/symlink contents of `public/` into the site's public directory, keeping `index.php` paths pointed to the app root.
- Do not upload `.env` to GitHub. Create it only on Beget.
- If PHP 8.4 is unavailable on the selected Beget plan, use Beget VPS/cloud or downgrade the Laravel stack before deploy.

## Beta Access Codes

The beta access gate is disabled by default. Before enabling it in production, generate the initial 20 personal links once:

```bash
php8.5 artisan beta:codes --count=20
```

Save the command output immediately. Plain codes are shown only once; the database stores only keyed hashes. The first browser that opens `/beta/{code}` binds that code to its HttpOnly device cookie and browser fingerprint. The same link is rejected without that cookie or from a different fingerprint.

- `BETA_ACCESS_ENABLED=true` explicitly enables the gate.
- `BETA_ACCESS_COOKIE_SECURE=true` must be used on production HTTPS; it is enabled automatically when `APP_ENV=production`.
- Local Docker disables the gate so existing development and Playwright workflows remain available.
