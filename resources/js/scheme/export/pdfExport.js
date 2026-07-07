import { jsPDF } from 'jspdf';

const PDF_PIXEL_RATIO = 4;

export const downloadStagePdf = (stage) => {
    stage.batchDraw();
    const stageWidth = stage.width();
    const stageHeight = stage.height();
    const imageData = stage.toDataURL({ pixelRatio: PDF_PIXEL_RATIO });
    const orientation = stageWidth >= stageHeight ? 'landscape' : 'portrait';
    const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageRatio = stageWidth / stageHeight;
    let outputWidth = pageWidth;
    let outputHeight = outputWidth / imageRatio;
    if (outputHeight > pageHeight) {
        outputHeight = pageHeight;
        outputWidth = outputHeight * imageRatio;
    }
    const offsetX = (pageWidth - outputWidth) / 2;
    const offsetY = (pageHeight - outputHeight) / 2;
    pdf.addImage(imageData, 'PNG', offsetX, offsetY, outputWidth, outputHeight, undefined, 'FAST');
    pdf.save('scheme-canvas.pdf');
};
