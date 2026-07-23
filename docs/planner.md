# 3D-планировщик (`/planner`)

Редактор 3D-модели квартиры/дома для размещения оборудования MyHeat и расчёта проводки
до щитка. Отдельное React-приложение на Three.js, живёт рядом с существующими SPA
(`spa`, `selection`, `learning`, `admin`).

## Стек

- **Three.js** + **@react-three/fiber** (R3F v9, React 19) — 3D-сцена
- **@react-three/drei** — `OrbitControls`, `Grid`, `GizmoHelper`, `Line`
- **zustand** — стор редактора (в отличие от монолитного `spa.jsx` на `useState`)
- Единая сцена с переключением камеры: перспектива ↔ вид сверху

## Точки входа

- Маршруты: `/planner`, `/planner/{scheme}` (`routes/web.php`)
- Blade: `resources/views/planner.blade.php`
- JS entry: `resources/js/planner.jsx` → `resources/js/planner/PlannerApp.jsx`
- Стили: `resources/css/planner.css`
- Vite input: добавлено в `vite.config.js`

## Структура кода

```
resources/js/planner/
  PlannerApp.jsx              корневой компонент, хоткеи, инициализация
  store/usePlannerStore.js    zustand: уровни, стены, инструмент, камера, сохранение
  domain/floorPlan.js         фабрики модели плана, нормализация, константы (метры)
  domain/geometry.js          гео-хелперы (длина/угол/трансформ стены/снап)
  persistence/storage.js      localStorage + PATCH /api/schemes/{id}
  scene/Scene.jsx             R3F <Canvas>, свет, контролы, гизмо
  scene/CameraController.jsx  перспектива ↔ вид сверху
  scene/GroundPlane.jsx       сетка + плоскость-приёмник кликов (черчение)
  scene/Levels.jsx            рендер стен всех уровней (активный + призраки)
  scene/WallMesh.jsx          одна стена как ориентированный box
  scene/DraftPreview.jsx      резиновая линия при черчении
  ui/Toolbar.jsx              инструменты, камера, снап, сохранение
  ui/LevelPanel.jsx           этажи: добавить/переключить/удалить/высота
  ui/PropertiesPanel.jsx      статистика + правка выбранной стены
  ui/HelpHint.jsx             подсказка режима черчения
```

## Модель данных

Хранится в новой JSON-колонке `schemes.floor_plan` (миграция
`2026_07_23_000000_add_floor_plan_to_schemes.php`), отдельно от `incoming_scheme`,
чтобы контракт проводки не менялся. Координаты — в метрах (1 юнит сцены = 1 метр).

```js
floor_plan = {
  version: 1,
  units: 'm',
  levels: [{ id, name, elevation, height,
             walls: [{ id, a:{x,y}, b:{x,y}, thickness, height }],
             openings: [], rooms: [] }],
  panel: null,                 // щиток — точка назначения кабелей (этап 3)
  placements: [],              // размещённое оборудование (этап 2)
  routing: { strategy: 'manual', reservePct: 10, routes: [] }, // трассы (этап 3)
}
```

Плоская точка `{x, y}` на полу → мировые координаты `(x, elevation, y)`
(plan-Y → world-Z, world-Y — высота).

## Сделано (Этап 0+1)

- Каркас: маршрут, entry, Blade, зависимости, R3F-сцена, сетка, гизмо, свет
- Камера: перспектива ↔ вид сверху
- Черчение стен цепочкой (ЛКМ — точка, ПКМ/Esc — завершить), привязка к сетке 0.1 м
- Экструзия стен в 3D (высота/толщина)
- Многоэтажность: добавление/переключение/удаление этажей, стек по отметкам,
  соседние уровни показаны призраками
- Выбор и правка стены (высота/толщина/удаление), статистика длины
- Сохранение: localStorage-автосейв + `PATCH /api/schemes/{id}` (`floor_plan`)
- Тема MyHeat (белый/оранжевый/чёрный): стены с чёрными рёбрами, оранжевое выделение;
  переключатель фона сцены белый ↔ тёмный (`resources/js/planner/domain/theme.js`)

## Дорожная карта

- **Этап 2 — размещение оборудования**: палитра устройств из `incoming_scheme`
  привязанной схемы + щиток; drag-drop в комнаты, высота монтажа, поворот.
- **Этап 3 — прокладка кабеля и расчёт**: ручная прокладка трасс устройство→щиток,
  подсчёт длины и количества по типам (`connection_type` → `CABLE_SPEC`), панель BOM.
- **Этап 4 — полировка**: двери/окна, комнаты, экспорт PDF/CSV (переиспользуя `jspdf`),
  3D-модели устройств (GLTF), связка с `selection`/`scheme`.

## Как запустить

```bash
docker compose up --build          # приложение на http://localhost:8099/planner
# или локально:
npm install && npm run dev         # Vite dev-сервер (HMR)
php artisan migrate                # применить миграцию floor_plan
```

Планировщик работает и без привязки к схеме (черновик в localStorage);
при открытии `/planner/{id}` данные читаются/пишутся в `floor_plan` этой схемы.
