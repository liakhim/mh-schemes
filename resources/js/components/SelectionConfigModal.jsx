import React from 'react';

const CONTROLLER_LABELS = {
    go: 'GO',
    'go+': 'GO+',
    smart2: 'Smart2',
    pro: 'PRO',
    ecosmart: 'ECOsmart',
};

const SOURCE_LABELS = {
    automatic: 'Подобран автоматически',
    manual: 'Выбран вручную',
    default: 'Начальный вариант',
};

const SECTIONS = [
    ['boilers', 'Котлы'],
    ['wired_devices', 'Проводное оборудование'],
    ['wireless_devices', 'Беспроводное оборудование'],
    ['sensors', 'Датчики'],
    ['ext_modules', 'Модули EXT'],
    ['di_modules', 'Модули DI'],
    ['one_wire_modules', 'Модули 1-wire'],
    ['power_modules', 'Питание'],
];

const getItemLabel = (item) => {
    if (typeof item === 'string') return item;
    return item?.title || item?.name || item?._label || item?.type || 'Без названия';
};

const groupItems = (items) => {
    const counts = new Map();
    (Array.isArray(items) ? items : []).filter(Boolean).forEach((item) => {
        const label = getItemLabel(item);
        counts.set(label, (counts.get(label) || 0) + 1);
    });
    return [...counts].map(([label, count]) => ({ label, count }));
};

const formatCreatedAt = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleString('ru-RU');
};

const SelectionConfigModal = ({ config, onClose }) => {
    const intent = config?.intent || {};
    const selectionState = config?.selection_state || {};
    const createdAt = formatCreatedAt(config?.created_at);
    const sections = SECTIONS.map(([key, title]) => ({
        key,
        title,
        rows: groupItems(selectionState[key]),
    })).filter((section) => section.rows.length > 0);

    return (
        <div className="selection-config-backdrop" onMouseDown={onClose}>
            <div
                className="selection-config-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="selection-config-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header className="selection-config-header">
                    <div>
                        <span className="selection-config-eyebrow">Сохранённый снимок</span>
                        <h2 id="selection-config-title">Исходный подбор</h2>
                    </div>
                    <button type="button" className="selection-config-close" onClick={onClose} aria-label="Закрыть">×</button>
                </header>

                <p className="selection-config-note">
                    Это конфигурация на момент создания. Текущая схема могла быть изменена позже.
                </p>

                <div className="selection-config-intent">
                    <div>
                        <span>Итоговый контроллер</span>
                        <strong>{CONTROLLER_LABELS[intent.resolved_controller_type] || intent.resolved_controller_type || 'Не указан'}</strong>
                        <small>{SOURCE_LABELS[intent.controller_selection_source] || intent.controller_selection_source}</small>
                    </div>
                    <div>
                        <span>Источник бесперебойного питания</span>
                        <strong>{intent.ups_requested ? 'Требуется' : 'Не требуется'}</strong>
                    </div>
                    <div>
                        <span>Единый шлейф протечки</span>
                        <strong>{intent.unified_leak_loop ? 'Да' : 'Нет'}</strong>
                    </div>
                </div>

                {createdAt && <div className="selection-config-date">Подбор сохранён: {createdAt}</div>}

                <div className="selection-config-sections">
                    {sections.length === 0 ? (
                        <p className="selection-config-empty">В исходном подборе нет оборудования.</p>
                    ) : sections.map((section) => (
                        <section key={section.key}>
                            <h3>{section.title}</h3>
                            {section.rows.map((row) => (
                                <div className="selection-config-row" key={row.label}>
                                    <span>{row.label}</span>
                                    <strong>{row.count} шт.</strong>
                                </div>
                            ))}
                        </section>
                    ))}
                </div>

                <details className="selection-config-json">
                    <summary>Технические данные</summary>
                    <pre>{JSON.stringify(config, null, 2)}</pre>
                </details>
            </div>
        </div>
    );
};

export default SelectionConfigModal;
