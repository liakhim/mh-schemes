# Relay Rules

Краткая версия relay-правил. Полный источник: `JOURNAL.md`, раздел `Relay линия`.

## TL;DR

- Relay-линия есть у `go`, `go+`, `smart2`, `pro`, `ecosmart`.
- ВАЖНО: тупой котёл (`stupid`) не может садиться на RELAY-S порты — ни при балансировке, ни при отрисовке, ни при ручном добавлении через слоты. Пункт «Тупой котёл» скрыт в меню relay-s слотов (controller `pro`, `rl6s`, `rl2s`); балансировщик (`supportsRelayS`) не пускает котёл в relay-s линии, а застрявшие в сохранённых схемах котлы переносит в обычные relay-линии (controller, `rl6`), при нехватке мест возвращает в `boilers`.
- На controller relay-s линии `pro` порты `RELAY-S-N-B` используются для коммутации к устройству; если слот занят, из соответствующего `RELAY-S-N-A` рисуется короткий подвод вверх с символом `L`, для `double_relay` рисуются два подвода `L`.
- У `ecosmart` controller RELAY-линия состоит из одного устройства и расположена над текущей позицией controller 4-20 слота с дополнительным подъёмом `5 * indent`.
- У `ecosmart` пустой controller RELAY-слот отображается независимо от `Show empty slots`.
- У `ecosmart` controller RELAY-слот рисуется отдельным overlay-renderer, так как в SVG controller нет port-классов `RELAY-*`.
- Над занятым controller RELAY-слотом `ecosmart` отображается инфоблок с названием устройства.
- Занятый controller RELAY-слот `ecosmart` draggable; offset хранится в общем `relaySlotOffsets[0]` и сбрасывается через `Reset positions`.
- Если controller RELAY-слот `ecosmart` занят `stupid boiler`, размер слота равен размеру BUS-слота с котлом, то есть native-размеру SVG котла или fallback `BUS_SLOT_SIZE`.
- Для `stupid boiler` в controller RELAY-слоте `ecosmart` используются порты controller `RELAY-1-A` и `RELAY-1-B`; они коммутируются двумя линиями к `BUS-A`/`BUS-B` портам SVG котла.
- У `ecosmart` relay-балансировщики также работают по EXT-модулям `rl6`/`rl6s`.
- Специальные controller-линии `ecosmart` ниже являются внутренней материализацией для render-state; они не должны попадать в публичный `incomingScheme` после балансировки, JSON-display или save. При сериализации устройства возвращаются в `wired_devices`.
- У `ecosmart` `220servo` с `connection_type='double_relay'` размещается только в отдельной controller-линии `controller['220_servo_devices']`.
- `ecosmart 220_servo_devices` расположен в левой нижней части controller со смещением на `6 * indent` правее базовой левой позиции и подъёмом на `6 * indent` выше прежней позиции, использует `resources/assets/servo/220servoRightPorts.svg` и подключается к controller ports `RELAY-6-V+`, `RELAY-6-A`, `RELAY-6-B`, `RELAY-6-GND`.
- Если первый слот `ecosmart 220_servo_devices` (`RELAY-6-*`) уже занят, следующий `220servo` с `connection_type='double_relay'` занимает `controller['220_servo_devices'][1]`, расположен под слотом `RELAY-5` насоса и дополнительно опущен на `2 * indent`, использует `resources/assets/servo/220servoRightPorts.svg` и подключается к `RELAY-4-V+`, `RELAY-4-A`, `RELAY-4-B`, `RELAY-4-GND`.
- В текущем `ecosmart.svg` физических классов `RELAY-4-*` нет, поэтому renderer использует виртуальные позиции нижней клеммной группы.
- У `ecosmart` `valve` с `connection_type='double_relay'` размещается в отдельной линии `controller.relay_s_valve_devices`.
- `ecosmart relay_s_valve_devices` использует `resources/assets/modules/valve/valveLeftPort.svg` и порты controller `RELAY-S-1-V+ VALVE`, `RELAY-S-1-A VALVE`, `RELAY-S-1-B VALVE`, `RELAY-S-1-GND VALVE`.
- Слот `ecosmart relay_s_valve_devices` расположен справа от controller; левая грань слота начинается от правой грани controller, нижняя грань слота на `6 * indent` выше нижней грани controller.
- У `ecosmart` `boilerPump`/`boiler-pump` с `connection_type='relay|relay-s'` размещается в отдельной линии `controller.relay_boiler_gvs_devices`.
- На `/selection` `boilerPump`/`boiler-pump` с `connection_type='relay|relay-s'` считается альтернативным подключением: для контроллеров без relay-s достаточно 1 обычного relay-слота.
- На `/selection` для контроллеров с relay и relay-s capacity `boilerPump`/`boiler-pump` с `connection_type='relay|relay-s'` считается гибким устройством: сначала занимает доступные relay-слоты, остаток учитывается как relay-s; после автодобавления `rl6` relay-s дефицит пересчитывается.
- `ecosmart relay_boiler_gvs_devices` расположен под слотом `relay_s_valve_devices` с дополнительным опусканием `2 * indent`, ширина слота `8 * indent`, используется `resources/assets/pumps/boilerPumpLeftPort.svg`.
- Коммутация насоса бойлера ГВС: `RELAY-1-A BOILER-GVS` -> `RELAY-IN A`, `RELAY-1-B BOILER-GVS` -> `RELAY-IN B`, `RELAY-1-GND BOILER-GVS` -> `RELAY-IN-GND`.
- Линии от портов изображения насоса бойлера сначала выходят сразу влево, затем идут к соответствующим controller-портам.
- У `ecosmart` `220pump`/`pump-220v` с `connection_type='relay'` размещается в отдельной линии `controller.relay_220pump_devices` под слотом `relay_boiler_gvs_devices`.
- `ecosmart relay_220pump_devices` использует `resources/assets/pumps/220pumpLeftPort.svg`.
- Коммутация насоса 220V: `RELAY-2-A 220PUMP` -> `RELAY-IN A`, `RELAY-2-B 220PUMP` -> `RELAY-IN B`, `RELAY-2-GND 220PUMP` -> `RELAY-IN-GND`.
- Если `ecosmart relay_220pump_devices` уже занят, следующий `220pump`/`pump-220v` с `connection_type='relay'` размещается в `controller.relay_220pump5_devices` под слотом `220_servo_devices`; слот поднят на `6 * indent` выше прежней позиции.
- `ecosmart relay_220pump5_devices` использует `resources/assets/pumps/220pumpRightPort.svg` и подключается: `RELAY-IN A` -> `RELAY-5-A 220PUMP`, `RELAY-IN B` -> `RELAY-5-B 220PUMP`, `RELAY-IN-GND` -> `RELAY-5-GND 220PUMP`.
- Если `ecosmart relay_220pump5_devices` уже занят, следующий `220pump`/`pump-220v` с `connection_type='relay'` размещается в `controller.relay_220pump3_devices` под вторым слотом `220_servo_devices` и дополнительно опущен на `2 * indent`.
- `ecosmart relay_220pump3_devices` использует `resources/assets/pumps/220pumpRightPort.svg` и подключается: `RELAY-IN A` -> `RELAY-3-A 220PUMP`, `RELAY-IN B` -> `RELAY-3-B 220PUMP`, `RELAY-IN-GND` -> `RELAY-3-GND 220PUMP`.
- В текущем `ecosmart.svg` физических классов `RELAY-3-*` нет, поэтому renderer использует виртуальные позиции нижней клеммной группы.
- Количество слотов равно количеству relay-портов владельца линии.
- Пустые relay-слоты отображаются только при `Show empty slots`.
- Занятые слоты RELAY-линии контроллера draggable.
- `Reset positions` сбрасывает relay offsets.
- Для `pro` capacity собственной relay-линии контроллера: `4` слота.
- Для `smart2` capacity собственной relay-линии контроллера: `1` слот; следующие relay-устройства распределяются в `rl2.relay_devices` / `rl2s.relay_s_devices`.
- EXT `rl6`/`rl6s`: `6` слотов.

## Sources

- `wired_devices` с `connection_type='relay'`.
- `pump-220v` alias: `220pump`, `pump220v` -> `pump-220v`.
- Целевой формат `220pump`/`pump-220v`: `connection_type='relay|relay-s'`; устройство может занимать RELAY и RELAY-S слоты.
- `boiler-pump` alias: `boilerpump` -> `boiler-pump`.
- `zoneServo` занимает один relay-слот.
- `220servo` и `valve` с `connection_type='double_relay'` занимают два соседних слота.

## Controller Relay Line Placement

- `go`/`go+`: relay-линия справа от контроллера.
- `go`/`go+`: нижняя линия relay-слота смещена на `3 * indent` ниже нижней линии контроллера.
- `go`/`go+`: горизонтальный отступ от правой границы контроллера `4 * indent`.
- `smart2`/`pro`: relay-линия располагается под power-линией.
- `pro`: слоты располагаются справа налево.

## Occupied Slots

- Фон и обводка занятого relay-слота скрыты по умолчанию.
- На hover показываются фон, обводка и кнопка удаления.
- При `Show ports` порт `RELAY-IN` занятого relay-слота подсвечивается красной точкой.
- Занятый relay-слот использует `RELAY-IN` для коммутации с портом `RELAY-*-B` контроллера.
- Если controller RELAY-слот занят `boilerPump`/`boiler-pump`, линия из `RELAY-IN` насоса сначала выходит вправо на `1 * indent`, затем идёт вниз до горизонтального участка, затем к вертикали соответствующего controller RELAY-порта и вверх в порт.
- Если controller RELAY-S слот `pro` занят `boilerPump`/`boiler-pump`, линия из `RELAY-IN` насоса выходит сразу в сторону до вертикали соответствующего `RELAY-S-*-B` порта контроллера и затем идёт в порт.
- Вертикальный зазор между слотами controller RELAY-S линии `pro`: `4 * indent`.
- Занятые controller RELAY-S слоты `pro` на hover показывают кнопку удаления; удаление убирает устройство из `controller.relay_s_devices`.

## Other Equipment

- Default SVG: `resources/assets/engineerings/otherEquipment/otherEquipmentRightPort.svg`.
- Alternative SVG: `resources/assets/engineerings/otherEquipment/otherEquipmentLeftPort.svg`.
- Сторона порта выбирается автоматически по расположению слота относительно контроллера/модуля.
- Для `otherEquipmentLeftPort.svg` линия выходит из порта сразу влево на `1 * indent`, затем выполняется вынос вниз.
- Для `otherEquipmentRightPort.svg` линия выходит из порта сразу вправо на `1 * indent`, затем выполняется вынос вниз.

## Pumps

- В relay-линиях `pump-220v` подписывается как `Насос 220V N`.
- `boiler-pump` подписывается как `Насос бойлера N`.
- Для `rl6`/`rl6s` слоты `1`, `2`, `3` используют right-port SVG.
- Для `rl6`/`rl6s` слоты `4`, `5`, `6` используют left-port SVG.
- Пустые relay/relay-s слоты `rl6`/`rl6s` отображают номер слота `1..6` в правом верхнем углу.
- В левой relay/relay-s линии `rl6`/`rl6s` слоты `1`, `2`, `3` расположены снизу вверх.

## Double Relay

- `220servo` и `valve` занимают два соседних relay/relay-s слота.
- Физическая занятость определяется по `relay_slot_index` и span устройства. Для `double_relay` выбирается только непрерывная свободная пара, а новому устройству записывается индекс первого слота; две разрозненные дырки парой не считаются.
- При ручном добавлении в `rl6s.relay_s_devices` пункты `220servo` и `valve` создаются с `connection_type='double_relay'`; добавление не выполняется, если нет двух соседних свободных relay-s слотов.
- Для ручного добавления в relay/relay-s слоты `rl6`/`rl6s` индекс выбранного слота сохраняется; sparse-массивы не упаковываются в верхний слот линии.
- Для auto-balanced плотных массивов double-relay устройств `rl6`/`rl6s` следующий элемент сдвигается к следующему свободному слоту, если текущий индекс покрыт предыдущим double-relay устройством.
- Для `smart2` `220servo`/`valve` с `double_relay` распределяются в DI-модули: сначала `rl2s.relay_s_devices`, затем `rl2.relay_devices`, при наличии двух соседних слотов.
- У `smart2` controller RELAY имеет ёмкость `1`; следующий релейный котёл размещается в `rl2.relay_devices`, если свободен совместимый слот.
- `valve` с `double_relay` автоматически занимает физически свободную пару RELAY-S на controller `pro`, `rl6s` или `rl2s`; при отсутствии такой пары может использовать совместимую RELAY-пару.
- Если свободных соседних слотов меньше двух, устройство не размещается.
- `valve` использует порты SVG `RELAY-IN-1`, `RELAY-IN-2`.
- Для сервопривода на портах `RELAY-2-B` и `RELAY-3-B` обычной relay-линии горизонтальные участки поднимаются на `3 * indent`.
