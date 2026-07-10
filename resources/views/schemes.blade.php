<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>MH Schemes - Schemes</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @vite(['resources/css/app.css'])
    <style>
        body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: #f5f7fb;
            color: #1f2933;
        }

        .page {
            max-width: 1200px;
            margin: 0 auto;
            padding: 32px 20px;
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 20px;
        }

        h1 {
            margin: 0;
            font-size: 26px;
        }

        .button {
            display: inline-flex;
            align-items: center;
            min-height: 34px;
            padding: 0 12px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            background: #fff;
            color: #1f2933;
            text-decoration: none;
            font-size: 14px;
            cursor: pointer;
        }
        .button.warning {
            background: #fbbf24;
            border-color: #f59e0b;
            color: #92400e;
        }
        .button.warning:hover {
            background: #f59e0b;
        }
        .button.success {
            background: #22c55e;
            border-color: #16a34a;
            color: #fff;
        }
        .button.success:hover {
            background: #16a34a;
        }
        .button.info {
            background: #38bdf8;
            border-color: #0ea5e9;
            color: #fff;
        }
        .button.info:hover {
            background: #0ea5e9;
        }
        .button.danger {
            background: #dc2626;
            border-color: #b91c1c;
            color: #fff;
        }
        .button.danger:hover {
            background: #b91c1c;
        }
        .button:disabled {
            cursor: not-allowed;
            opacity: 0.65;
        }
        .scheme-select {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }

        .table-wrap {
            overflow-x: auto;
            border: 1px solid #d7dbe4;
            border-radius: 10px;
            background: #fff;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            min-width: 900px;
        }

        th,
        td {
            padding: 12px 14px;
            border-bottom: 1px solid #edf0f5;
            text-align: left;
            vertical-align: top;
            font-size: 14px;
        }

        th {
            background: #f8fafc;
            color: #475569;
            font-weight: 700;
            white-space: nowrap;
        }

        tr:last-child td {
            border-bottom: 0;
        }

        .muted {
            color: #64748b;
        }

        .name {
            font-weight: 700;
        }

        .description {
            max-width: 360px;
        }

        .empty {
            padding: 24px;
            color: #64748b;
            text-align: center;
        }

        .overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.35);
            z-index: 1000;
            justify-content: center;
            align-items: center;
        }
        .overlay.open {
            display: flex;
        }
        .modal {
            background: #fff;
            border-radius: 10px;
            padding: 24px;
            width: 560px;
            max-width: 94vw;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 8px 30px rgba(0,0,0,0.18);
        }
        .modal h2 {
            margin: 0 0 20px;
            font-size: 20px;
        }
        .modal label {
            display: block;
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 4px;
            color: #475569;
        }
        .modal input,
        .modal textarea {
            display: block;
            width: 100%;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 14px;
            font-family: inherit;
            box-sizing: border-box;
        }
        .modal textarea {
            min-height: 200px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            resize: vertical;
        }
        .modal .field {
            margin-bottom: 14px;
        }
        .modal .actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 20px;
        }
        .modal .actions .button.primary {
            background: #2563eb;
            color: #fff;
            border-color: #2563eb;
        }
        .modal .actions .button.primary:hover {
            background: #1d4ed8;
        }
        .modal .error {
            color: #dc2626;
            font-size: 13px;
            margin-top: 4px;
        }
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #16a34a;
            color: #fff;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 2000;
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
        }
        .toast.show {
            opacity: 1;
        }

        .pagination-wrap {
            margin-top: 20px;
            display: flex;
            justify-content: center;
        }
        .pagination-wrap nav {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .pagination-wrap .small.text-muted {
            color: #64748b;
            font-size: 13px;
        }
        .pagination-wrap ul.pagination {
            display: flex;
            gap: 4px;
            list-style: none;
            margin: 0;
            padding: 0;
        }
        .pagination-wrap .page-item .page-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 34px;
            height: 34px;
            padding: 0 8px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            background: #fff;
            color: #1f2933;
            font-size: 14px;
            text-decoration: none;
        }
        .pagination-wrap .page-item.active .page-link {
            background: #2563eb;
            color: #fff;
            border-color: #2563eb;
        }
        .pagination-wrap .page-item.disabled .page-link {
            color: #94a3b8;
            cursor: default;
        }
        .pagination-wrap .page-item:not(.disabled):not(.active) .page-link:hover {
            background: #f1f5f9;
        }

        @media (max-width: 700px) {
            .header {
                align-items: flex-start;
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <main class="page">
        <div class="header">
            <h1>Сохраненные схемы</h1>
             <div style="display:flex;gap:8px">
                 <a class="button warning" href="{{ route('scheme') }}">Открыть пустую схему</a>
                 <button class="button danger" id="deleteSelectedBtn" type="button" disabled>Удалить выбранные</button>
                 <button class="button success" id="createBtn" type="button">Создать схему</button>
            </div>
        </div>

        <div class="table-wrap">
            @if ($schemes->isEmpty())
                <div class="empty">Сохраненных схем пока нет.</div>
            @else
                <table>
                    <thead>
                         <tr>
                             <th><input class="scheme-select" id="selectAllSchemes" type="checkbox" aria-label="Выбрать все схемы"></th>
                             <th>ID</th>
                            <th>Название</th>
                            <th>Описание</th>
                            <th>User ID</th>
                            <th>Версия</th>
                            <th>System Device ID</th>
                            <th>Обновлена</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($schemes as $scheme)
                             <tr>
                                 <td><input class="scheme-select scheme-select-item" type="checkbox" value="{{ $scheme->id }}" aria-label="Выбрать схему {{ $scheme->name }}"></td>
                                 <td>{{ $scheme->id }}</td>
                                <td class="name">{{ $scheme->name }}</td>
                                <td class="description">{{ $scheme->description ?: '—' }}</td>
                                <td>{{ $scheme->user_id ?? '—' }}</td>
                                <td>{{ $scheme->version }}</td>
                                <td>{{ $scheme->system_device_id ?? '—' }}</td>
                                <td class="muted">{{ optional($scheme->updated_at)->format('Y-m-d H:i') }}</td>
                                 <td>
                                     <a class="button info" href="{{ route('scheme.with-id', ['scheme' => $scheme]) }}" target="_blank">Открыть</a>
                                     <button
                                         class="button danger delete-scheme-button"
                                         type="button"
                                         data-url="{{ route('schemes.destroy', ['scheme' => $scheme]) }}"
                                         data-name="{{ $scheme->name }}"
                                     >Удалить</button>
                                 </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @endif
        </div>

        @if ($schemes->hasPages())
            <div class="pagination-wrap">
                {{ $schemes->links('pagination::bootstrap-5') }}
            </div>
        @endif

        <div class="overlay" id="modalOverlay">
            <div class="modal">
                <h2>Создать схему</h2>
                <form id="createForm">
                    <div class="field">
                        <label for="name">Название</label>
                        <input id="name" name="name" type="text" required placeholder="Введите название схемы">
                    </div>
                    <div class="field">
                        <label for="description">Описание</label>
                        <input id="description" name="description" type="text" placeholder="Описание (необязательно)">
                    </div>
                    <div class="field">
                        <label for="incoming_scheme">Данные (incoming_scheme)</label>
                        <textarea id="incoming_scheme" name="incoming_scheme" required spellcheck="false">{
    "controller": "go",
    "boilers": [],
    "wireless_devices": [],
    "wired_devices": [],
    "sensors": [],
    "ext_modules": [],
    "di_modules": [],
    "one_wire_modules": [],
    "power_modules": ["circuit-breaker", "power-unit"],
    "wifi_modules": []
}</textarea>
                        <div class="error" id="formError"></div>
                    </div>
                    <div class="actions">
                        <button class="button" type="button" id="cancelBtn">Отмена</button>
                        <button class="button primary" type="submit" id="submitBtn">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>

        <div class="toast" id="toast"></div>
    </main>

    <script>
        (function() {
            const overlay = document.getElementById('modalOverlay');
            const createBtn = document.getElementById('createBtn');
            const cancelBtn = document.getElementById('cancelBtn');
            const form = document.getElementById('createForm');
            const errorEl = document.getElementById('formError');
            const submitBtn = document.getElementById('submitBtn');
             const toast = document.getElementById('toast');
             const deleteButtons = document.querySelectorAll('.delete-scheme-button');
             const selectAllSchemes = document.getElementById('selectAllSchemes');
             const schemeSelectionItems = document.querySelectorAll('.scheme-select-item');
             const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');

             function selectedSchemeIds() {
                 return Array.from(schemeSelectionItems)
                     .filter(function(item) { return item.checked; })
                     .map(function(item) { return Number(item.value); });
             }

             function updateBulkDeleteButton() {
                 const selectedCount = selectedSchemeIds().length;
                 deleteSelectedBtn.disabled = selectedCount === 0;
                 deleteSelectedBtn.textContent = selectedCount > 0 ? 'Удалить выбранные (' + selectedCount + ')' : 'Удалить выбранные';
                 if (selectAllSchemes) {
                     selectAllSchemes.checked = selectedCount > 0 && selectedCount === schemeSelectionItems.length;
                     selectAllSchemes.indeterminate = selectedCount > 0 && selectedCount < schemeSelectionItems.length;
                 }
             }

            function openModal() {
                overlay.classList.add('open');
                errorEl.textContent = '';
                form.reset();
            }

            function closeModal() {
                overlay.classList.remove('open');
            }

            function showToast(msg) {
                toast.textContent = msg;
                toast.classList.add('show');
                setTimeout(function() { toast.classList.remove('show'); }, 2500);
            }

            createBtn.addEventListener('click', openModal);
            cancelBtn.addEventListener('click', closeModal);
             overlay.addEventListener('click', function(e) {
                 if (e.target === overlay) closeModal();
             });

             deleteButtons.forEach(function(button) {
                 button.addEventListener('click', function() {
                     const name = button.dataset.name || 'эту схему';
                     if (!window.confirm('Удалить схему «' + name + '»?')) return;
                     button.disabled = true;
                     button.textContent = 'Удаление...';
                     fetch(button.dataset.url, {
                         method: 'DELETE',
                         headers: {
                             'X-CSRF-TOKEN': '{{ csrf_token() }}',
                             'Accept': 'application/json',
                         },
                     })
                     .then(function(response) {
                         if (!response.ok) throw new Error('Delete failed');
                         showToast('Схема удалена');
                         setTimeout(function() { location.reload(); }, 400);
                     })
                     .catch(function() {
                         button.disabled = false;
                         button.textContent = 'Удалить';
                         showToast('Не удалось удалить схему');
                     });
                 });
             });

             if (selectAllSchemes) {
                 selectAllSchemes.addEventListener('change', function() {
                     schemeSelectionItems.forEach(function(item) { item.checked = selectAllSchemes.checked; });
                     updateBulkDeleteButton();
                 });
             }
             schemeSelectionItems.forEach(function(item) {
                 item.addEventListener('change', updateBulkDeleteButton);
             });
             deleteSelectedBtn.addEventListener('click', function() {
                 const ids = selectedSchemeIds();
                 if (ids.length === 0) return;
                 if (!window.confirm('Удалить выбранные схемы (' + ids.length + ' шт.)?')) return;
                 deleteSelectedBtn.disabled = true;
                 deleteSelectedBtn.textContent = 'Удаление...';
                 fetch('{{ route('schemes.destroy-many') }}', {
                     method: 'DELETE',
                     headers: {
                         'Content-Type': 'application/json',
                         'X-CSRF-TOKEN': '{{ csrf_token() }}',
                         'Accept': 'application/json',
                     },
                     body: JSON.stringify({ ids: ids }),
                 })
                 .then(function(response) {
                     if (!response.ok) throw new Error('Bulk delete failed');
                     showToast('Выбранные схемы удалены');
                     setTimeout(function() { location.reload(); }, 400);
                 })
                 .catch(function() {
                     showToast('Не удалось удалить выбранные схемы');
                     updateBulkDeleteButton();
                 });
             });

            form.addEventListener('submit', function(e) {
                e.preventDefault();
                errorEl.textContent = '';
                submitBtn.disabled = true;
                submitBtn.textContent = 'Сохранение...';

                var data;
                try {
                    data = JSON.parse(document.getElementById('incoming_scheme').value);
                } catch (err) {
                    errorEl.textContent = 'Ошибка: incoming_scheme должен быть валидным JSON';
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Сохранить';
                    return;
                }

                fetch('{{ route('schemes.store') }}', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': '{{ csrf_token() }}',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        name: document.getElementById('name').value,
                        description: document.getElementById('description').value,
                        incoming_scheme: data,
                    }),
                })
                .then(function(r) { return r.json().then(function(j) { return { status: r.status, body: j }; }); })
                .then(function(res) {
                    if (res.status === 201) {
                        closeModal();
                        showToast('Схема «' + res.body.name + '» создана');
                        setTimeout(function() { location.reload(); }, 800);
                    } else {
                        var msg = res.body.message || 'Ошибка при создании схемы';
                        if (res.body.errors) {
                            msg = Object.values(res.body.errors).flat().join('; ');
                        }
                        errorEl.textContent = msg;
                    }
                })
                .catch(function() {
                    errorEl.textContent = 'Ошибка сети';
                })
                .finally(function() {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Сохранить';
                });
            });
        })();
    </script>
</body>
</html>
