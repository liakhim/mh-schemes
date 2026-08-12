import { useEffect, useRef, useState } from 'react';

const SHOW_DEVELOPER_TOOLS = true;

const SchemeRightTools = ({
    rightToolsTransitionPhase,
    displayedToolsInstallationMode,
    installationMode,
    devicePreviewCollapsed,
    selectedPreviewDevice,
    onToggleDevicePreview,
    installationDinTotal,
    showGrid,
    onToggleGrid,
    showEmptySlots,
    onToggleEmptySlots,
    handleSaveScheme,
    routeSchemeId,
    schemeLoadState,
    schemeSaveState,
    handleSaveAsNewScheme,
    schemeCreateState,
    showPorts,
    onShowPortsChange,
    showLineFrames,
    onShowLineFramesChange,
    showIncomingScheme,
    onShowIncomingSchemeChange,
    wifiLineEnabled,
    onWifiLineEnabledChange,
    handleDownloadPdf,
}) => {
    const [showSaveActions, setShowSaveActions] = useState(false);
    const [showDeveloperToolsPanel, setShowDeveloperToolsPanel] = useState(false);
    const saveActionsRef = useRef(null);
    const developerToolsRef = useRef(null);

    useEffect(() => {
        if (!showSaveActions) return undefined;
        const closeOnOutsideInteraction = (event) => {
            if (!saveActionsRef.current?.contains(event.target)) setShowSaveActions(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') setShowSaveActions(false);
        };
        document.addEventListener('pointerdown', closeOnOutsideInteraction);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closeOnOutsideInteraction);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [showSaveActions]);

    useEffect(() => {
        if (!showDeveloperToolsPanel) return undefined;
        const closeOnOutsideInteraction = (event) => {
            if (!developerToolsRef.current?.contains(event.target)) setShowDeveloperToolsPanel(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') setShowDeveloperToolsPanel(false);
        };
        document.addEventListener('pointerdown', closeOnOutsideInteraction);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closeOnOutsideInteraction);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [showDeveloperToolsPanel]);

    useEffect(() => {
        if (!installationMode) return;
        setShowSaveActions(false);
        setShowDeveloperToolsPanel(false);
    }, [installationMode]);

    return (
    <div className={`spa-right-tools is-${rightToolsTransitionPhase}`}>
        {!displayedToolsInstallationMode && (
            <button
                type="button"
                className={`spa-floating-tool-button spa-device-details-button${devicePreviewCollapsed ? '' : ' is-active'}${selectedPreviewDevice ? ' has-device' : ''}`}
                aria-label={devicePreviewCollapsed ? 'Развернуть детали устройства' : 'Свернуть детали устройства'}
                aria-expanded={!devicePreviewCollapsed}
                aria-controls="spa-device-preview"
                data-tooltip="Детали устройства"
                onClick={onToggleDevicePreview}
            >
                <svg viewBox="0 0 32 32" aria-hidden="true">
                    <rect x="5" y="5" width="15" height="20" rx="2" />
                    <path d="M9 10h7M9 14h7M9 18h5" />
                    <circle cx="22.5" cy="21.5" r="4.5" />
                    <path d="m26 25 3 3" />
                </svg>
            </button>
        )}
        {displayedToolsInstallationMode && (
            <div
                className="spa-floating-tool-button spa-installation-din-indicator"
                role="status"
                data-tooltip="Занято на DIN-рейке"
                aria-label={installationDinTotal == null ? 'Количество DIN неизвестно' : `Занято ${installationDinTotal} DIN`}
            >
                <strong>{installationDinTotal == null ? '—' : installationDinTotal}</strong>
                <span>DIN</span>
            </div>
        )}
        {!displayedToolsInstallationMode && (
            <button
                type="button"
                className={`spa-floating-tool-button spa-grid-toggle-button${showGrid ? ' is-active' : ''}`}
                aria-label={showGrid ? 'Скрыть сетку' : 'Отобразить сетку'}
                aria-pressed={showGrid}
                data-tooltip={showGrid ? 'Скрыть сетку' : 'Отобразить сетку'}
                onClick={onToggleGrid}
            >
                <svg viewBox="0 0 32 32" aria-hidden="true">
                    <path d="M4.5 4.5h23v23h-23zM12.2 4.5v23m7.6-23v23M4.5 12.2h23m-23 7.6h23" />
                </svg>
            </button>
        )}
        {!displayedToolsInstallationMode && (
            <button
                type="button"
                className={`spa-floating-tool-button spa-empty-slots-toggle-button${showEmptySlots ? ' is-active' : ''}`}
                aria-label={showEmptySlots ? 'Скрыть доступные слоты' : 'Отобразить доступные слоты'}
                aria-pressed={showEmptySlots}
                data-tooltip={showEmptySlots ? 'Скрыть доступные слоты' : 'Отобразить доступные слоты'}
                onClick={onToggleEmptySlots}
            >
                <svg viewBox="0 0 32 32" aria-hidden="true">
                    <rect x="4.5" y="6.5" width="9" height="9" rx="1.5" />
                    <rect x="18.5" y="6.5" width="9" height="9" rx="1.5" />
                    <rect x="4.5" y="19.5" width="9" height="7" rx="1.5" />
                    <path d="M23 19.5v7m-3.5-3.5h7" />
                </svg>
            </button>
        )}
        <div className="spa-save-tool" ref={saveActionsRef}>
        <button
            type="button"
            className={`spa-floating-tool-button${showSaveActions ? ' is-active' : ''}`}
            aria-label="Сохранить схему"
            aria-expanded={showSaveActions}
            aria-controls="spa-save-actions-panel"
            data-tooltip="Сохранить схему"
            onClick={() => setShowSaveActions((current) => !current)}
        >
            <svg viewBox="0 0 32 32" aria-hidden="true">
                <path d="M5 4.5h19l3 3v20H5zM10 4.5v8h12v-8M10 27.5v-10h12v10" />
                <path d="M18.5 7.5h2" />
            </svg>
        </button>
        <section
            id="spa-save-actions-panel"
            className={`spa-save-actions-panel${showSaveActions ? ' is-open' : ''}`}
            aria-hidden={!showSaveActions}
            inert={!showSaveActions}
        >
            <div className="spa-save-actions-header">
                <strong>Сохранение схемы</strong>
                <button type="button" onClick={() => setShowSaveActions(false)} aria-label="Закрыть">×</button>
            </div>
            <button
                type="button"
                className="scheme-settings-save-button"
                onClick={handleSaveScheme}
                disabled={!routeSchemeId || schemeLoadState !== 'loaded' || schemeSaveState === 'saving'}
                data-state={schemeSaveState}
                title={routeSchemeId ? undefined : 'Сохранение доступно только для схемы из базы'}
            >
                {schemeSaveState === 'saving'
                    ? 'Сохраняем...'
                    : (schemeSaveState === 'saved'
                        ? 'Сохранено'
                        : (schemeSaveState === 'error' ? 'Ошибка сохранения' : 'Сохранить изменения'))}
            </button>
            <button
                type="button"
                className="scheme-settings-save-button spa-save-as-new-button"
                onClick={handleSaveAsNewScheme}
                disabled={(routeSchemeId && schemeLoadState !== 'loaded') || schemeCreateState === 'saving'}
                data-state={schemeCreateState}
            >
                {schemeCreateState === 'saving'
                    ? 'Сохраняем...'
                    : (schemeCreateState === 'saved'
                        ? 'Сохранено'
                        : (schemeCreateState === 'error' ? 'Ошибка сохранения' : 'Сохранить как новую схему'))}
            </button>
        </section>
        </div>
        {!displayedToolsInstallationMode && SHOW_DEVELOPER_TOOLS && (
            <div className="spa-developer-tools" ref={developerToolsRef}>
            <button
                type="button"
                className={`spa-floating-tool-button${showDeveloperToolsPanel ? ' is-active' : ''}`}
                aria-label="Инструменты разработчика"
                aria-expanded={showDeveloperToolsPanel}
                aria-controls="spa-developer-tools-panel"
                data-tooltip="Инструменты разработчика"
                onClick={() => setShowDeveloperToolsPanel((current) => !current)}
            >
                <svg viewBox="0 0 32 32" aria-hidden="true">
                    <path d="m12 8-7 8 7 8m8-16 7 8-7 8M18 5l-4 22" />
                </svg>
            </button>
            <section
                id="spa-developer-tools-panel"
                className={`spa-save-actions-panel spa-developer-tools-panel${showDeveloperToolsPanel ? ' is-open' : ''}`}
                aria-hidden={!showDeveloperToolsPanel}
                inert={!showDeveloperToolsPanel}
            >
                <div className="spa-save-actions-header">
                    <strong>Инструменты разработчика</strong>
                    <button type="button" onClick={() => setShowDeveloperToolsPanel(false)} aria-label="Закрыть">×</button>
                </div>
                <div className="scheme-settings-options">
                    <label className="scheme-settings-switch-row">
                        <span>Отобразить порты входа линий</span>
                        <input type="checkbox" checked={showPorts} onChange={(event) => onShowPortsChange(event.target.checked)} />
                        <span className="scheme-settings-switch" aria-hidden="true" />
                    </label>
                    <label className="scheme-settings-switch-row">
                        <span>Отображать области линий подключения</span>
                        <input type="checkbox" checked={showLineFrames} onChange={(event) => onShowLineFramesChange(event.target.checked)} />
                        <span className="scheme-settings-switch" aria-hidden="true" />
                    </label>
                    <label className="scheme-settings-switch-row">
                        <span>Отображать отладочную панель</span>
                        <input type="checkbox" checked={showIncomingScheme} onChange={(event) => onShowIncomingSchemeChange(event.target.checked)} />
                        <span className="scheme-settings-switch" aria-hidden="true" />
                    </label>
                    <label className="scheme-settings-switch-row">
                        <span>Включить Wi-Fi-линию</span>
                        <input
                            type="checkbox"
                            checked={wifiLineEnabled}
                            onChange={onWifiLineEnabledChange}
                            data-test-id="developer-wifi-line-toggle"
                        />
                        <span className="scheme-settings-switch" aria-hidden="true" />
                    </label>
                </div>
            </section>
            </div>
        )}
        <button
            type="button"
            className="spa-floating-tool-button spa-pdf-download-button"
            aria-label="Скачать схему в PDF"
            data-tooltip="Скачать схему в PDF"
            onClick={handleDownloadPdf}
        >
            <svg viewBox="0 0 32 32" aria-hidden="true">
                <path d="M8 3.5h11l5 5v20H8z" />
                <path d="M19 3.5v5h5M16 11.5v10m-4-4 4 4 4-4M11.5 25h9" />
            </svg>
        </button>
    </div>
    );
};

export default SchemeRightTools;
