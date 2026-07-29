// Справочная таблица сопоставления действий/кнопок между двумя страницами подбора оборудования:
//   - локальная:  http://localhost:8099/selection      (resources/js/selection.jsx, SelectionApp)
//   - внешняя:    https://mhtest.ru/podbor-oborudovaniya (production MyHeat)
//
// Это НЕ тест — файл не запускается Playwright-раннером (нет test.describe/test),
// а служит справочником для написания будущих тестов и для ручного сравнения
// поведения двух реализаций одной и той же формы подбора оборудования.
//
// Собрано вручную через браузер (Chrome DevTools/MCP) 2026-07-27. Если разметка
// одной из сторон изменится, таблицу нужно сверить заново — она не проверяется
// автоматически.
//
// Источник истины "что MyHeat реально продаёт": объект MYHEAT_PRICES в
// resources/js/selection.jsx (~line 2740) + сборка секций КП в getOfferSections
// (~line 2646-2735). Позиция считается продаваемой MyHeat, только если код
// реально проставляет ей unitPrice из MYHEAT_PRICES; всё остальное — сторонняя
// инженерная арматура (насосы, сервоприводы, клапаны, датчик протечки,
// дискретные входы), которую MyHeat не продаёт, а только поддерживает
// подключение к контроллеру. Поле soldByMyHeat ниже взято из этого объекта,
// а не из догадок/комментариев тестов — при расхождении с реальным кодом
// MYHEAT_PRICES является приоритетным источником, эту таблицу нужно поправить.
//
// Поля записи:
//   section       — номер/название блока на локальной странице (навигация 1..8)
//   local         — как найти элемент локально; testId соответствует data-test-id
//                   в resources/js/selection.jsx, если он уже проставлен
//   live          — как найти/описать эквивалент на mhtest.ru; present:false значит
//                   что прямого аналога на странице нет
//   soldByMyHeat  — true (есть unitPrice в MYHEAT_PRICES), false (позиция всегда
//                   без цены/выключена), 'mixed' (зависит от конкретного варианта,
//                   см. note), либо omitted если позиция — не физическое
//                   MyHeat-оборудование (кнопки интерфейса, поиск котла и т.д.)
//   note          — расхождения в гранулярности, названиях, возможностях или
//                   статусе "продаётся ли MyHeat"

// Сводка по MYHEAT_PRICES (resources/js/selection.jsx) — что продаётся, что нет.
export const MYHEAT_SOLD_SUMMARY = {
    sold: [
        'controllers: go, go+, smart2, pro, ecosmart',
        'modules: rl2, rl2s, rl6, rl6s, rdt2, di6, io4, ntc-1-wire, bl2, ecosmartbl2',
        'radioModuleActivation (доплата за активацию радиомодуля на go)',
        'temperatureSensors: wireless-outdoor, wireless-wall, wired-wall-digital, wired-flask-digital, wired-flask-ntc, wired-flask-floor',
        'pressureSensor (токовый датчик давления 4-20мА)',
        'thermostat (единая цена для проводного/беспроводного, любого цвета)',
        'ups',
        'rinnai-adapter (переходник Rinnai, отдельная константа RINNAI_ADAPTER_PRICE, не в MYHEAT_PRICES, но тоже реальная цена)',
    ],
    notSold: [
        'mixing units — сервоприводы 220V/0-10V + цифровой/NTC датчик (все комбинации)',
        'gvs boiler pump — сам насос бойлера ГВС (но датчик flask-sensor-gvs-boiler при этом продаётся, см. temperatureSensors)',
        'pumps — Насос 220V, Насос 0-10V',
        'zoneServo — Зона',
        'otherEquipment — Прочее оборудование',
        'wired-wall-ntc — Настенный NTC-датчик температуры: ключа нет в MYHEAT_PRICES.temperatureSensors, И в TEMPERATURE_SENSOR_TEMPLATES эта карточка явно помечена disabled: true (resources/js/selection.jsx:1839) — то есть локально она не просто "без цены", а намеренно недоступна для добавления',
        'leakSensor — Датчик защиты от протечки (явно null в MYHEAT_PRICES)',
        'valve — Запорный клапан (double_relay)',
        'discrete inputs — бассейн, вентиляция, ОПС, произвольный сигнал',
        'boilers — сами котлы (сторонний бренд, никогда unitPrice не проставляется)',
    ],
};

export const SELECTION_BUTTON_MAP = [
    // --- Шапка / общие действия ---
    {
        section: '0. Общие действия',
        local: { testId: 'reset-equipment', description: 'Кнопка "Сбросить схему" — открывает confirm-диалог' },
        live: { description: 'Кнопка "Сбросить" внизу формы — сбрасывает без подтверждения (проверить на живом сайте)' },
        note: 'Локально сброс двухшаговый (confirm-диалог с data-test-id="reset-equipment-confirm"), на mhtest.ru — предположительно однократный клик.',
    },
    {
        section: '0. Общие действия',
        local: { testId: null, description: 'Кнопка "Построить схему" (нет data-test-id)' },
        live: { description: 'Кнопка "Подобрать оборудование" внизу формы' },
        note: 'Семантика совпадает (финальный submit подбора). Локальной кнопке стоит добавить data-test-id, аналогично остальным.',
    },
    {
        section: '0. Общие действия',
        local: { testId: 'open-commercial-offer', description: 'Чекбокс + кнопка "Коммерческое предложение" — открывает модалку КП с ценами MyHeat (источник цен — MYHEAT_PRICES)' },
        live: { present: false, description: 'На самой странице подбора кнопки/модалки КП не найдено' },
        note: 'Вероятно, КП формируется на следующей странице/в кабинете после "Подобрать оборудование" — прямого аналога на этой странице нет.',
    },

    // --- Контроллер (липкая панель справа, отдельного раздела в контенте нет) ---
    {
        section: 'Контроллер',
        local: { testId: 'controller-card-{go|go+|smart2|pro|ecosmart}', description: '5 кликабельных карточек ручного выбора контроллера в липкой панели «Подобранный контроллер» справа от контента, data-active отражает текущий выбор' },
        live: { present: false, description: 'Раздела ручного выбора контроллера на странице нет' },
        soldByMyHeat: true,
        note: 'Ключевое архитектурное расхождение: локально пользователь МОЖЕТ вручную зафиксировать контроллер; на mhtest.ru контроллер только подбирается автоматически по введённому оборудованию и отображается как результат (не как ввод). Все 5 контроллеров продаются MyHeat (MYHEAT_PRICES.controllers).',
    },

    // --- 2. Котлы ---
    {
        section: '2. Котлы',
        local: [
            { testId: null, description: 'Поле поиска котла по названию (autocomplete), без явной кнопки "Добавить"' },
            { testId: 'boiler-brand-{baxi|ariston|arderia|rinnai|zota}', description: 'Быстрые теги брендов над полем поиска: подставляют бренд в запрос, повторный клик по активному тегу очищает его' },
        ],
        live: { description: 'Поле "Введите название котла" (autocomplete) + кнопка "+" рядом' },
        soldByMyHeat: false,
        note: 'Совпадает по смыслу. Котлы — сторонний бренд, unitPrice для них никогда не проставляется (см. getOfferSections, секция "Котлы"). Переходник Rinnai (RINNAI_ADAPTER_PRICE) при этом продаётся отдельно. У live есть переключатель "резерв" рядом с полем — проверить, что у локальной версии он тоже есть (не заносился в выборку кнопок).',
    },

    // --- 3. Гидравлика ---
    {
        section: '3. Гидравлика — Смесительные узлы',
        local: [
            { testId: null, title: 'Сервопривод 220V с цифровым датчиком', description: 'Отдельная карточка с кнопкой "Добавить"' },
            { testId: null, title: 'Сервопривод 220V с NTC-датчиком', description: 'Отдельная карточка с кнопкой "Добавить"' },
            { testId: null, title: 'Сервопривод 0-10V с NTC-датчиком', description: 'Отдельная карточка с кнопкой "Добавить"' },
        ],
        live: {
            description: 'Один "+" открывает модалку "Добавление смесительного узла" с двумя select: "Выберите тип привода" (220V/0-10V) и "Выберите тип датчика" (цифровой/NTC), затем "Добавить"',
        },
        soldByMyHeat: false,
        note: 'Ни один из вариантов смесительного узла не продаётся MyHeat (mixingRows в getOfferSections никогда не получают unitPrice) — это сторонняя арматура. Гранулярность разная: локально 3 фиксированные карточки-комбинации, на live — универсальная модалка 2 select (потенциально до 4 комбинаций). Нужно проверить, разрешает ли live-модалка комбинацию "0-10V + цифровой", которой нет среди локальных карточек.',
    },
    {
        section: '3. Гидравлика — Бойлер ГВС',
        local: { testId: 'add-gvs-boiler', title: 'Бойлер ГВС' },
        live: { description: 'Счётчик "Количество бойлеров" (+/-) под заголовком "Бойлер ГВС"' },
        soldByMyHeat: false,
        note: 'Прямое соответствие 1:1. Сам насос бойлера ГВС (boilerPump) не продаётся MyHeat (gvsRows без unitPrice), НО добавляемый вместе с ним датчик flask-sensor-gvs-boiler продаётся отдельно и попадает в секцию "Датчики температуры" КП с реальной ценой (см. temperatureSensors.wired-flask-digital, 1450 ₽).',
    },
    {
        section: '3. Гидравлика — Насосы',
        local: [
            { testId: null, title: 'Насос 220V', description: 'Карточка с кнопкой "Добавить"' },
            { testId: null, title: 'Насос 0-10V', description: 'Карточка с кнопкой "Добавить"' },
        ],
        live: { description: 'Два счётчика (+/-) под заголовком "Насосы": "Количество насосов 220V" и "Количество насосов 0-10V"' },
        soldByMyHeat: false,
        note: 'Прямое соответствие 1:1 по обеим карточкам, но локально это отдельные "Добавить"-кнопки без data-test-id. Насосы — сторонняя арматура, pumpRows в КП никогда не получают unitPrice.',
    },

    // --- 4. Климат ---
    {
        section: '4. Климат — Зоны',
        local: { testId: 'add-zone', title: 'Зона' },
        live: { description: 'Счётчик "Количество зон" (+/-) под заголовком "Зоны"' },
        soldByMyHeat: false,
        note: 'Прямое соответствие 1:1. zoneServo не продаётся MyHeat (zoneRows без unitPrice) — это сторонний привод зоны, MyHeat поставляет только модуль управления (RL2/RL2S), который тарифицируется отдельно как "Модули расширения".',
    },
    {
        section: 'Климат — Термостаты (одна карточка с выбором типа)',
        local: [
            { testId: 'thermostat-connection-{wired|wireless}', description: 'Одна карточка термостата: переключатель типа "Проводной"/"Беспроводной", кнопки цвета "Черный"/"Белый"/"Серый" и кнопка "Добавить термостат"' },
        ],
        live: {
            description: '"+" у "Термостат" открывает модалку "Добавление нового термостата": select "Выберите тип термостата" (Проводной/Беспроводной), select "Выберите цвет термостата", toggle "Датчик пола", кнопка "Добавить"',
        },
        soldByMyHeat: true,
        note: 'Смысл совпадает (тип подключения + цвет + опция датчика пола = local additions floor sensor). Термостат продаётся MyHeat по единой цене (MYHEAT_PRICES.thermostat = 9490 ₽) независимо от цвета и от проводной/беспроводной версии. Локально это две параллельные секции (wireless/wired) с раздельными кнопками цвета без data-test-id; на live — один универсальный модальный диалог.\n' +
            'ИСПРАВЛЕНО (2026-07-27): опция "Добавить датчик пола" (flask-sensor-floor) раньше маппилась на тот же templateKey, что и обычный "Датчик температуры в колбе" (wired-flask-digital, 1450 ₽, код 6286) — в т.ч. могла "бесплатно" закрываться комплектным датчиком контроллера PRO. Это физически неверно: комплектный датчик (короткий провод) нельзя использовать как датчик пола. На mhtest.ru для этого отдельная позиция — "Датчик температуры в колбе MyHeat (3 метра)", код 6304, 3690 ₽ (/products/sensors/datchik-flasksensor-3-m), явно промаркированная "оптимальное решение для использования с термостатом MyHeat". Код поправлен: добавлен ключ MYHEAT_PRICES.temperatureSensors.wired-flask-floor = 3690, getKitTemperatureSensorTemplateKey больше не группирует flask-sensor-floor/floor-sensor с обычными flask-сенсорами, и он никогда не входит ни в один CONTROLLER_KIT_TEMPERATURE_DEVICES — то есть всегда платный.',
    },

    // --- 5. Прочее оборудование ---
    {
        section: '5. Прочее оборудование',
        local: { testId: 'add-other-equipment', title: 'Прочее оборудование' },
        live: { description: 'Счётчик "Количество прочего оборудования" (+/-)' },
        soldByMyHeat: false,
        note: 'Прямое соответствие 1:1. otherEquipment не продаётся MyHeat (otherRows без unitPrice) — генерическая сторонняя нагрузка на реле (сирены и т.п.).',
    },
    {
        section: '5. Прочее — Беспроводной уличный/настенный датчик температуры',
        local: [
            { testId: 'outdoor-sensor-toggle', description: 'Уличный датчик — отдельная карточка с тумблером (вкл/выкл, ровно 1 шт), кнопки "Добавить" и счётчика нет' },
            { testId: 'temperature-sensor-connection-wireless', description: 'Настенный беспроводной датчик добавляется из общей карточки "Датчики температуры": тумблер "Беспроводной" + "Добавить датчик"' },
        ],
        live: { description: 'Простой toggle "Беспроводной уличный датчик температуры" (вкл/выкл, без выбора типа)' },
        soldByMyHeat: true,
        note: 'Оба беспроводных датчика продаются MyHeat: wireless-outdoor 5890 ₽, wireless-wall 4190 ₽ (MYHEAT_PRICES.temperatureSensors). По уличному датчику локальная страница теперь совпадает с live: бинарный тумблер вместо счётчика. Настенный беспроводной датчик на live, скорее всего, вынесен в общую модалку "Термостат"/"Датчики температуры"; нужно перепроверить при написании теста, а не считать его отсутствующим.',
    },

    // --- 6. Датчики и защита ---
    {
        section: '6. Датчики и защита — Датчики температуры (общая карточка)',
        local: [
            { testId: 'temperature-sensor-connection-wired|-wireless', description: 'Тумблер "Проводной / Беспроводной"' },
            { testId: 'temperature-sensor-placement-wall|-flask', description: 'Тумблер "Настенный / В колбе"; "В колбе" гаснет для беспроводного' },
            { testId: 'temperature-sensor-kind-digital|-ntc', description: 'Тумблер "Цифровой / NTC", только для проводного; NTC гаснет для настенного' },
            { testId: 'add-temperature-sensor', description: 'Кнопка "Добавить датчик" добавляет выбранную комбинацию' },
        ],
        combinations: [
            { title: 'Настенный цифровой датчик', templateKey: 'wired-wall-digital', soldByMyHeat: true, price: 1650 },
            { title: 'Цифровой датчик в колбе', templateKey: 'wired-flask-digital', soldByMyHeat: true, price: 1450 },
            { title: 'NTC-датчик в колбе', templateKey: 'wired-flask-ntc', soldByMyHeat: true, price: 3190 },
            { title: 'Настенный NTC-датчик', templateKey: 'wired-wall-ntc', soldByMyHeat: false, disabledLocally: true },
            { title: 'Беспроводной настенный датчик', templateKey: 'wireless-wall', soldByMyHeat: true, price: 4190 },
        ],
        live: {
            description: '"+" у "Датчики температуры" открывает модалку с select "Тип подключения", select "Тип монтажа", select "Тип датчика", кнопка "Добавить"',
        },
        soldByMyHeat: 'mixed',
        note: 'Проводные и беспроводные датчики объединены в одну карточку с тремя тумблерами — структура совпала с live-модалкой (3 select). Недоступные комбинации гасятся: беспроводного "в колбе" не существует, а "Настенный NTC-датчик" (wired-wall-ntc) помечен disabled: true в TEMPERATURE_SENSOR_TEMPLATES и не имеет цены в MYHEAT_PRICES.temperatureSensors. Уличный датчик в этой карточке не участвует — у него отдельный тумблер outdoor-sensor-toggle.',
    },
    {
        section: '6. Датчики и защита — Контроль протечки воды',
        local: { testId: 'add-leak-sensor', title: 'Датчик защиты от протечки' },
        live: { description: 'Секция "Контроль протечки воды", счётчик "Проводной датчик защиты от протечки" (+/-)' },
        soldByMyHeat: false,
        note: 'Прямое соответствие 1:1, разное название секции/подписи ("Датчик защиты от протечки" локально vs "Проводной датчик защиты от протечки" на live). MYHEAT_PRICES.leakSensor = null (явно закомментировано в коде: "пока не продается MyHeat").',
    },
    {
        section: '6. Датчики и защита — Запорный клапан',
        local: { testId: 'add-valve', title: 'Запорный клапан' },
        live: { description: 'Секция "Единый шлейф", счётчик "Запорный кран (220В/12В)" (+/-)' },
        soldByMyHeat: false,
        note: 'То же оборудование (double_relay), разные названия ("клапан" vs "кран"). Не продаётся MyHeat (leakRows: unitPrice только для строки "Датчик протечки", клапан всегда null). На live рядом есть toggle "Единый шлейф" — локального аналога такого переключателя не найдено; нужно уточнить, что именно он переключает (топология проводки датчиков протечки) и есть ли это в incomingScheme.',
    },
    {
        section: '6. Датчики и защита — Токовый датчик давления',
        local: { testId: 'add-pressure-sensor', title: 'Токовый датчик давления' },
        live: { description: 'Счётчик "Датчик 4-20мА" под заголовком "Токовый датчик давления"' },
        soldByMyHeat: true,
        note: 'Прямое соответствие 1:1, заголовки идентичны. Продаётся MyHeat: MYHEAT_PRICES.pressureSensor = 5990 ₽. Карточка широкая, как у зон: после первого добавления кнопка скрывается, количество набирается через pressure-sensor-qty-inc / -dec.',
    },

    // --- 7. Прочее (дискретные входы) ---
    {
        section: '7. Прочее — Дискретные входы',
        local: [
            { testId: null, title: 'Запрос тепла от бассейна' },
            { testId: null, title: 'Запрос тепла от вентиляции' },
            { testId: null, title: 'Датчик ОПС' },
            { testId: null, title: 'Произвольный сигнал' },
        ],
        live: { description: '"+" у "Дискретные входы" открывает модалку с одним select "Выберите датчик" + кнопка "Добавить"' },
        soldByMyHeat: false,
        note: 'Ни один из 4 вариантов не продаётся MyHeat (discreteDevices в getOfferSections собираются в aggregateAddedItems без unitPrice вовсе) — это сторонние сухие контакты/сигналы, MyHeat продаёт только модуль DI (DI6/IO4), учитываемый отдельно как "Модули расширения". Скорее всего 4 варианта select на live совпадают с 4 локальными карточками — не проверено поштучно, свериться со списком опций select при написании теста.',
    },

    // --- 8. Питание ---
    {
        section: '8. Питание — ИБП',
        local: { testId: 'ups-toggle', description: 'Toggle "Сменить контроллер с Go на Go+ (имеет встроенный ИБП)" (текст зависит от текущего контроллера)' },
        live: { description: 'Toggle "Источник бесперебойного питания"' },
        soldByMyHeat: true,
        note: 'Прямое соответствие 1:1, продаётся MyHeat (MYHEAT_PRICES.ups = 9990 ₽). Формулировка локального toggle привязана к конкретному контроллеру (Go->Go+), а не к устройству UPS напрямую — при смене выбранного контроллера текст меняется.',
    },
    {
        section: '8. Питание — Доп. блок питания',
        local: { present: false },
        live: { description: 'Секция "Дополнительный блок питания", счётчик "Количество блоков питания" (+/-)' },
        soldByMyHeat: null,
        note: 'На локальной странице /selection аналога не найдено, и в MYHEAT_PRICES тоже нет соответствующего ключа (power-unit/circuit-breaker учитываются иначе, как power_modules) — статус "продаётся ли MyHeat" по коду не определить, это либо пробел функциональности, либо позиция считается частью power_modules и не выставляется вручную.',
    },
];

export default SELECTION_BUTTON_MAP;
