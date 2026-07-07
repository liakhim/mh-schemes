# Controller Rules

Краткая версия controller-правил. Полный источник: `JOURNAL.md`, раздел `Контроллеры`.

## Supported Controllers

- `go`
- `go+`
- `smart2`
- `ecosmart`
- `pro`

## Assets

- Controller SVG: `resources/assets/controllers/{name}/{name}.svg`.
- Registry: `resources/js/scheme/assets/imageRegistry.js`.
- Controller image is draggable as a group.

## Ports

- Порт - SVG element с `class`.
- Координаты портов вычисляются парсингом SVG (`getBBox`).
- `Show ports` рисует красные точки над портами, не меняя геометрию.

## Ecosmart BL2 Overlay

- Правило действует только для controller `ecosmart`.
- Если во внутреннем состоянии схемы есть `ecosmart_bl2` или `controller.ecosmart_bl2`, отрисовывается `resources/assets/modules/bl2/ecosmartbl2.svg` поверх изображения controller.
- `ecosmart_bl2` является внутренним render-полем и не должен попадать в публичный `incomingScheme` при показе JSON или сохранении.
- В `/admin` модуль показывается как `Ecosmart BL2` в группе `ecosmart overlay`.
- Модуль не подключается через классическую EXT-линию.
- Позиция рассчитывается так, чтобы `ECOSMART-ANCHOR-1` controller совпал с `ECOSMART-ANCHOR-1` модуля, а `ECOSMART-ANCHOR-2` controller совпал с `ECOSMART-ANCHOR-2` модуля.
- Для canvas/Konva стиль `box-shadow: 0 0 5px blue` реализуется через `shadowColor="blue"` и `shadowBlur={5}`.
- Модуль draggable, но пользовательская позиция не сохраняется: при отпускании левой кнопки мыши он сразу возвращается в рассчитанную anchor-позицию.

## Ecosmart BUS Slots

- Два BUS-слота `ecosmart` позиционируются от пары портов `BUS-1-A`/`BUS-1-B`.
- Оба BUS-слота дополнительно смещены левее на `4.5 * indent`.
- Оба BUS-слота дополнительно подняты вверх на `6 * indent`.

## Ecosmart Upper NTC Slots

- У `ecosmart` есть 4 вертикальных слота над контроллером.
- Нижняя грань нижнего слота находится на `4 * indent` ниже верхней грани контроллера.
- Размер каждого слота: `9 * indent` ширина и `2 * indent` высота.
- Правая грань каждого слота совпадает с правой гранью контроллера.
- Вертикальный gap между слотами: `3 * indent`.
- Снизу вверх: `strategy-sensor-line`, `boiler-sensor-line`, `mixing-ntc-sensor`, `mixing-ntc-sensor`.
- Пустые слоты отображаются всегда, независимо от `Show empty slots`.
- Верхние NTC-слоты `ecosmart` коммутируются к реальным NTC-портам controller:
- `strategy-sensor-line`: `NTC-1-A CASCADE`, `NTC-1-B CASCADE`.
- `boiler-sensor-line`: `NTC-2-A BOILER`, `NTC-2-B BOILER`.
- Первый `mixing-ntc-sensor`: `NTC-3-A MIXING`, `NTC-3-B MIXING`.
- Второй `mixing-ntc-sensor`: `NTC-4-A MIXING`, `NTC-4-B MIXING`.
- Для всех занятых верхних слотов `ecosmart` всегда используется изображение `resources/assets/sensors/ntcSensorLeftPort.svg`, независимо от типа датчика.
- Линии `strategy_sensor_devices`, `boiler_sensor_devices`, `mixing_ntc_devices` являются внутренней материализацией; в публичном `incomingScheme` соответствующие устройства должны находиться в `sensors`.

## GO / GO+ Aerial

- У `go` и `go+` есть собственная антенна `go-aerial`.
- SVG: `resources/assets/other/go-aerial.svg`.
- Антенна расположена прямо над контроллером.
- Нижняя грань антенны совпадает с верхней гранью контроллера.
- Правая грань антенны расположена на `5 * indent` левее правой грани контроллера.
- Антенна не зависит от SVG-портов `AERIAL`.

## GO / GO+ Indicators

- `WI-FI-INDICATOR` горит всегда цветом `#00DA00` с glow `0 0 6px #00DA00`.
- `BUS-INDICATOR` горит цветом `#00DA00` с glow `0 0 6px #00DA00`, если занят BUS-порт контроллера.
- Если BUS-порт свободен, `BUS-INDICATOR` серый `#D2D2D2`.
- Для `smart2` `BUS-INDICATOR` работает по занятости BUS-линии: активен, если в схеме есть BUS-устройство.
- BUS-слот `smart2` расположен ниже контроллера на `1.5 * module_height`, правая грань слота выровнена на `0.5 * indent` левее порта `BUS-A`.

## Relay Indicators

- Для `pro` используются `RELAY-INDICATOR-1..4`.
- Занято: `#00DA00` с glow `0 0 6px #00DA00`.
- Не занято: `#D2D2D2`.

## Invariants

- Элементы, инфоблоки и контроллер не должны пересекаться.
- Невалидный drag должен откатываться, если для линии реализована collision validation.
- `Show ports` не меняет маршруты и размеры.
