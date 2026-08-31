import React from 'react';
import logoPath from '../../assets/logo/logo.svg';
import Modal from './Modal';
import ModalCloseButton from './ModalCloseButton';

export const getBillableCount = (row) => row.paidCount ?? (row.count || 1);

export const getDiscountedPrice = (price, discountPercent, discountEligible = true) => (
    discountEligible ? Math.round(price * (100 - discountPercent) / 100) : price
);

export const EquipmentOfferContent = ({ sections, discountPercent = 0, onRemoveRow, renderAfterSections }) => {
    const total = sections.reduce((sum, section) => sum + section.rows.reduce((rowSum, row) => {
        if (row.unitPrice == null) return rowSum;
        return rowSum + row.unitPrice * getBillableCount(row);
    }, 0), 0);
    const discountedTotal = sections.reduce((sum, section) => sum + section.rows.reduce((rowSum, row) => {
        if (row.unitPrice == null) return rowSum;
        const price = row.unitPrice * getBillableCount(row);
        return rowSum + getDiscountedPrice(price, discountPercent, row.discountEligible !== false);
    }, 0), 0);

    return (
        <>
            <div className="equipment-offer-content">
                {sections.length === 0 ? (
                    <p className="equipment-offer-empty">Оборудование пока не выбрано.</p>
                ) : sections.map((section) => (
                    <section key={section.title} className="equipment-offer-section">
                        <h3>{section.title}</h3>
                            {section.rows.map((row, index) => {
                                const hasPrice = row.unitPrice != null;
                                const price = hasPrice ? row.unitPrice * getBillableCount(row) : null;
                                const isDiscounted = row.discountEligible !== false && discountPercent > 0;
                                const discountedPrice = price == null ? null : getDiscountedPrice(price, discountPercent, row.discountEligible !== false);
                            return (
                                <div
                                    key={row.key || `${row.label}:${index}`}
                                    className={`equipment-offer-row${hasPrice ? '' : ' equipment-offer-row-disabled'}`}
                                >
                                    <span className="equipment-offer-item">
                                        {(hasPrice || row.badge) && (
                                            <span className="equipment-offer-item-meta">
                                                {hasPrice && <img src={logoPath} alt="MyHeat" />}
                                                {row.badge && <span className="equipment-offer-badge">{row.badge}</span>}
                                            </span>
                                        )}
                                        <span>{row.label}</span>
                                    </span>
                                    <span className="equipment-offer-leader" />
                                    <span className="equipment-offer-count">{row.count || 1} шт</span>
                                    {price != null && (
                                        <span className="equipment-offer-price">
                                            {isDiscounted && <del>{price.toLocaleString('ru-RU')} ₽</del>}
                                            <strong>{discountedPrice.toLocaleString('ru-RU')} ₽</strong>
                                        </span>
                                    )}
                                    {row.removable && (
                                        <button type="button" className="equipment-offer-row-remove" onClick={() => onRemoveRow?.(row.key)} aria-label={`Удалить: ${row.label}`}>×</button>
                                    )}
                                </div>
                            );
                        })}
                    </section>
                ))}
            </div>
            {renderAfterSections?.()}
            {sections.length > 0 && (
                <footer className="equipment-offer-total">
                    <span>Итого</span>
                    <span className="equipment-offer-total-price">
                        {discountPercent > 0 && discountedTotal !== total && <del>{total.toLocaleString('ru-RU')} ₽</del>}
                        <strong>{discountedTotal.toLocaleString('ru-RU')} ₽</strong>
                    </span>
                </footer>
            )}
        </>
    );
};

const EquipmentOfferModal = ({ sections, onClose }) => {
    const [isDownloading, setIsDownloading] = React.useState(false);

    const handleDownloadPdf = async () => {
        if (isDownloading) return;
        setIsDownloading(true);
        try {
            const { downloadOfferPdf } = await import('../scheme/export/offerPdfExport');
            await downloadOfferPdf(sections);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <Modal className="equipment-offer-modal" labelledBy="equipment-offer-title" onClose={onClose} showClose={false}>
                <header className="equipment-offer-header">
                    <h2 id="equipment-offer-title">Коммерческое предложение</h2>
                    <div className="equipment-offer-header-actions">
                        {sections.length > 0 && (
                            <button
                                type="button"
                                className="equipment-offer-download selection-primary-button"
                                onClick={handleDownloadPdf}
                                disabled={isDownloading}
                            >
                                {isDownloading ? 'Готовим PDF…' : 'Скачать PDF'}
                            </button>
                        )}
                        <ModalCloseButton className="equipment-offer-close" onClick={onClose} />
                    </div>
                </header>
                <EquipmentOfferContent sections={sections} />
        </Modal>
    );
};

export default EquipmentOfferModal;
