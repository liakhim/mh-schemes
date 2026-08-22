# Selection Config

`schemes.selection_config` хранит неизменяемый снимок страницы подбора на момент создания схемы. Поле не является частью `incoming_scheme`: текущую схему можно редактировать и сохранять без изменения исходного подбора.

## Contract

```json
{
  "schema": "mh.selection-config",
  "version": 1,
  "created_at": "2026-07-24T12:30:00.000Z",
  "source": {
    "page": "selection",
    "draft_version": 1
  },
  "intent": {
    "requested_controller_type": "go",
    "resolved_controller_type": "go+",
    "controller_selection_source": "automatic",
    "ups_requested": true,
    "ups_request_source": "manual",
    "leak_zone_count": 2,
    "leak_valve_count": 3
  },
  "editor": {},
  "selection_state": {}
}
```

- `selection_state` содержит нормализованный state `/selection` с `id_schema_version: 2`.
- `requested_controller_type` сохраняет выбор пользователя до автоматического согласования совместимости.
- `resolved_controller_type` содержит контроллер, с которым была создана схема.
- `leak_zone_count` содержит число независимых шлейфов датчиков протечки, а `leak_valve_count` - общее число независимых запорных клапанов.
- `editor` хранит настройки карточек добавления оборудования, но не временное UI-состояние. В version 1 сохраняются `thermostat_connection`, цвета и датчики пола проводного/беспроводного термостата, `mixing_connection_mode`, `mixing_servo`, `mixing_sensor`, `pump_connection_mode`, `pump_type`, `zone_connection_mode`, `other_equipment_connection_mode`, ключи проводного/беспроводного датчика температуры и `temperature_sensor_connection`.
- Котлы из интеграции могут содержать `catalog_ref` с `source`, `catalog_id` и `bus_type`.
- `POST /api/schemes` принимает снимок. Обычный `PATCH /api/schemes/{id}` его игнорирует.
- Копия схемы наследует снимок исходного подбора.
- Для схем, созданных до появления контракта, значение равно `null`, и кнопка просмотра не отображается.

## UI

На странице схемы кнопка `Исходный подбор` открывает read-only резюме и технический JSON. Окно явно сообщает, что текущая схема могла быть изменена после создания.
