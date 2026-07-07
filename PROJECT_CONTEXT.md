# Project Context

Короткий вход в проект для новой сессии. Читать первым, полный `JOURNAL.md` открывать только при необходимости.

## Стек

- Backend: Laravel 13, PHP 8.3
- Frontend: React 19, Vite 8, `react-konva`
- PDF export: `jspdf`
- Главная страница схемы: `/scheme`, `/scheme/{id}`
- Admin page: `/admin`

## Главные файлы

- Главная отрисовка и интерактив: `resources/js/spa.jsx`
- Входной контракт: `INCOMING_SCHEME.md`
- Полный журнал правил: `JOURNAL.md`
- Индекс быстрых правил: `docs/rules/INDEX.md`
- Константы и demo input: `resources/js/constants.js`
- SVG registry: `resources/js/scheme/assets/imageRegistry.js`
- Типы и alias: `resources/js/scheme/domain/deviceTypes.js`
- Материализация схемы: `resources/js/scheme/domain/oneWireMaterializer.js`

## Доменная Логика

- `oneWireBalancer.js`: распределение 1-wire устройств по контроллеру и EXT-модулям.
- `oneWireMaterializer.js`: общий pipeline балансировки и переносов без дублирования.
- `oneWireMutations.js`: ручное добавление/удаление 1-wire устройств.
- `relayDeviceBalancer.js`: relay-оборудование, насосы, `zoneServo`.
- `servoBalancer.js`: `220servo`/`valve` с `double_relay`.
- `servo010Balancer.js`: `010servo` только в `io4.channel_devices`.
- `ntcSensorBalancer.js`: распределение `ntc-sensor` в `ntc1_devices`/`ntc2_devices` модулей `ntc-1-wire`.
- `pressureSensorBalancer.js`: `pressure-sensor` с `4-20`.
- `discreteDeviceBalancer.js`: discrete DI devices в controller/io4/di6.

## Инварианты

- Не дублировать размещённые устройства: балансировщик переносит объект в целевую линию и удаляет из исходного верхнеуровневого списка.
- Если устройство не помещается, оно остаётся в исходном списке.
- `ecosmart`-only линии controller являются внутренней материализацией для отрисовки и не должны попадать в публичный `incomingScheme`/сохранение; при сериализации их устройства возвращаются в `wired_devices` или `sensors`.
- `controller.one_wire_devices` - актуальное хранилище 1-wire линии контроллера.
- `controller_one_wire_devices` - только legacy fallback.
- `Show ports` влияет только на отображение портов, не на геометрию.
- `Show empty slots` показывает только пустые слоты по правилам линии.
- `Reset positions` сбрасывает пользовательские offsets.
- Занятые слоты могут скрывать фон/обводку по умолчанию и показывать их на hover, если это закреплено правилом линии.

## Быстрая Карта Правил

- Wireless: `docs/rules/wireless.md`
- 1-wire: `docs/rules/one-wire.md`
- Relay: `docs/rules/relay.md`
- Power: `docs/rules/power.md`
- EXT/DI/channel: `docs/rules/ext-di.md`
- Controllers: `docs/rules/controllers.md`
- Полный changelog: `JOURNAL.md`, раздел `Change log правил`

## Проверки

- Frontend build: `npm run build`
- Laravel tests: `php artisan test` или `docker compose exec app php artisan test`
