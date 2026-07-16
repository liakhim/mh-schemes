# 1-wire Rules

Краткая версия правил 1-wire. Полный источник: `JOURNAL.md`, разделы `1-wire линия`, `NTC-1-wire и RDT2`, `NTC-линии`.

## TL;DR

- Максимум линии контроллера: `6` устройств.
- Источники: `wired_devices` с `connection_type='1-wire'`, `sensors` с `connection_type='1-wire'`, `one_wire_modules`.
- Для `flask-sensor-strategy` и `flask-sensor-gvs-boiler` целевой глобальный `connection_type` - `1-wire|ntc`.
- На `/selection` при добавлении двух и более котлов `boiler.type='smart'` автоматически добавляется один `flask-sensor-strategy` с `connection_type='1-wire|ntc'`.
- `connection_type='1-wire|ntc'` означает: для `ecosmart` устройство подключается как `ntc`, для остальных контроллеров как обычный `1-wire`.
- Alias: `rdt` -> `rdt2`.
- Актуальное хранилище после материализации: `controller.one_wire_devices` и `ext_modules[n].one_wire_devices`.
- `controller_one_wire_devices` только legacy fallback.
- Успешно размещённые объекты удаляются из исходных списков.

## Controller 1-wire Geometry

- Первый слот строится по портам `1-WIRE-*` контроллера.
- Для `ecosmart` у линии от controller к первому 1-wire устройству вертикальный участок смещён левее на `6 * indent` от портов controller.
- Для `ecosmart` первое 1-wire устройство и первый пустой слот при пустой линии расположены на `5 * indent` ниже базовой позиции.
- Дополнительный сдвиг всей 1-wire линии `ecosmart` определяется первым устройством: `ntc-1-wire`, проводной термостат, цифровой проводной датчик и `flask-sensor` - `3 * indent`; `rdt2` - `8 * indent`.
- Для пустого первого 1-wire слота `ecosmart` линии после левого вертикального участка обходят слот снизу: `V+` опускается на `1 * indent`, `DAT` - на `2 * indent`, `GND` - на `3 * indent` ниже нижней грани слота; затем линии идут вправо и поднимаются к нижней грани слота.
- Для `go`/`go+` и `smart2` первый слот имеет дополнительный отступ вниз `0.5 * module_height` от уровня портов.
- Для `pro` первый слот имеет отдельный больший отступ в коде layout.
- Для `pro` горизонтальный участок линии `V+` к первому 1-wire устройству не может быть выше нижней границы самого нижнего отображаемого controller-слота или горизонтального участка EXT-соединения плюс `1 * indent`; `DAT` проходит ещё на `1 * indent` ниже, `GND` - на `2 * indent` ниже. В расчёт входят `MODBUS`, `DI`, пустой `AI`, `4-20`, батарея, `RELAY`, `BUS` и маршруты controller/EXT-цепочки; пустые слоты учитываются только при `Show empty slots`.
- Если первый слот занят, отображается следующий пустой слот при `Show empty slots`.

## Min Bend Under Controller

- `pro`, первое устройство:
- `GND`: `5 * indent`, `DAT`: `4 * indent`, `V+`: `3 * indent` ниже нижней границы контроллера.

- `smart2`, первое устройство:
- Если в DI-линии 2 устройства: `GND=11`, `DAT=10`, `V+=9` indent.
- Если в DI-линии 1 устройство: `GND=9`, `DAT=8`, `V+=7` indent.
- Если DI-линия пустая: `GND=5`, `DAT=4`, `V+=3` indent.

- `go`/`go+`, первое устройство:
- Базово: `GND=5`, `DAT=4`, `V+=3` indent.
- Если занят слот RELAY-линии: `GND=7`, `DAT=6`, `V+=5` indent.

## Link Colors

- `1-WIRE-V+`: red `#d32f2f`.
- `1-WIRE-DAT`: yellow `#fbc02d`.
- `1-WIRE-GND`: black `#212121`.

## Device Spacing

- Следующий слот начинается на `2 * indent` правее правого края предыдущего устройства.
- Если в цепочке есть `ntc-1-wire`, для него применяется дополнительный top offset `12 * indent`.
- Для `ntc-1-wire` применяется side gap: слева `10 * indent`, справа `10 * indent`.
- Вертикальный шаг по умолчанию: ниже нижней линии предыдущего устройства + `0.25 * module_height`.
- Если предыдущее устройство `ntc-1-wire` или `rdt2`: ниже нижнего края модуля + `0.25 * module_height`.

## NTC-1-wire / RDT2

- `ntc-1-wire` и `rdt2` используют реальные размеры SVG без растяжения.
- Любой sensor с `connection_type='ntc'`, который не может быть размещён в доступном NTC-слоте контроллера или специализированного модуля, требует `ntc-1-wire`.
- Если для такого NTC sensor нет свободного слота, система автоматически добавляет модуль `ntc-1-wire` в доступную 1-wire линию, соблюдая правила ёмкости 1-wire линий.
- На `/selection` автоподбор учитывает, что сам `ntc-1-wire` занимает один слот 1-wire линии; если 1-wire линий не хватает, для `pro`/`ecosmart` добавляется `rl6`/`rl6s` по обычным правилам 1-wire capacity.
- Для входящего подключения используются `IN` порты.
- Для подключения следующего устройства используются `OUT` порты.
- Для точности используются якорные координаты портов.
- Над занятыми слотами `ntc-1-wire` и `rdt2` инфоблок не отображается.

## NTC Lines Of NTC-1-wire

- У `ntc-1-wire` две NTC-линии: `ntc1_devices`, `ntc2_devices`.
- В каждой линии до `3` датчиков.
- Первая линия расположена слева сверху от модуля.
- Вторая линия расположена справа сверху от модуля.
- Пустые NTC-слоты отображаются только при `Show empty slots`.
- Пустые NTC-слоты показывают номер канала `1..6` в правом верхнем углу.
- Линии коммутации от портов модуля `NTC-*-B` рисуются цветом `#464EE3`.
- Линии коммутации от портов модуля `NTC-*-A` остаются чёрными `#212121`.
- NTC sensors распределяются балансировщиком по least-filled `ntc-1-wire` модулю.
- Назначенные NTC-датчики удаляются из верхнего `sensors`.

## Ecosmart NTC Lines

- Для `ecosmart` датчики `flask-sensor-strategy` и `flask-sensor-gvs-boiler` с `connection_type='1-wire|ntc'` переводятся в controller NTC-линии.
- Legacy `connection_type='1-wire'` для этих двух датчиков принимается только как fallback для старых сохранённых схем.
- `flask-sensor-strategy` хранится в `controller.strategy_sensor_devices[0]`.
- `flask-sensor-gvs-boiler` хранится в `controller.boiler_sensor_devices[0]`.
- `mixing-ntc-sensor` с `connection_type='ntc'` извлекаются из `220servo.additions` и занимают `controller.mixing_ntc_devices[0..1]`.
- После назначения перенесённые объекты удаляются из исходных `sensors`/`additions`.
- Для не-`ecosmart` `flask-sensor-strategy` и `flask-sensor-gvs-boiler` остаются в обычной 1-wire линии.
- На `/selection` `flask-sensor-gvs-boiler` с `connection_type='1-wire|ntc'` не требует `ecosmart`; для не-`ecosmart` он считается обычным 1-wire датчиком.
- Обычные 1-wire устройства распределяются round-robin между controller 1-wire линией и 1-wire линиями `rl6`/`rl6s`, а не заполняют сначала controller line до capacity.
