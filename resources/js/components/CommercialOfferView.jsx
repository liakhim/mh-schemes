import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EquipmentOfferContent } from './EquipmentOfferModal';

const filterBundledSensors = (sections, showBundledSensors) => (
    sections
        .map((section) => ({
            ...section,
            rows: showBundledSensors ? section.rows : section.rows.filter((row) => row.badge !== 'Комплектный'),
        }))
        .filter((section) => section.rows.length > 0)
);

const CommercialOfferView = ({ sections, canUseInstallationMode, onSelectView }) => {
    const [showBundledSensors, setShowBundledSensors] = useState(true);
    const [discountPercent, setDiscountPercent] = useState(0);
    const [workItems, setWorkItems] = useState([]);
    const [workDescription, setWorkDescription] = useState('');
    const [workPrice, setWorkPrice] = useState('');
    const [showDiscountPanel, setShowDiscountPanel] = useState(false);
    const [toolsTransitionPhase, setToolsTransitionPhase] = useState('entering');
    const leaveTimerRef = useRef(null);
    const visibleSections = useMemo(
        () => filterBundledSensors(sections, showBundledSensors),
        [sections, showBundledSensors],
    );
    const offerSections = useMemo(() => {
        if (workItems.length === 0) return visibleSections;
        return [...visibleSections, {
            title: 'Монтажные работы',
            rows: workItems.map((work) => ({
                key: `work:${work.id}`,
                label: work.description,
                count: 1,
                unitPrice: work.price,
                discountEligible: false,
                removable: true,
            })),
        }];
    }, [visibleSections, workItems]);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => setToolsTransitionPhase('idle'), 400);
        return () => {
            window.clearTimeout(timer);
            window.clearTimeout(leaveTimerRef.current);
        };
    }, []);

    const handleSelectView = (view) => {
        if (view === 'commercial' || toolsTransitionPhase === 'exiting') return;
        setToolsTransitionPhase('exiting');
        leaveTimerRef.current = window.setTimeout(() => onSelectView(view), 280);
    };

    const setDiscount = (value) => {
        const parsed = Number.parseInt(value, 10);
        setDiscountPercent(Number.isFinite(parsed) ? Math.min(40, Math.max(0, parsed)) : 0);
    };

    const addWork = (event) => {
        event.preventDefault();
        const description = workDescription.trim();
        const price = Number(workPrice);
        if (!description || !Number.isFinite(price) || price <= 0) return;
        setWorkItems((current) => [...current, {
            id: `${Date.now()}-${current.length}`,
            description,
            price: Math.round(price),
        }]);
        setWorkDescription('');
        setWorkPrice('');
    };

    const handleDownloadPdf = async () => {
        if (isDownloading) return;
        setIsDownloading(true);
        try {
            const { downloadOfferPdf } = await import('../scheme/export/offerPdfExport');
            await downloadOfferPdf(offerSections, { discountPercent });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <main className="spa-page spa-commercial-page">
            <div className="spa-mode-toggle" role="group" aria-label="Режим отображения схемы">
                <button type="button" onClick={() => handleSelectView('scheme')} disabled={toolsTransitionPhase === 'exiting'}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="5" cy="6" r="2" />
                        <circle cx="19" cy="6" r="2" />
                        <circle cx="12" cy="18" r="2" />
                        <path d="M7 6h10M6.5 7.5l4.2 8.7m6.8-8.7-4.2 8.7" />
                    </svg>
                    <span>Схема</span>
                </button>
                <button type="button" onClick={() => handleSelectView('installation')} disabled={!canUseInstallationMode || toolsTransitionPhase === 'exiting'}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 5h18v14H3zM6 8h4v8H6zm8 0h4v8h-4z" />
                    </svg>
                    <span>Инсталляция</span>
                </button>
                <button type="button" className="is-active" aria-pressed="true">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h6m-6 4h4" />
                    </svg>
                    <span>Предложение</span>
                </button>
            </div>
            <aside className={`spa-right-tools spa-commercial-tools is-${toolsTransitionPhase}`} aria-label="Инструменты коммерческого предложения">
                <button
                    type="button"
                    className={`spa-floating-tool-button${showBundledSensors ? ' is-active' : ''}`}
                    aria-label={showBundledSensors ? 'Скрыть комплектные датчики' : 'Показать комплектные датчики'}
                    aria-pressed={showBundledSensors}
                    data-tooltip={showBundledSensors ? 'Скрыть комплектные датчики' : 'Показать комплектные датчики'}
                    onClick={() => setShowBundledSensors((current) => !current)}
                >
                    <svg viewBox="0 0 32 32" aria-hidden="true">
                        <path d="M13 5.5a3 3 0 0 1 6 0v11.1a7 7 0 1 1-6 0z" />
                        <path d="M16 9v11.5" />
                        <circle cx="16" cy="23" r="2.5" />
                        <path d="M22.5 8.5h4m-4 4h3m-3 4h4" />
                    </svg>
                    <span className="spa-tool-label">Датчики</span>
                </button>
                <div className="spa-commercial-discount-tool">
                    <button
                        type="button"
                        className={`spa-floating-tool-button${showDiscountPanel || discountPercent > 0 ? ' is-active' : ''}`}
                        aria-label={discountPercent > 0 ? `Скидка ${discountPercent}%` : 'Установить скидку'}
                        aria-expanded={showDiscountPanel}
                        aria-controls="spa-commercial-discount-panel"
                        data-tooltip={discountPercent > 0 ? `Скидка ${discountPercent}%` : 'Установить скидку'}
                        onClick={() => setShowDiscountPanel((current) => !current)}
                    >
                        <svg viewBox="0 0 32 32" aria-hidden="true">
                            <path d="M6 5h14l6 6v15H6z" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="20" cy="21" r="2" />
                            <path d="m11 22 10-11" />
                        </svg>
                        <span className="spa-tool-label">{discountPercent > 0 ? `${discountPercent}% скидка` : 'Скидка'}</span>
                    </button>
                    <section
                        id="spa-commercial-discount-panel"
                        className={`spa-commercial-discount-panel${showDiscountPanel ? ' is-open' : ''}`}
                        aria-hidden={!showDiscountPanel}
                        inert={!showDiscountPanel}
                    >
                        <div className="spa-commercial-discount-header">
                            <strong>Скидка</strong>
                            <button type="button" onClick={() => setShowDiscountPanel(false)} aria-label="Закрыть">×</button>
                        </div>
                        <label className="spa-commercial-discount-value">
                            <span>Размер скидки</span>
                            <input type="number" min="0" max="40" value={discountPercent} onChange={(event) => setDiscount(event.target.value)} />
                            <b>%</b>
                        </label>
                        <input className="spa-commercial-discount-range" type="range" min="0" max="40" value={discountPercent} onChange={(event) => setDiscount(event.target.value)} aria-label="Размер скидки в процентах" />
                        <button type="button" className="spa-commercial-discount-reset" onClick={() => setDiscountPercent(0)} disabled={discountPercent === 0}>Сбросить скидку</button>
                    </section>
                </div>
                {offerSections.length > 0 && (
                    <button
                        type="button"
                        className="spa-floating-tool-button"
                        aria-label="Скачать коммерческое предложение в PDF"
                        data-tooltip="Скачать PDF"
                        onClick={handleDownloadPdf}
                        disabled={isDownloading}
                    >
                        <svg viewBox="0 0 32 32" aria-hidden="true">
                            <path d="M8 3.5h11l5 5v20H8z" />
                            <path d="M19 3.5v5h5M12 13h8m-8 4h5" />
                            <path d="M12.5 24.5h5.25a2.25 2.25 0 0 0 0-4.5H14v7m0-3h6" />
                        </svg>
                        <span className="spa-tool-label">{isDownloading ? 'Готовим' : 'Скачать'}</span>
                    </button>
                )}
            </aside>
            <article className="spa-commercial-offer">
                <EquipmentOfferContent
                    sections={offerSections}
                    discountPercent={discountPercent}
                    onRemoveRow={(key) => setWorkItems((current) => current.filter((work) => `work:${work.id}` !== key))}
                    renderAfterSections={() => (
                        <form className="spa-commercial-add-work" onSubmit={addWork}>
                            <span className="spa-commercial-add-work-icon" aria-hidden="true">+</span>
                            <input value={workDescription} onChange={(event) => setWorkDescription(event.target.value)} placeholder="Добавить монтажную работу" aria-label="Описание монтажной работы" />
                            <input type="number" min="1" step="1" value={workPrice} onChange={(event) => setWorkPrice(event.target.value)} placeholder="Стоимость" aria-label="Стоимость монтажной работы" />
                            <span className="spa-commercial-add-work-currency">₽</span>
                            <button type="submit" disabled={!workDescription.trim() || !workPrice}>Добавить</button>
                        </form>
                    )}
                />
            </article>
        </main>
    );
};

export default CommercialOfferView;
