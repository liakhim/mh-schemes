# Контракт incomingScheme

`incomingScheme` — входной объект данных, на основе которого строится визуальная схема.

Публичный `incomingScheme` не должен содержать внутренние controller-линии, которые создаются балансировщиками только для отрисовки. Это особенно важно для `ecosmart`: его специальные линии материализуются внутри приложения, но при показе JSON и сохранении сериализуются обратно в публичные `wired_devices` или `sensors`.

Схема хранит рядом с `incoming_scheme` отдельное поле `selection_config` — неизменяемый снимок страницы подбора на момент создания схемы. Оно не входит в контракт `incomingScheme` и описано отдельно в [`docs/rules/selection-config.md`](docs/rules/selection-config.md).

## Общая структура

```js
const incomingScheme = {
    id: 0,
    controller: 'go | go+ | smart2 | ecosmart | pro',
    boilers: [],
    wireless_devices: [],
    wired_devices: [],
    sensors: [],
    ext_modules: [],
    di_modules: [],
    one_wire_modules: [],
    power_modules: ['circuit-breaker', 'power-unit'],
    wifi_modules: [],
    installation_layout: null,
    connection_layout: null,
};
```

## Раскладка физических подключений

Публичные массивы `boilers`, `wired_devices` и `sensors` остаются каноническим источником устройств. Внутренние массивы линий контроллера и модулей (`relay_devices`, `relay_s_devices`, `bus_devices`, `di_devices`, `channel_devices`, `devices_420`/`devices420`) создаются для отрисовки и не заменяют публичные массивы при сохранении.

Опциональное top-level поле `connection_layout` сохраняет физические назначения отдельно от устройств:

```js
connection_layout: {
    version: 1,
    assignments: [
        {
            device_type: 'pressure-sensor',
            device_id: 20,
            owner_kind: 'ext_module',
            owner_id: 'io4-main',
            line: 'channel_devices',
            slot: 2,
        },
        {
            device_type: 'pump-220v',
            device_id: 30,
            owner_kind: 'controller',
            line: 'relay_devices',
            slot: 1,
        },
    ],
}
```

- Текущая версия схемы поля: `version: 1`.
- `device_type` содержит нормализованный `type` устройства, `device_id` - его стабильный ID.
- Все ID устройств и ссылки на них хранятся строками (`id_schema_version: 2`). Числовые ID legacy-схем преобразуются при загрузке и при следующем сохранении.
- Если legacy-схема одновременно содержит `1` и `'1'`, числовой ID получает безопасный префикс `legacy-number:`; связанные `device_id`, `owner_id`, `boiler_id` и остальные ссылочные поля преобразуются вместе с ним.
- `owner_kind`: `controller`, `ext_module` или `di_module`.
- Для `ext_module` и `di_module` обязателен стабильный `owner_id`; индекс модуля в массиве не используется. Для `controller` поле `owner_id` отсутствует.
- `line` задаёт физическую линию, `slot` - её индекс с нуля. Для `double_relay` это индекс первого из двух соседних портов и соответствует внутреннему `relay_slot_index`.
- Для IO4-группы `010servo`/`010pump` с `mixing-ntc-sensor` additions сохраняется assignment каждого физического канала. Все назначения группы должны вести на один IO4 и последовательные слоты; группа восстанавливается только целиком. При отсутствующем или повреждённом child assignment весь parent с публичными `additions` передаётся обычному `balance010Servos`.
- Назначения сохраняются только для устройств с реальным `id` и модулей с `id`. Одно устройство может иметь не более одного назначения.
- Поддерживаются controller BUS, RELAY, RELAY-S, DI и 4-20, EXT `bl2`/`rl6`/`rl6s`/`io4`/`di6`, а также relay-линии DI-модулей `rl2`/`rl2s`. Обычный EXT `bl2` допустим только для `pro`; у `ecosmart` используется отдельный внутренний overlay `controller.ecosmart_bl2`, который не входит в `connection_layout`.
- При загрузке проверяются версия, устройство в публичном bucket, тип и ID владельца, линия, диапазон слота, занятость и совместимость устройства. Валидное устройство переносится в материализованную линию и удаляется ровно из одного публичного bucket до запуска балансировщиков.
- Устаревшее или повреждённое назначение и отсутствующий модуль игнорируются. Устройство остаётся в публичном массиве и размещается обычным балансировщиком без потери и дублирования.
- Старые схемы без `connection_layout` работают по прежним правилам автоматической балансировки.
- При каждом save поле полностью пересобирается из фактического materialized state; входному старому значению serializer не доверяет. Если валидных назначений нет, serializer удаляет `connection_layout`.
- Специальные линии ECOsmart и существующее распределение 1-wire не входят в `connection_layout` и продолжают обрабатываться своими балансировщиками.

## Монтажная раскладка

Поле `installation_layout` хранит размер щита и вручную закреплённые позиции модулей на DIN-рейках:

```js
installation_layout: {
    version: 1,
    controller_type: 'pro',
    panel: {
        columns: 12,
        rows: 2,
    },
    items: [
        { key: 'controller:pro', column: 0, row: 0 },
        { key: 'ext:io4:id:42', column: 3, row: 1 },
    ],
}
```

- `columns` измеряется в шагах DIN, `rows` — в DIN-рейках.
- `column` и `row` начинаются с нуля.
- В `items` сохраняются вручную перемещённые элементы; остальные позиции восстанавливаются автоматической раскладкой по свободным местам.
- `controller_type` защищает от применения раскладки к другому типу контроллера.
- Старые схемы без `installation_layout` используют автоматическую раскладку.
- Поле хранится внутри `incoming_scheme`; отдельная таблица или миграция БД не требуется.

## Контроллер

```js
controller: 'pro'
```

Допустимые значения:

- `go`
- `go+`
- `smart2`
- `ecosmart`
- `pro`

Контроллер является корневым элементом схемы. От него зависят доступные линии и правила размещения модулей.

## device_type

`device_type` — общий мета-параметр объектов системы.

Поле активно используется как дискриминатор при сериализации и балансировке: `publicSchemeSerializer.js` определяет по нему, в какой публичный bucket (`boilers` / `sensors` / `wired_devices`) вернуть устройство, а `ntcSensorBalancer.js` и `oneWireMaterializer.js` по значению `device_type: 'sensor'` отличают датчики от прочих 1-wire устройств при распределении по модулям `ntc-1-wire`. Помимо этого, поле задумано и для будущих функций автоподбора: система сможет анализировать выбранные пользователем устройства, датчики, термостаты и оборудование, а затем сама определять нужные модули и оптимальный контроллер.

Ожидаемые значения:

| Значение | Что обозначает |
|---|---|
| `module` | Модуль системы: EXT, DI, power, 1-wire модуль |
| `sensor` | Датчик |
| `thermostat` | Термостат |
| `equipment` | Инженерное оборудование: насосы, сервоприводы, прочее оборудование |
| `boiler` | Котёл |

Пример:

```js
{
    id: 10,
    type: 'pressure-sensor',
    device_type: 'sensor',
    connection_type: '4-20',
}
```

Рекомендация: добавлять `device_type` ко всем объектам, которые описывают физическое устройство, модуль, датчик, термостат, котёл или оборудование.

## title

После материализации размещённые в линиях controller/EXT/DI-module устройства получают поле `title` с текстом инфоблока, например:

```js
{
    id: 1781686925635,
    title: 'Дискретная пожарка 1',
    device_type: 'equipment',
    type: 'discrete_fire_alarm',
    connection_type: 'di',
}
```

Если `title` уже пришёл во входных данных, он сохраняется. Legacy-поле `titile` допускается только как fallback для старых/ошибочных данных; новый код должен использовать `title`.

Инфоблоки устройств редактируются на схеме двойным кликом или двойным тапом по тексту инфоблока. Новое значение сохраняется в `title` соответствующего объекта устройства.

## EXT-модули

Актуальный формат:

```js
ext_modules: [
    {
        id: 0,
        type: 'rl6',
        device_type: 'module',
        connection_type: 'EXT',
        one_wire_devices: [],
    },
]
```

Допустимые значения `type`:

- `bl2`
- `rl6`
- `rl6s`
- `io4`
- `di6`

Примечания:

- `rl6` и `rl6s` могут иметь собственные 1-wire линии через поле `one_wire_devices`.
- Фактическое наполнение каналов берётся из общих списков `wired_devices` и `sensors` по `connection_type`.
- Строковый формат вроде `['rl6']` поддерживается только как legacy fallback.
- Новый код должен использовать объектную форму.

## Каналы EXT-модулей

У некоторых EXT-модулей есть собственные канальные линии:

- `io4` — до 4 каналов.
- `di6` — до 6 каналов.

Сейчас эти каналы заполняются не через отдельное поле внутри EXT-модуля, а из общих списков схемы.

Для `io4` могут использоваться:

- дискретные устройства из `wired_devices` с `connection_type: 'di'`;
- `010pump` из `wired_devices` с `connection_type: 'di'`;
- датчики протечки из `sensors` с `type: 'leak-sensor'` и `connection_type: 'di'`;
- датчики давления из `sensors` с `connection_type: '4-20'`;
- NTC-датчики из `sensors` с `connection_type: 'ntc'`.

Пример:

```js
wired_devices: [
    { id: 10, type: 'discrete_pool', device_type: 'equipment', connection_type: 'di' },
    { id: 11, type: '010pump', device_type: 'equipment', connection_type: 'di' },
]

sensors: [
    { id: 20, type: 'pressure-sensor', device_type: 'sensor', connection_type: '4-20' },
    { id: 21, type: 'ntc-sensor', device_type: 'sensor', connection_type: 'ntc' },
    { id: 13, type: 'leak-sensor', device_type: 'sensor', connection_type: 'di' },
]
```

Для `ecosmart` первый `leak-sensor` из публичного `sensors` распределяется во внутреннюю controller-линию `leak_sensor_line` (`controller.leak_sensor_devices[0]`) только для отрисовки. Эта линия не должна сохраняться в публичном `incomingScheme`; при сериализации датчик возвращается в `sensors`.

NTC-датчики из `sensors` с `type: 'ntc-sensor'` и `connection_type: 'ntc'` после первичной балансировки распределяются между модулями `ntc-1-wire` и сохраняются внутри этих модулей в полях `ntc1_devices` и `ntc2_devices`.

## Хранение 1-wire устройств

В сыром входе legacy 1-wire устройства могут находиться в поле:

```js
one_wire_modules: [
    { id: 1, type: 'rdt', device_type: 'module', connection_type: '1-wire' },
    { id: 2, type: 'ntc-1-wire', device_type: 'module', connection_type: '1-wire' },
]
```

После первичной балансировки приложение материализует размещение 1-wire устройств в:

```js
controller: {
    type: 'pro',
    one_wire_devices: [
        { id: 1, type: 'rdt2', device_type: 'module', connection_type: '1-wire' },
    ],
}
```

и в 1-wire линии EXT-модулей:

```js
ext_modules: [
    {
        id: 0,
        type: 'rl6',
        connection_type: 'EXT',
        one_wire_devices: [
            {
                id: 2,
                type: 'ntc-1-wire',
                device_type: 'module',
                connection_type: '1-wire',
                ntc1_devices: [
                    { id: 21, type: 'ntc-sensor', device_type: 'sensor', connection_type: 'ntc' },
                ],
                ntc2_devices: [],
            },
        ],
    },
]
```

После такой материализации:

```js
one_wire_modules: []
```

Назначенные в `ntc-1-wire` NTC-датчики удаляются из верхнего поля `sensors`, чтобы не дублироваться в канальных линиях.

## Типы 1-wire устройств

Поддерживаемые типы 1-wire устройств для линии контроллера и EXT-линий:

| Тип | Название / пояснение |
|---|---|
| `thermostat` | Проводной термостат |
| `flask-sensor` | Лишний тип, не использовать в новых данных |
| `flask-sensor-stupid-boiler` | Датчик простого котла |
| `flask-sensor-gvs-boiler` | Датчик бойлера |
| `flask-sensor-strategy` | Датчик стратегии котлов |
| `flask-sensor-mixing-unit` | Датчик смесительного узла |
| `flask-sensor-floor` | Датчик пола |
| `flask-sensor-temperature` | Цифровой датчик температуры в колбе |
| `wall-temperature-sensor` | Цифровой настенный датчик |
| `ntc-1-wire` | NTC 1 Wire модуль |
| `rdt2` | Радио модуль |

Alias:

- `rdt` -> `rdt2`

Connection type для специальных flask-датчиков:

- `flask-sensor-gvs-boiler`: `connection_type='1-wire|ntc'`; для `ecosmart` подключается как NTC, для остальных контроллеров как 1-wire.
- `flask-sensor-strategy`: `connection_type='1-wire|ntc'`; для `ecosmart` подключается как NTC, для остальных контроллеров как 1-wire.

Для `ecosmart` эти датчики из публичного `sensors` материализуются во внутренние линии `controller.strategy_sensor_devices` и `controller.boiler_sensor_devices`. Эти поля не должны присутствовать в публичном `incomingScheme`; при отображении JSON и сохранении они сериализуются обратно в `sensors` с `connection_type='1-wire|ntc'`.

## Беспроводные устройства

```js
wireless_devices: [
    {
        id: 0,
        type: 'thermostat',
        device_type: 'thermostat',
        color: 'black',
        additions: [],
    },
]
```

Поддерживаемые значения `type`:

- `thermostat`
- `outdoor-temperature-sensor`
- `wall-temperature-sensor`

Цвета термостата:

- `black`
- `white`
- `gray`

Если цвет термостата отсутствует или неизвестен, используется `black`.

## Проводные устройства

```js
wired_devices: [
    {
        id: 0,
        type: 'thermostat',
        device_type: 'thermostat',
        connection_type: '1-wire',
        color: 'black',
        additions: [],
    },
    {
        id: 1,
        device_type: 'equipment',
        type: 'valve',
        connection_type: 'double_relay',
        additions: [],
    },
    {
        id: 2,
        device_type: 'equipment',
        type: 'zoneServo',
        connection_type: 'relay',
        additions: [],
    },
]
```

Основные значения `connection_type`:

- `1-wire`
- `relay`
- `relay|relay-s`
- `double_relay`
- `di`
- `ai`
- `modbus`

Во время первичной материализации 1-wire устройства с `connection_type: '1-wire'` переносятся в `controller.one_wire_devices` или `ext_modules[n].one_wire_devices`.

`valve` с `connection_type: 'double_relay'` занимает два соседних relay-порта и переносится из `wired_devices` в подходящую relay / relay-s линию при балансировке.

`zoneServo` с `connection_type: 'relay'` занимает один relay-порт контроллера или модулей `rl6`, `rl6s`, `rl2`, `rl2s`.

Для `ecosmart` некоторые wired-устройства материализуются во внутренние controller-линии только для отрисовки: `controller['220_servo_devices']`, `controller.relay_s_valve_devices`, `controller.relay_boiler_gvs_devices`, `controller.relay_220pump_devices`, `controller.relay_220pump5_devices`, `controller.relay_220pump3_devices`. Эти поля не являются частью публичного `incomingScheme`; при отображении JSON и сохранении устройства возвращаются в `wired_devices`.

## Датчики

```js
sensors: [
    { id: 4, type: 'pressure-sensor', device_type: 'sensor', connection_type: '4-20' },
]
```

Основные типы подключения датчиков:

- `1-wire`
- `ntc`
- `4-20`
- `ai`

Во время первичной материализации датчики с `connection_type: '1-wire'` переносятся в сбалансированное 1-wire хранилище.

Для `ecosmart` вложенные `mixing-ntc-sensor` из `220servo.additions` материализуются во внутреннюю линию `controller.mixing_ntc_devices` только для отрисовки. Эта линия не должна попадать в публичный `incomingScheme`; при сериализации датчики возвращаются в `sensors`, а исходные wired-устройства остаются в `wired_devices`.

## Внутренние линии `ecosmart`

Следующие поля могут существовать во внутреннем состоянии `scheme` после балансировки, но не должны быть видны в публичном `incomingScheme` даже после распределения:

| Внутреннее поле | Публичный источник при сериализации |
|---|---|
| `controller.ecosmart_bl2` | не сохраняется как линия входа |
| `controller.leak_sensor_devices` | `sensors` |
| `controller.strategy_sensor_devices` | `sensors` |
| `controller.boiler_sensor_devices` | `sensors` |
| `controller.mixing_ntc_devices` | `sensors` |
| `controller['220_servo_devices']` | `wired_devices` |
| `controller.relay_s_valve_devices` | `wired_devices` |
| `controller.relay_boiler_gvs_devices` | `wired_devices` |
| `controller.relay_220pump_devices` | `wired_devices` |
| `controller.relay_220pump5_devices` | `wired_devices` |
| `controller.relay_220pump3_devices` | `wired_devices` |

Отрисовка использует внутреннее состояние после балансировки, поэтому скрытие этих полей из JSON не меняет canvas. При повторной загрузке публичного `incomingScheme` балансировщики снова создают нужные внутренние линии.

Legacy-формат `ecosmart_bl2` в корне схемы читается только при загрузке старой записи и переносится в `controller.ecosmart_bl2`; новый код не должен его создавать.

## DI-модули

```js
di_modules: [
    { id: 0, type: 'rl2s', device_type: 'module', connection_type: 'DI' },
]
```

Поддерживаемые значения `type`:

- `rl2`
- `rl2s`

## Модули питания

```js
power_modules: ['circuit-breaker', 'power-unit']
```

Обязательные модули для `pro` и `smart2`:

- `circuit-breaker`
- `power-unit`

Опциональный модуль:

- `ups`

Если в системе есть `ups`, модуль `battery` отображается автоматически.

Alias:

- `circuitbreaker` -> `circuit-breaker`
- `powerunit` -> `power-unit`

## Котлы

```js
boilers: [
    {
        id: 0,
        type: 'smart',
        device_type: 'boiler',
        name: 'Baxi Slim',
        reserve: false,
        connection_type: 'BUS',
    },
]
```

Известные формы котлов:

- `type: 'smart'`, `connection_type: 'BUS'`
- `type: 'stupid'`, `connection_type: 'RELAY'`

## Правила нормализации

- `rdt` -> `rdt2`
- `220pump` / `pump220v` -> `pump-220v`
- `boilerpump` / `boiler-pump` -> `boiler-pump`
- `pressuresensor` -> `pressure-sensor`
- `random_signal` -> `discrete_signal`
- `ventilation` -> `discrete_ventilation`
- `zoneservo` / `zone-servo` -> `zoneServo`
- `circuitbreaker` -> `circuit-breaker`
- `powerunit` -> `power-unit`

`circuit-breaker`/`power-unit` нормализуются отдельно от остальных алиасов (в логике `power_modules`, а не в общей функции канонизации типа устройства), но результат для входных данных совпадает с таблицей выше.

## Минимальный пример

```js
const incomingScheme = {
    id: 0,
    controller: 'pro',
    boilers: [],
    wireless_devices: [],
    wired_devices: [],
    sensors: [],
    ext_modules: [
        { id: 0, type: 'rl6', device_type: 'module', connection_type: 'EXT' },
        { id: 1, type: 'rl6s', device_type: 'module', connection_type: 'EXT' },
    ],
    di_modules: [],
    one_wire_modules: [
        { id: 10, type: 'rdt', device_type: 'module', connection_type: '1-wire' },
        { id: 11, type: 'ntc-1-wire', device_type: 'module', connection_type: '1-wire' },
    ],
    power_modules: ['circuit-breaker', 'power-unit'],
    wifi_modules: [],
};
```

После первичной материализации 1-wire устройств поле `one_wire_modules` становится пустым, а устройства распределяются в `controller.one_wire_devices` и `ext_modules[n].one_wire_devices`.

`controller_one_wire_devices` больше не используется как актуальное хранилище. Если старый вход содержит это поле, оно может быть прочитано как legacy fallback, но новый код должен использовать `controller.one_wire_devices`.
