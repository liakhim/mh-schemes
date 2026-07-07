# MH Schemes

Quick-start stack for MH scheme rendering:
- Laravel backend and MySQL (`schemes_db`)
- React + `react-konva` canvas scheme page
- Admin and selection pages
- PDF export from canvas

## Run locally (Docker)

```bash
docker compose up --build
```

After startup:
- Scheme: `http://localhost:8080/scheme`
- Schemes list: `http://localhost:8080/schemes`
- Selection: `http://localhost:8080/selection`
- Admin: `http://localhost:8080/admin`
- Vite dev server (HMR): `http://localhost:5173`
- MySQL: `localhost:3308`

## Project Map

- Main renderer and interactions: `resources/js/spa.jsx`
- Input contract: `INCOMING_SCHEME.md`
- Short project context: `PROJECT_CONTEXT.md`
- Full rules journal: `JOURNAL.md`
- Rule index: `docs/rules/INDEX.md`
- Domain materialization pipeline: `resources/js/scheme/domain/oneWireMaterializer.js`
- Beget deploy notes: `docs/deploy/beget.md`

## What gets created automatically

- Database: `schemes_db`
- Table: `users` (via Laravel migration)
- Superuser account (via seeder):
  - Email: `superuser@schemes.local`
  - Name: `superuser`
  - Password: `superuser123` (override with `SUPERUSER_PASSWORD`)

## Useful commands

```bash
npm run build
docker compose exec app php artisan migrate --seed --force
docker compose exec app php artisan test
docker compose logs -f app
```

## incomingScheme Notes

- Public `incomingScheme` stores selected devices in top-level lists such as `wired_devices`, `sensors`, `boilers`, `ext_modules`, `di_modules`, and `one_wire_modules`.
- Balancers materialize devices into controller/module lines for rendering, but successful placement must not create persistent duplicates.
- `ecosmart`-only render lines are internal materialized lines and must not appear in public `incomingScheme`, including after balancing and save.
- Before JSON display/save, internal `ecosmart` line devices are serialized back into public `wired_devices` or `sensors`.
