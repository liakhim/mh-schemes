// Local + server persistence for the planner floor plan.
// Local drafts are keyed per scheme id (or a shared 'draft' bucket when there is no scheme yet).

const localKey = (schemeId) => `mh-planner:${schemeId ?? 'draft'}`;

export const readLocalPlan = (schemeId) => {
    try {
        const raw = window.localStorage.getItem(localKey(schemeId));
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const writeLocalPlan = (schemeId, plan) => {
    try {
        window.localStorage.setItem(localKey(schemeId), JSON.stringify(plan));
    } catch {
        // ignore quota / serialization errors — server save is the source of truth
    }
};

const csrfToken = () =>
    document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

// Persists the plan to the backend via the existing scheme PATCH endpoint.
export const savePlanToServer = async (schemeId, plan) => {
    const response = await fetch(`/api/schemes/${schemeId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
        },
        body: JSON.stringify({ floor_plan: plan }),
    });
    if (!response.ok) {
        throw new Error(`Сохранение не удалось (HTTP ${response.status})`);
    }
    return response.json();
};
