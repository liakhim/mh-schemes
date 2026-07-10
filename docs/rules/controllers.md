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

## Ecosmart Slot Controls

- Hover-состояние per-role слотов `ecosmart` (leak-sensor, discrete DI, верхние NTC-слоты, насосы, сервоприводы, клапан, насос ГВС) вешается на Konva `Group` слота, а не на `Rect`: наведение на крестик удаления не должно снимать hover.
- Занятый controller RELAY-слот `ecosmart` (тупой котёл) показывает hover-крестик удаления; удаление вычищает устройство по id из `controller.relay_devices`, `boilers` и `wired_devices`.
- Инфоблоки per-role слотов `ecosmart` (включая насос бойлера ГВС) рисуются только при занятом слоте; над пустым слотом инфоблока нет даже при `Show empty slots`.

## Ecosmart Installation Ports

- Семантический тег в имени порта — часть его идентичности: `RELAY-1-A` (реле котла) и `RELAY-1-A BOILER-GVS` (насос ГВС) — разные физические пины; дедупликация портов в режиме монтажа — по полному имени.
- Занятость/подписи тегированных портов проверяются по per-role линиям контроллера: `BOILER-GVS` -> `relay_boiler_gvs_devices`, `220PUMP` (RELAY-2/5/3) -> `relay_220pump_devices`/`relay_220pump5_devices`/`relay_220pump3_devices`, `VALVE` -> `relay_s_valve_devices`, `CASCADE` -> `strategy_sensor_devices`, `BOILER` (NTC-2) -> `boiler_sensor_devices`, `MIXING` (NTC-3/4) -> `mixing_ntc_devices`.
- Нетегированные `RELAY-6-A/B` / `RELAY-4-A/B` — слоты сервоприводов смесителей (`220_servo_devices[0]`/`[1]`); `DI-IN-2-DI` — датчик протечки (`leak_sensor_devices[0]`).
- Хвост и лычка рисуются только на терминалах `A`/`B`; `GND`/`V+` — вспомогательные.
- `EXT-OUT` занят также при EXT-термостатах (`controller.ext_devices`); линия `4-20` учитывает legacy `devices420`.
- EXT-цепочка в режиме монтажа: контроллер -> EXT-модули -> EXT-термостаты; `EXT-OUT` последнего EXT-модуля (или контроллера без модулей) получает хвост и лычку с подписью первого EXT-термостата.

## Ecosmart Controller Switch

- При смене контроллера с `ecosmart` на другой (ручной выбор или автоподбор на `/selection`) внутренние материализации разворачиваются: термостаты из `controller.ext_devices` возвращаются в `wired_devices` с `connection_type='1-wire'`, `ecosmart_bl2` удаляется, датчик тупого котла (`flask-sensor-stupid-boiler`) восстанавливается в `sensors`, если в схеме есть тупой котёл.

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
