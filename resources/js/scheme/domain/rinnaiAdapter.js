export const RINNAI_ADAPTER_LABEL = 'Переходник Rinnai';
export const RINNAI_ADAPTER_PRICE = 4990;

export const usesRinnaiAdapter = (boiler) => (
    String(boiler?.adapter?.type || '').toLowerCase() === 'rinnai'
    || String(boiler?.name || '').toLowerCase().includes('rinnai')
);

export const withRinnaiAdapter = (boiler) => (
    usesRinnaiAdapter(boiler)
        ? { ...boiler, adapter: { ...boiler?.adapter, type: 'rinnai' } }
        : boiler
);

export const getRinnaiBusSlotYOffset = (controllerType, boiler, indentSize) => (
    usesRinnaiAdapter(boiler) && (controllerType === 'go' || controllerType === 'go+')
        ? 10 * indentSize
        : 0
);

export const countRinnaiAdapters = (boilers) => (
    Array.isArray(boilers) ? boilers.filter(usesRinnaiAdapter).length : 0
);
