import React from 'react';

const SchemeHelpModal = ({ onClose }) => (
    <div className="scheme-help-backdrop" onMouseDown={onClose}>
        <div className="scheme-help-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="scheme-help-header">
                <strong>МАЙХИТ «Схемы подключения»</strong>
                <button type="button" className="scheme-settings-close" onClick={onClose} aria-label="Закрыть">×</button>
            </div>
            <div className="scheme-help-content">
                <section className="scheme-help-block">
                    <p>Для зумирования/масштабирования используйте:</p>
                    <strong>SHIFT + ролик мыши;</strong>
                </section>
                <section className="scheme-help-block">
                    <p>Для расширения существующей схемы:</p>
                    <strong>Используйте кнопку «Доступные слоты» справа</strong>
                </section>
                <section className="scheme-help-block">
                    <p>Для скачивания схемы:</p>
                    <strong>Используйте кнопку PDF справа</strong>
                </section>
                <p className="scheme-help-note">Если вы находитесь на этой странице, значит Ваша схема уже сохранена, ссылкой можно делиться или зайти позже.</p>
                <p>
                    Приложение находится в стадии альфа-тестирования, все вопросы к разработчику:{' '}
                    <a href="https://t.me/mmingareev" target="_blank" rel="noreferrer">Telegram</a>
                </p>
            </div>
            <button type="button" className="scheme-help-primary" onClick={onClose}>
                Понятно
            </button>
        </div>
    </div>
);

export default SchemeHelpModal;
