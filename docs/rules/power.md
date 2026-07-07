# Power Rules

Краткая версия power-правил. Полный источник: `JOURNAL.md`, раздел `Power линия`.

## TL;DR

- Power-линия есть только у `pro` и `smart2`.
- Источник: `incomingScheme.power_modules`.
- Обязательные модули: `circuit-breaker`, `power-unit`.
- Порядок: `circuit-breaker` всегда левее `power-unit`.
- Optional: `ups`.
- Если есть `ups`, `battery` отображается всегда.

## Placement

- Базовый зазор между элементами: `4 * indent`.
- `battery` располагается прямо под `ups`.
- `battery` Y-offset: `10 * indent` ниже нижней линии `ups`.

## Links

- `circuit-breaker:L-OUT` -> `power-unit:L-IN`, бордовый, вынос вниз `1 * indent`.
- Если `ups` есть:
- `ups:12VDC-OUT-V+` -> `controller:12VDC-IN-V+`, red.
- `ups:12VDC-OUT-GND` -> `controller:12VDC-IN-GND`, black.
- `ups:DI-OUT-1` -> `controller:DI-IN-1`, blue.
- `ups:DI-OUT-2` -> `controller:DI-IN-2`, blue.
- `power-unit:12VDC-OUT-*` -> `ups:12VDC-IN-*`, вынос вверх.
- Если `ups` нет, `power-unit` подключается напрямую к controller `12VDC-IN-*` по специальной многошаговой трассировке.
- Для `smart2` с DI-модулями без `ups`, `power-unit:12VDC-OUT-*` подключается к `12VDC-IN-*` последнего DI-модуля, а позиция цели учитывает дополнительные отступы `rl2`/`rl2s`.

## Unconnected Power Ports

- `power-unit:N`: вертикальная линия вниз на `2 * indent`, подпись `N` под концом.
- `circuit-breaker:L-IN`: вертикальная линия вверх на `2 * indent`, подпись `L` над концом.
