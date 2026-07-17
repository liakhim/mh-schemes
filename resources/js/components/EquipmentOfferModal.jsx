import React from 'react';
import logoPath from '../../assets/logo/logo.svg';

const getBillableCount = (row) => row.paidCount ?? (row.count || 1);

const EquipmentOfferModal = ({ sections, onClose }) => {
    const total = sections.reduce((sum, section) => sum + section.rows.reduce((rowSum, row) => {
        if (row.unitPrice == null) return rowSum;
        return rowSum + row.unitPrice * getBillableCount(row);
    }, 0), 0);

    return (
        <div className="equipment-offer-backdrop" onMouseDown={onClose}>
            <div
                className="equipment-offer-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="equipment-offer-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header className="equipment-offer-header">
                    <h2 id="equipment-offer-title">Коммерческое предложение</h2>
                    <button type="button" className="equipment-offer-close" onClick={onClose} aria-label="Закрыть">×</button>
                </header>
                <div className="equipment-offer-content">
                    {sections.length === 0 ? (
                        <p className="equipment-offer-empty">Оборудование пока не выбрано.</p>
                    ) : sections.map((section) => (
                        <section key={section.title} className="equipment-offer-section">
                            <h3>{section.title}</h3>
                            {section.rows.map((row, index) => {
                                const hasPrice = row.unitPrice != null;
                                const price = hasPrice ? row.unitPrice * getBillableCount(row) : null;
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
                                        {price != null && <strong>{price.toLocaleString('ru-RU')} ₽</strong>}
                                    </div>
                                );
                            })}
                        </section>
                    ))}
                </div>
                {sections.length > 0 && (
                    <footer className="equipment-offer-total">
                        <span>Итого</span>
                        <span>{total.toLocaleString('ru-RU')} ₽</span>
                    </footer>
                )}
            </div>
        </div>
    );
};

export default EquipmentOfferModal;
