# CLAUDE.md

Быстрый вход в проект для новой сессии — сначала читать это, затем по необходимости остальное.

- Короткий контекст проекта: `PROJECT_CONTEXT.md`
- Входной контракт `incomingScheme`: `INCOMING_SCHEME.md`
- Индекс правил по темам (wireless, 1-wire, relay, power, ext-di, controllers, connection-layout, selection-config): `docs/rules/INDEX.md`
- Полный архив правил и changelog (открывать точечно, не целиком): `JOURNAL.md`
- Beget deploy notes: `docs/deploy/beget.md`

## Известные открытые несоответствия в документации

- `README.md` указывает порты `8080` (app) и `5173` (Vite HMR), но реальные хост-порты в `docker-compose.yml` — `8099` и `5175` соответственно (порт MySQL `3308` указан верно).
- `JOURNAL.md`, раздел "Беспроводная линия (wireless_line)" указывает для `pro` высоту `1.85 * module_height`, что противоречит более поздней записи changelog в том же файле и `docs/rules/wireless.md`, где для `pro` указано `1.25 * module_height`. Актуальное значение — `1.25`.
