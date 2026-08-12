const SchemeFloatingTools = ({
    unusedBundledSensorsRef,
    showUnusedBundledSensors,
    setShowUnusedBundledSensors,
    unusedBundledSensorCount,
    unusedBundledSensorCards,
    selectionConfig,
    setShowOfferModal,
    setShowSelectionConfig,
}) => (
    <div className="spa-floating-tools" ref={unusedBundledSensorsRef}>
        <div className="spa-unused-sensors-tool">
            <button
                type="button"
                className={`spa-floating-tool-button spa-unused-sensors-button${showUnusedBundledSensors ? ' is-active' : ''}`}
                aria-label="Незадействованные комплектные датчики"
                aria-expanded={showUnusedBundledSensors}
                aria-controls="spa-unused-sensors-panel"
                data-tooltip="Незадействованные комплектные датчики"
                onClick={() => setShowUnusedBundledSensors((current) => !current)}
            >
                <svg viewBox="0 0 32 32" aria-hidden="true">
                    <path d="M13 5.5a3 3 0 0 1 6 0v11.1a7 7 0 1 1-6 0z" />
                    <path d="M16 9v11.5" />
                    <circle cx="16" cy="23" r="2.5" />
                    <path d="M22.5 8.5h4m-4 4h3m-3 4h4" />
                </svg>
                <span className="spa-floating-tool-badge" aria-label={`${unusedBundledSensorCount} датчиков`}>
                    {unusedBundledSensorCount}
                </span>
            </button>
            <section
                id="spa-unused-sensors-panel"
                className={`spa-unused-sensors-panel${showUnusedBundledSensors ? ' is-open' : ''}`}
                aria-hidden={!showUnusedBundledSensors}
                inert={!showUnusedBundledSensors}
            >
                <div className="spa-unused-sensors-panel-header">
                    <strong>Незадействованные комплектные датчики</strong>
                    <button type="button" onClick={() => setShowUnusedBundledSensors(false)} aria-label="Закрыть">×</button>
                </div>
                {unusedBundledSensorCards.length > 0 ? (
                    <div className="spa-unused-kit-sensors-list">
                        {unusedBundledSensorCards.map((card) => (
                            <div className="spa-unused-kit-sensor-card" key={card.bucket}>
                                <span>{card.label}</span>
                                <strong>×{card.count}</strong>
                            </div>
                        ))}
                    </div>
                ) : (
                    <span className="spa-unused-kit-sensors-empty">Все комплектные датчики задействованы</span>
                )}
            </section>
        </div>
        <button
            type="button"
            className="spa-floating-tool-button"
            aria-label="Коммерческое предложение"
            data-tooltip="Коммерческое предложение"
            onClick={() => {
                setShowUnusedBundledSensors(false);
                setShowOfferModal(true);
            }}
        >
            <svg viewBox="0 0 32 32" aria-hidden="true">
                <path d="M8 3.5h11l5 5v20H8z" />
                <path d="M19 3.5v5h5M12 13h8m-8 4h5" />
                <path d="M12.5 24.5h5.25a2.25 2.25 0 0 0 0-4.5H14v7m0-3h6" />
            </svg>
        </button>
        {selectionConfig && (
            <button
                type="button"
                className="spa-floating-tool-button"
                aria-label="Исходный подбор"
                data-tooltip="Исходный подбор"
                onClick={() => {
                    setShowUnusedBundledSensors(false);
                    setShowSelectionConfig(true);
                }}
            >
                <svg viewBox="0 0 32 32" aria-hidden="true">
                    <path d="M9 5.5h14v23H9zM13 3.5h6v4h-6z" />
                    <path d="m12 13 1.5 1.5L16 12m2 1h2m-8 6 1.5 1.5L16 18m2 1h2m-8 6 1.5 1.5L16 24m2 1h2" />
                </svg>
            </button>
        )}
    </div>
);

export default SchemeFloatingTools;
