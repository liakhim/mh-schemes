import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/base.css';
import '../css/schemes.css';
import Modal from './components/Modal';
import PageShell from './components/PageShell';

const controllerLabels = {
    go: 'GO',
    'go+': 'GO+',
    smart2: 'Smart2',
    pro: 'PRO',
    ecosmart: 'ECOsmart',
};

const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
const request = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: {
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrfToken,
            ...options.headers,
        },
    });
    if (response.status === 204) return null;
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'Не удалось выполнить запрос');
    return body;
};

const getControllerLabel = (scheme) => {
    const controller = scheme.incoming_scheme?.controller;
    const type = String(typeof controller === 'string' ? controller : controller?.type || '').toLowerCase();
    return controllerLabels[type] || (type ? type.toUpperCase() : '—');
};

const formatDate = (value) => value ? new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
}).format(new Date(value)) : '—';

const SchemesApp = () => {
    const initialPage = window.__SCHEMES_PAGE__ || { data: [] };
    const [schemes, setSchemes] = useState(initialPage.data || []);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [search, setSearch] = useState(new URLSearchParams(window.location.search).get('search') || '');
    const [createOpen, setCreateOpen] = useState(false);
    const [editScheme, setEditScheme] = useState(null);
    const [description, setDescription] = useState(null);
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            const url = new URL(window.location.href);
            const nextSearch = search.trim();
            if (nextSearch) url.searchParams.set('search', nextSearch);
            else url.searchParams.delete('search');
            if (url.toString() !== window.location.href) window.location.assign(url);
        }, 400);
        return () => window.clearTimeout(timer);
    }, [search]);

    const toggleSelection = (id) => setSelectedIds((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });

    const deleteSchemes = async (ids) => {
        if (!ids.length || !window.confirm(`Удалить выбранные схемы (${ids.length} шт.)?`)) return;
        setPending(true);
        try {
            if (ids.length === 1) await request(`/api/schemes/${ids[0]}`, { method: 'DELETE' });
            else await request('/api/schemes', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids }),
            });
            setSchemes((current) => current.filter((scheme) => !ids.includes(scheme.id)));
            setSelectedIds((current) => new Set([...current].filter((id) => !ids.includes(id))));
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setPending(false);
        }
    };

    const saveEdit = async (event) => {
        event.preventDefault();
        if (!editScheme) return;
        const form = new FormData(event.currentTarget);
        const name = String(form.get('name') || '').trim();
        if (!name) return setError('Название не может быть пустым');
        setPending(true);
        setError('');
        try {
            const updated = await request(`/api/schemes/${editScheme.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description: String(form.get('description') || '').trim() || null,
                    system_device_id: String(form.get('system_device_id') || '').trim() || null,
                }),
            });
            setSchemes((current) => current.map((scheme) => scheme.id === updated.id ? { ...scheme, ...updated } : scheme));
            setEditScheme(null);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setPending(false);
        }
    };

    const openNewScheme = (event) => {
        event.preventDefault();
        const type = new FormData(event.currentTarget).get('controller');
        if (type) window.location.assign(`/scheme?controller=${encodeURIComponent(type)}`);
        else setError('Выберите контроллер');
    };

    return (
        <>
            <header className="schemes-nav">
                <a href="/user-schemes" className="schemes-brand">MyHeat</a>
                <div className="schemes-nav-actions">
                    <button className="schemes-button schemes-button-primary" type="button" onClick={() => { setError(''); setCreateOpen(true); }}>Открыть пустую схему</button>
                    <button className="schemes-button schemes-button-danger" type="button" disabled={!selectedIds.size || pending} onClick={() => deleteSchemes([...selectedIds])}>Удалить выбранные {selectedIds.size ? `(${selectedIds.size})` : ''}</button>
                </div>
            </header>
            <PageShell className="schemes-page">
                <div className="schemes-heading">
                    <h1>Сохраненные схемы</h1>
                    <input value={search} type="search" onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по названию" aria-label="Поиск схем по названию" />
                </div>
                {error && <p className="schemes-error" role="alert">{error}</p>}
                <div className="schemes-table-wrap">
                    {schemes.length === 0 ? <p className="schemes-empty">Сохраненных схем пока нет.</p> : (
                        <table className="schemes-table">
                            <thead><tr><th><input type="checkbox" checked={schemes.length > 0 && selectedIds.size === schemes.length} onChange={(event) => setSelectedIds(event.target.checked ? new Set(schemes.map((scheme) => scheme.id)) : new Set())} aria-label="Выбрать все схемы" /></th><th>ID</th><th>Контроллер</th><th>Название</th><th>Версия</th><th>Device ID</th><th>Обновлена</th><th>Действия</th></tr></thead>
                            <tbody>{schemes.map((scheme) => <tr key={scheme.id}>
                                <td data-label="Выбор"><input type="checkbox" checked={selectedIds.has(scheme.id)} onChange={() => toggleSelection(scheme.id)} aria-label={`Выбрать схему ${scheme.name}`} /></td>
                                <td data-label="ID">{scheme.id}</td><td data-label="Контроллер"><span className="schemes-badge">{getControllerLabel(scheme)}</span></td>
                                <td data-label="Название"><strong>{scheme.name}</strong><p>{scheme.description || 'Без описания'}</p>{scheme.description && <button className="schemes-link" type="button" onClick={() => setDescription(scheme.description)}>Посмотреть</button>}</td>
                                <td data-label="Версия">{scheme.version}</td><td data-label="Device ID">{scheme.system_device_id ?? '—'}</td><td data-label="Обновлена">{formatDate(scheme.updated_at)}</td>
                                <td data-label="Действия"><div className="schemes-actions"><a className="schemes-button" href={`/scheme/${scheme.id}`} target="_blank" rel="noreferrer">Открыть</a><button className="schemes-button" type="button" onClick={() => { setError(''); setEditScheme(scheme); }}>Изменить</button><button className="schemes-button schemes-button-danger" type="button" disabled={pending} onClick={() => deleteSchemes([scheme.id])}>Удалить</button></div></td>
                            </tr>)}</tbody>
                        </table>
                    )}
                </div>
            </PageShell>
            {createOpen && <Modal labelledBy="new-scheme-title" onClose={() => setCreateOpen(false)}><h2 id="new-scheme-title">Выберите контроллер</h2><form className="schemes-modal-form" onSubmit={openNewScheme}><div className="schemes-controller-grid">{Object.entries(controllerLabels).map(([type, label]) => <label key={type}><input name="controller" type="radio" value={type} />{label}</label>)}</div><div className="schemes-modal-actions"><button className="schemes-button" type="button" onClick={() => setCreateOpen(false)}>Отмена</button><button className="schemes-button schemes-button-primary" type="submit">Продолжить</button></div></form></Modal>}
            {editScheme && <Modal labelledBy="edit-scheme-title" onClose={() => setEditScheme(null)}><h2 id="edit-scheme-title">Изменить схему</h2><form className="schemes-modal-form" onSubmit={saveEdit}><label>Название<input name="name" defaultValue={editScheme.name} maxLength="255" required /></label><label>Описание<textarea name="description" defaultValue={editScheme.description || ''} /></label><label>System Device ID<input name="system_device_id" type="number" defaultValue={editScheme.system_device_id ?? ''} /></label><div className="schemes-modal-actions"><button className="schemes-button" type="button" onClick={() => setEditScheme(null)}>Отмена</button><button className="schemes-button schemes-button-primary" type="submit" disabled={pending}>Сохранить</button></div></form></Modal>}
            {description !== null && <Modal labelledBy="scheme-description-title" onClose={() => setDescription(null)}><h2 id="scheme-description-title">Описание схемы</h2><p className="schemes-description-full">{description}</p><div className="schemes-modal-actions"><button className="schemes-button schemes-button-primary" type="button" onClick={() => setDescription(null)}>Закрыть</button></div></Modal>}
        </>
    );
};

const container = document.getElementById('schemes-app');
if (container) createRoot(container).render(<SchemesApp />);
