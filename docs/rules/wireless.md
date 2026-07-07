# Wireless Rules

Краткая версия правил беспроводной линии. Полный источник: `JOURNAL.md`, раздел `Беспроводная линия`.

## TL;DR

- Источник данных: `incomingScheme.wireless_devices`.
- Нижняя грань wireless-линии отстоит от верхней грани контроллера на controller-specific gap.
- `go`, `go+`: `0.6 * module_height`.
- `smart2`: `0.5 * module_height`.
- `pro`: `1.25 * module_height`.
- `ecosmart`: `0.5 * module_height`.
- Инфоблок `Беспроводные устройства` находится над верхней гранью wireless-линии, нижний край на `40px` выше линии.
- Если линия пустая и выключены `Show empty slots`/`Show line frames`, инфоблок скрыт.
- Если линия пустая, но включён `Show empty slots` или `Show line frames`, инфоблок отображается.
- Пустой wireless slot отображается при `Show empty slots`.
- `Show line frames` должен показывать frame даже для пустой wireless-линии.

## Slots

- Пустой слот: `80x80px`, `cornerRadius=10`, внутри кнопка `+` размером `32px`.
- Занятые слоты идут последовательно по X без наложений.
- Позиции занятых слотов можно менять drag/drop.
- `Reset positions` сбрасывает пользовательские смещения.

## Occupied Slots

- По умолчанию у занятого wireless-слота скрыты фон, обводка и кнопка удаления.
- На hover показываются фон, обводка и кнопка удаления.
- Над занятыми слотами отображаются инфоблоки с названием и системным номером.

## Types And Assets

- `outdoor-temperature-sensor`: `resources/assets/sensors/wirelessOutdoorSensor.svg`.
- `wall-temperature-sensor`: `resources/assets/sensors/wirelessWallSensor.svg`.
- `thermostat`: SVG зависит от `color`.
- `thermostat black`: `resources/assets/thermostats/black/thermostat_black.svg`.
- `thermostat white`: `resources/assets/thermostats/white/thermostat_white.svg`.
- `thermostat gray`: `resources/assets/thermostats/gray/thermostat_gray.svg`.
- Неизвестный/пустой цвет термостата -> `black`.

## Thermostat Floor Sensor

- У wireless thermostat есть one-wire слот справа от изображения.
- Размер one-wire слота: `70x70px`.
- Слот содержит только один `floor-sensor`.
- Контекстное меню содержит пункт `Датчик пола`.
- Выбранный датчик хранится в `additions` термостата.
- SVG датчика пола: `resources/assets/sensors/flaskSensor.svg`.
- Если датчик пола есть, фон/обводка one-wire слота скрыты, видно только изображение.
