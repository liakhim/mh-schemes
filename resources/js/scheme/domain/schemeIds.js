export const SCHEME_ID_VERSION = 2;

const isIdentifierValue = (value) => typeof value === 'string'
    || (typeof value === 'number' && Number.isFinite(value));

const isIdentifierField = (field) => field === 'id'
    || field === '_uid'
    || field.endsWith('_id')
    || field.endsWith('Id');

const getLegacyKey = (value) => `${typeof value}:${JSON.stringify(value)}`;

const visitObjects = (value, visitor) => {
    if (!value || typeof value !== 'object') return;
    visitor(value);
    Object.values(value).forEach((child) => visitObjects(child, visitor));
};

const buildIdMap = (scheme) => {
    const stringIds = new Set();
    const numericIds = new Set();

    visitObjects(scheme, (object) => {
        Object.entries(object).forEach(([field, value]) => {
            if ((field !== 'id' && field !== '_uid') || !isIdentifierValue(value)) return;
            if (typeof value === 'string') stringIds.add(value);
            else numericIds.add(value);
        });
    });

    const occupied = new Set(stringIds);
    const idMap = new Map([...stringIds].map((id) => [getLegacyKey(id), id]));
    [...numericIds].sort((left, right) => left - right).forEach((id) => {
        const rawId = String(id);
        let normalizedId = rawId;
        while (occupied.has(normalizedId)) normalizedId = `legacy-number:${normalizedId}`;
        occupied.add(normalizedId);
        idMap.set(getLegacyKey(id), normalizedId);
    });
    return idMap;
};

const normalizeValue = (value, idMap) => {
    if (Array.isArray(value)) return value.map((item) => normalizeValue(item, idMap));
    if (!value || typeof value !== 'object') return value;

    return Object.fromEntries(Object.entries(value).map(([field, child]) => {
        if (isIdentifierField(field) && isIdentifierValue(child)) {
            return [field, idMap.get(getLegacyKey(child)) ?? String(child)];
        }
        return [field, normalizeValue(child, idMap)];
    }));
};

const preserveCollidingInstallationKeys = (scheme, idMap) => {
    const layout = scheme?.installation_layout;
    if (!Array.isArray(layout?.items)) return scheme;

    const additionalItems = [];
    idMap.forEach((normalizedId, legacyKey) => {
        if (!legacyKey.startsWith('number:')) return;
        const numericId = JSON.parse(legacyKey.slice('number:'.length));
        if (normalizedId === String(numericId)) return;
        const suffix = `:id:${numericId}`;
        layout.items.forEach((item) => {
            if (typeof item?.key === 'string' && item.key.endsWith(suffix)) {
                additionalItems.push({ ...item, key: `${item.key.slice(0, -suffix.length)}:id:${normalizedId}` });
            }
        });
    });
    if (additionalItems.length === 0) return scheme;

    const existingKeys = new Set(layout.items.map((item) => item?.key));
    return {
        ...scheme,
        installation_layout: {
            ...layout,
            items: [
                ...layout.items,
                ...additionalItems.filter((item) => !existingKeys.has(item.key)),
            ],
        },
    };
};

/** Converts persisted device and reference IDs to one collision-safe string format. */
export const normalizeSchemeIds = (sourceScheme) => {
    if (!sourceScheme || typeof sourceScheme !== 'object' || Array.isArray(sourceScheme)) return sourceScheme;
    const idMap = buildIdMap(sourceScheme);
    const normalized = normalizeValue(sourceScheme, idMap);
    return {
        ...preserveCollidingInstallationKeys(normalized, idMap),
        id_schema_version: SCHEME_ID_VERSION,
    };
};
