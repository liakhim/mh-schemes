export const stagePdfDownload = async ({
    stage,
    gridLayer,
    commentIconNodeName,
    selectedSlotHighlightNode,
    showEmptySlots,
    onShowEmptySlotsChange,
    showGrid,
    equipmentRows,
    schemeMetadata,
}) => {
    const shouldHideEmptySlots = showEmptySlots;
    let commentIconNodes = [];
    let shouldHideGrid = false;
    let shouldHideSelectedSlotHighlight = false;
    let stagePosition;
    let stageScale;

    try {
        if (shouldHideEmptySlots) {
            onShowEmptySlotsChange(false);
            await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
        }

        if (!stage) return;

        shouldHideGrid = showGrid && gridLayer;
        commentIconNodes = stage.find(`.${commentIconNodeName}`).filter((node) => node.visible());
        shouldHideSelectedSlotHighlight = selectedSlotHighlightNode
            && !selectedSlotHighlightNode.isDestroyed?.()
            && selectedSlotHighlightNode.visible();
        stagePosition = stage.position();
        stageScale = stage.scale();

        if (shouldHideGrid) gridLayer.visible(false);
        commentIconNodes.forEach((node) => node.visible(false));
        if (shouldHideSelectedSlotHighlight) selectedSlotHighlightNode.visible(false);
        stage.position({ x: 0, y: 0 });
        stage.scale({ x: 1, y: 1 });
        stage.draw();

        const { downloadStagePdf } = await import('./pdfExport');
        await downloadStagePdf(stage, equipmentRows, schemeMetadata);
    } finally {
        if (shouldHideEmptySlots) onShowEmptySlotsChange(true);
        if (!stage) return;

        if (shouldHideGrid) gridLayer.visible(true);
        commentIconNodes.forEach((node) => node.visible(true));
        if (shouldHideSelectedSlotHighlight && !selectedSlotHighlightNode.isDestroyed?.()) {
            selectedSlotHighlightNode.visible(true);
        }
        if (stagePosition) stage.position(stagePosition);
        if (stageScale) stage.scale(stageScale);
        stage.batchDraw();
    }
};
