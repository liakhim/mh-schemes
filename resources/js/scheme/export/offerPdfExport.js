import { jsPDF } from 'jspdf';
import logoPath from '../../../assets/logo/logo.svg';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const SCALE = 3;
const FONT_FAMILY = '"Segoe UI", Tahoma, sans-serif';
const ROW_LINE_HEIGHT = 16;

export const getBillableCount = (row) => row.paidCount ?? (row.count || 1);

const loadImage = (src) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
});

const createPage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(PAGE_WIDTH * SCALE);
    canvas.height = Math.round(PAGE_HEIGHT * SCALE);
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    ctx.textBaseline = 'alphabetic';
    return { canvas, ctx };
};

const wrapText = (ctx, text, maxWidth) => {
    const words = String(text ?? '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    words.forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(candidate).width > maxWidth) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    });
    if (line) lines.push(line);
    return lines.length ? lines : [''];
};

const drawBadge = (ctx, text, x, y) => {
    ctx.font = `700 8px ${FONT_FAMILY}`;
    const width = ctx.measureText(text).width + 12;
    ctx.fillStyle = '#dcfce7';
    ctx.beginPath();
    ctx.roundRect(x, y, width, 12, 6);
    ctx.fill();
    ctx.fillStyle = '#166534';
    ctx.fillText(text, x + 6, y + 9);
    return width;
};

const drawLeader = (ctx, fromX, toX, y) => {
    if (toX - fromX < 8) return;
    ctx.save();
    ctx.strokeStyle = '#6b7f95';
    ctx.lineWidth = 1;
    ctx.setLineDash([1.5, 2.5]);
    ctx.beginPath();
    ctx.moveTo(fromX, y);
    ctx.lineTo(toX, y);
    ctx.stroke();
    ctx.restore();
};

export const downloadOfferPdf = async (sections) => {
    const logoImage = await loadImage(logoPath);
    const pages = [];
    let page = createPage();
    pages.push(page);
    let y = MARGIN;

    const newPageIfNeeded = (blockHeight) => {
        if (y + blockHeight <= PAGE_HEIGHT - MARGIN) return;
        page = createPage();
        pages.push(page);
        y = MARGIN;
    };

    const rowFont = `400 12px ${FONT_FAMILY}`;
    const priceFont = `700 12px ${FONT_FAMILY}`;

    const measureRight = () => {
        let countCol = 0;
        let priceCol = 64;
        sections.forEach((section) => section.rows.forEach((row) => {
            page.ctx.font = rowFont;
            countCol = Math.max(countCol, page.ctx.measureText(`${row.count || 1} шт`).width);
            if (row.unitPrice != null) {
                page.ctx.font = priceFont;
                const price = row.unitPrice * getBillableCount(row);
                priceCol = Math.max(priceCol, page.ctx.measureText(`${price.toLocaleString('ru-RU')} ₽`).width);
            }
        }));
        return { countCol, priceCol };
    };
    const { countCol, priceCol } = measureRight();
    const labelMaxWidth = CONTENT_WIDTH - countCol - priceCol - 40;

    // Шапка: заголовок, дата, логотип
    page.ctx.font = `700 18px ${FONT_FAMILY}`;
    page.ctx.fillStyle = '#1f2937';
    page.ctx.fillText('Коммерческое предложение', MARGIN, y + 14);
    if (logoImage) {
        const logoHeight = 14;
        const logoWidth = logoHeight * (logoImage.width / logoImage.height);
        page.ctx.drawImage(logoImage, PAGE_WIDTH - MARGIN - logoWidth, y, logoWidth, logoHeight);
    }
    y += 32;
    page.ctx.font = `400 10px ${FONT_FAMILY}`;
    page.ctx.fillStyle = '#64748b';
    page.ctx.fillText(new Date().toLocaleDateString('ru-RU'), MARGIN, y);
    y += 24;

    let total = 0;
    sections.forEach((section) => {
        page.ctx.font = rowFont;
        const firstRow = section.rows[0];
        const firstRowLines = firstRow
            ? wrapText(page.ctx, firstRow.label, labelMaxWidth).length
            : 0;
        newPageIfNeeded(22 + firstRowLines * ROW_LINE_HEIGHT + 14);

        page.ctx.font = `700 10px ${FONT_FAMILY}`;
        page.ctx.fillStyle = '#475569';
        page.ctx.fillText(String(section.title ?? '').toUpperCase(), MARGIN, y + 10);
        y += 22;

        section.rows.forEach((row) => {
            const hasPrice = row.unitPrice != null;
            const price = hasPrice ? row.unitPrice * getBillableCount(row) : null;
            if (price != null) total += price;

            page.ctx.font = rowFont;
            const lines = wrapText(page.ctx, row.label, labelMaxWidth);
            const metaHeight = (row.badge || hasPrice) ? 15 : 0;
            const rowHeight = metaHeight + lines.length * ROW_LINE_HEIGHT + 6;
            newPageIfNeeded(rowHeight);

            const textColor = hasPrice ? '#203040' : '#94a3b8';
            let metaX = MARGIN;
            if (metaHeight) {
                if (hasPrice && logoImage) {
                    const logoHeight = 6;
                    const logoWidth = logoHeight * (logoImage.width / logoImage.height);
                    page.ctx.drawImage(logoImage, metaX, y + 3, logoWidth, logoHeight);
                    metaX += logoWidth + 5;
                }
                if (row.badge) drawBadge(page.ctx, row.badge, metaX, y);
                y += metaHeight;
            }

            page.ctx.font = rowFont;
            page.ctx.fillStyle = textColor;
            lines.forEach((line, index) => {
                page.ctx.fillText(line, MARGIN, y + 12 + index * ROW_LINE_HEIGHT);
            });
            const lastBaseline = y + 12 + (lines.length - 1) * ROW_LINE_HEIGHT;
            const labelEnd = MARGIN + page.ctx.measureText(lines[lines.length - 1]).width;

            const priceX = PAGE_WIDTH - MARGIN;
            const countX = priceX - priceCol - 12;
            page.ctx.fillStyle = textColor;
            page.ctx.textAlign = 'right';
            page.ctx.fillText(`${row.count || 1} шт`, countX, lastBaseline);
            if (price != null) {
                page.ctx.font = priceFont;
                page.ctx.fillText(`${price.toLocaleString('ru-RU')} ₽`, priceX, lastBaseline);
            }
            page.ctx.textAlign = 'left';
            drawLeader(page.ctx, labelEnd + 6, countX - page.ctx.measureText(`${row.count || 1} шт`).width - 6, lastBaseline);

            y += lines.length * ROW_LINE_HEIGHT + 6;
        });
        y += 8;
    });

    if (sections.length > 0) {
        newPageIfNeeded(40);
        y += 6;
        page.ctx.strokeStyle = '#e2e8f0';
        page.ctx.lineWidth = 2;
        page.ctx.beginPath();
        page.ctx.moveTo(MARGIN, y);
        page.ctx.lineTo(PAGE_WIDTH - MARGIN, y);
        page.ctx.stroke();
        y += 24;
        page.ctx.font = `700 14px ${FONT_FAMILY}`;
        page.ctx.fillStyle = '#203040';
        page.ctx.fillText('Итого', MARGIN, y);
        page.ctx.textAlign = 'right';
        page.ctx.fillText(`${total.toLocaleString('ru-RU')} ₽`, PAGE_WIDTH - MARGIN, y);
        page.ctx.textAlign = 'left';
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    pages.forEach((item, index) => {
        if (index > 0) pdf.addPage();
        pdf.addImage(item.canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    });
    pdf.save('commercial-offer.pdf');
};
