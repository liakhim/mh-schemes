import { jsPDF } from 'jspdf';

const MYHEAT_LOGO_PATH = new URL('../../../assets/logo/logo.svg', import.meta.url).href;

const PDF_PIXEL_RATIO = 4;
const TABLE_WIDTH = 1400;
const TABLE_PADDING = 64;
const TABLE_FONT = 'Arial, sans-serif';
const A4_PORTRAIT = { width: 595.28, height: 841.89 };
const A4_LANDSCAPE = { width: A4_PORTRAIT.height, height: A4_PORTRAIT.width };
const SCHEME_PAGE_MARGIN = 24;
const CSS_PIXEL_TO_POINT = 0.75;

const wrapText = (context, value, maxWidth) => {
    const text = String(value || '');
    if (!text) return [''];
    const words = text.split(/\s+/);
    const lines = [];
    let line = '';

    words.forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        if (context.measureText(candidate).width <= maxWidth || !line) {
            line = candidate;
            return;
        }
        lines.push(line);
        line = word;
    });
    if (line) lines.push(line);
    return lines;
};

const loadImage = (source) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
});

const createTitlePageCanvas = async ({ name, description } = {}) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1240;
    canvas.height = 1754;
    const context = canvas.getContext('2d');
    const left = 112;
    const contentWidth = canvas.width - left * 2;
    const logo = await loadImage(MYHEAT_LOGO_PATH);

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#2e7d32';
    context.fillRect(0, 0, 18, canvas.height);

    if (logo) {
        const logoWidth = 260;
        const logoHeight = logoWidth * (logo.height / logo.width);
        context.drawImage(logo, left, 92, logoWidth, logoHeight);
    } else {
        context.fillStyle = '#2e7d32';
        context.font = `700 42px ${TABLE_FONT}`;
        context.fillText('MYHEAT', left, 142);
    }

    context.strokeStyle = '#dbe7d8';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(left, 246);
    context.lineTo(canvas.width - left, 246);
    context.stroke();

    context.fillStyle = '#2e7d32';
    context.font = `700 22px ${TABLE_FONT}`;
    context.letterSpacing = '2px';
    context.fillText('ПРОЕКТНАЯ ДОКУМЕНТАЦИЯ', left, 390);

    context.fillStyle = '#111827';
    context.font = `700 58px ${TABLE_FONT}`;
    const titleLines = wrapText(context, name || 'Схема автоматизации', contentWidth);
    titleLines.forEach((line, index) => context.fillText(line, left, 500 + index * 72));

    const subtitleY = 500 + titleLines.length * 72 + 26;
    context.fillStyle = '#475569';
    context.font = `400 30px ${TABLE_FONT}`;
    context.fillText('Схема автоматизации инженерных систем', left, subtitleY);

    if (description) {
        context.fillStyle = '#64748b';
        context.font = `400 25px ${TABLE_FONT}`;
        const descriptionLines = wrapText(context, description, contentWidth);
        descriptionLines.forEach((line, index) => context.fillText(line, left, subtitleY + 84 + index * 38));
    }

    context.fillStyle = '#94a3b8';
    context.font = `400 21px ${TABLE_FONT}`;
    context.fillText(
        `Сформировано ${new Intl.DateTimeFormat('ru-RU').format(new Date())}`,
        left,
        canvas.height - 106,
    );
    context.fillStyle = '#2e7d32';
    context.fillRect(left, canvas.height - 72, 92, 5);

    return canvas;
};

const createEquipmentTableCanvas = (rows) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const contentWidth = TABLE_WIDTH - TABLE_PADDING * 2;
    const firstColumnWidth = Math.round(contentWidth * 0.42);
    const secondColumnWidth = contentWidth - firstColumnWidth;
    const cellPadding = 18;
    const lineHeight = 30;
    const titleHeight = 112;
    const headerHeight = 58;

    context.font = `24px ${TABLE_FONT}`;
    const preparedRows = rows.map((row) => {
        const titleLines = wrapText(context, row.title, firstColumnWidth - cellPadding * 2);
        const commentLines = wrapText(context, row.comment, secondColumnWidth - cellPadding * 2);
        return {
            titleLines,
            commentLines,
            height: Math.max(54, Math.max(titleLines.length, commentLines.length) * lineHeight + cellPadding * 2),
        };
    });
    const emptyHeight = preparedRows.length === 0 ? 72 : 0;
    canvas.width = TABLE_WIDTH;
    canvas.height = TABLE_PADDING + titleHeight + headerHeight
        + preparedRows.reduce((sum, row) => sum + row.height, 0)
        + emptyHeight + TABLE_PADDING;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#1f2937';
    context.font = `700 42px ${TABLE_FONT}`;
    context.textBaseline = 'middle';
    context.fillText('Перечень оборудования', TABLE_PADDING, TABLE_PADDING + titleHeight / 2);

    let y = TABLE_PADDING + titleHeight;
    context.fillStyle = '#edf7e9';
    context.fillRect(TABLE_PADDING, y, contentWidth, headerHeight);
    context.strokeStyle = '#86b879';
    context.lineWidth = 2;
    context.strokeRect(TABLE_PADDING, y, contentWidth, headerHeight);
    context.beginPath();
    context.moveTo(TABLE_PADDING + firstColumnWidth, y);
    context.lineTo(TABLE_PADDING + firstColumnWidth, y + headerHeight);
    context.stroke();
    context.fillStyle = '#2e7d32';
    context.font = `700 24px ${TABLE_FONT}`;
    context.fillText('Имя инфоблока', TABLE_PADDING + cellPadding, y + headerHeight / 2);
    context.fillText('Комментарий', TABLE_PADDING + firstColumnWidth + cellPadding, y + headerHeight / 2);
    y += headerHeight;

    context.font = `24px ${TABLE_FONT}`;
    if (preparedRows.length === 0) {
        context.strokeStyle = '#cbd5e1';
        context.strokeRect(TABLE_PADDING, y, contentWidth, emptyHeight);
        context.fillStyle = '#64748b';
        context.fillText('Оборудование отсутствует', TABLE_PADDING + cellPadding, y + emptyHeight / 2);
    } else {
        preparedRows.forEach((row, index) => {
            context.fillStyle = index % 2 === 0 ? '#ffffff' : '#f8fafc';
            context.fillRect(TABLE_PADDING, y, contentWidth, row.height);
            context.strokeStyle = '#cbd5e1';
            context.strokeRect(TABLE_PADDING, y, contentWidth, row.height);
            context.beginPath();
            context.moveTo(TABLE_PADDING + firstColumnWidth, y);
            context.lineTo(TABLE_PADDING + firstColumnWidth, y + row.height);
            context.stroke();

            context.fillStyle = '#1f2937';
            row.titleLines.forEach((line, lineIndex) => {
                context.fillText(line, TABLE_PADDING + cellPadding, y + cellPadding + lineHeight * (lineIndex + 0.5));
            });
            context.fillStyle = '#475569';
            row.commentLines.forEach((line, lineIndex) => {
                context.fillText(line, TABLE_PADDING + firstColumnWidth + cellPadding, y + cellPadding + lineHeight * (lineIndex + 0.5));
            });
            y += row.height;
        });
    }

    return canvas;
};

const addContainedImage = (pdf, imageData, sourceWidth, sourceHeight, margin = 0, alignTop = false) => {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;
    const imageRatio = sourceWidth / sourceHeight;
    let outputWidth = availableWidth;
    let outputHeight = outputWidth / imageRatio;
    if (outputHeight > availableHeight) {
        outputHeight = availableHeight;
        outputWidth = outputHeight * imageRatio;
    }
    const offsetX = (pageWidth - outputWidth) / 2;
    const offsetY = alignTop ? margin : (pageHeight - outputHeight) / 2;
    pdf.addImage(imageData, 'PNG', offsetX, offsetY, outputWidth, outputHeight, undefined, 'FAST');
};

const getStageContentRect = (stage) => {
    const rects = stage.getLayers()
        .filter((layer) => layer.visible())
        .map((layer) => layer.getClientRect({ relativeTo: stage }))
        .filter((rect) => (
            Number.isFinite(rect.x)
            && Number.isFinite(rect.y)
            && Number.isFinite(rect.width)
            && Number.isFinite(rect.height)
            && rect.width > 0
            && rect.height > 0
        ));
    if (rects.length === 0) {
        return { x: 0, y: 0, width: stage.width(), height: stage.height() };
    }
    const left = Math.min(...rects.map((rect) => rect.x));
    const top = Math.min(...rects.map((rect) => rect.y));
    const right = Math.max(...rects.map((rect) => rect.x + rect.width));
    const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
    return { x: left, y: top, width: right - left, height: bottom - top };
};

const getSchemePageSize = (contentWidth, contentHeight) => {
    const minimum = contentWidth >= contentHeight ? A4_LANDSCAPE : A4_PORTRAIT;
    return {
        width: Math.max(minimum.width, contentWidth * CSS_PIXEL_TO_POINT + SCHEME_PAGE_MARGIN * 2),
        height: Math.max(minimum.height, contentHeight * CSS_PIXEL_TO_POINT + SCHEME_PAGE_MARGIN * 2),
    };
};

export const downloadStagePdf = async (stage, equipmentRows = [], schemeMetadata = {}) => {
    stage.batchDraw();
    const contentRect = getStageContentRect(stage);
    const schemeImageData = stage.toDataURL({
        x: contentRect.x,
        y: contentRect.y,
        width: contentRect.width,
        height: contentRect.height,
        pixelRatio: PDF_PIXEL_RATIO,
    });
    const tableCanvas = createEquipmentTableCanvas(equipmentRows);
    const tableImageData = tableCanvas.toDataURL('image/png');
    const titleCanvas = await createTitlePageCanvas(schemeMetadata);
    const titleImageData = titleCanvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

    addContainedImage(pdf, titleImageData, titleCanvas.width, titleCanvas.height);
    pdf.addPage('a4', 'portrait');
    addContainedImage(pdf, tableImageData, tableCanvas.width, tableCanvas.height, 24, true);
    const schemePageSize = getSchemePageSize(contentRect.width, contentRect.height);
    const schemeOrientation = schemePageSize.width >= schemePageSize.height ? 'landscape' : 'portrait';
    pdf.addPage([schemePageSize.width, schemePageSize.height], schemeOrientation);
    addContainedImage(
        pdf,
        schemeImageData,
        contentRect.width,
        contentRect.height,
        SCHEME_PAGE_MARGIN,
    );
    pdf.save('scheme-canvas.pdf');
};
