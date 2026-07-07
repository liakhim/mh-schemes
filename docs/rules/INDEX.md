# Rules Index

Индекс правил для точечного чтения вместо полного `JOURNAL.md`.

## Wireless

- Файл правил: `docs/rules/wireless.md`
- Основная реализация: `resources/js/spa.jsx`
- Assets: `resources/js/scheme/assets/imageRegistry.js`, `resources/assets/thermostats/*`, `resources/assets/sensors/wireless*.svg`

## 1-wire

- Файл правил: `docs/rules/one-wire.md`
- Основная реализация: `resources/js/spa.jsx`
- Балансировка: `resources/js/scheme/domain/oneWireBalancer.js`, `oneWireMaterializer.js`, `oneWireMutations.js`, `ntcSensorBalancer.js`
- Layout: `resources/js/scheme/layout/oneWireLayout.js`, `resources/js/scheme/layout/ports.js`

## Relay

- Файл правил: `docs/rules/relay.md`
- Основная реализация: `resources/js/spa.jsx`
- Балансировка: `resources/js/scheme/domain/relayDeviceBalancer.js`, `servoBalancer.js`, `boilerBalancer.js`
- Assets: pumps, servo, valve, otherEquipment

## Power

- Файл правил: `docs/rules/power.md`
- Основная реализация: `resources/js/spa.jsx`
- Assets: `circuit-breaker`, `power-unit`, `ups`, `battery`

## EXT / DI / Channel

- Файл правил: `docs/rules/ext-di.md`
- Основная реализация: `resources/js/spa.jsx`
- Балансировка: `pressureSensorBalancer.js`, `discreteDeviceBalancer.js`, `servo010Balancer.js`

## Controllers

- Файл правил: `docs/rules/controllers.md`
- Основная реализация: `resources/js/spa.jsx`, `imageRegistry.js`
- Assets: `resources/assets/controllers/*`, `resources/assets/other/go-aerial.svg`

## Full Source

- Полный журнал: `JOURNAL.md`
- Входной контракт: `INCOMING_SCHEME.md`
