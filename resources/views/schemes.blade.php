<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>MH Schemes - Schemes</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @vite(['resources/css/app.css'])
    <style>
        html,
        body {
            min-height: 100%;
        }

        body {
            min-height: 100vh;
            margin: 0;
            background: #f5f7fb;
            color: #1f2933;
        }

        .page {
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            min-height: calc(100vh - var(--nav-height));
            max-width: 1200px;
            margin: 0 auto;
            padding: 32px 20px;
        }

        .page-heading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 20px;
        }

        .scheme-search {
            width: min(340px, 100%);
            flex: 0 1 340px;
        }

        .scheme-search input {
            box-sizing: border-box;
            width: 100%;
            height: 38px;
            padding: 0 12px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            color: #1f2933;
            background: #fff;
            font: inherit;
            font-size: 14px;
            outline: none;
            transition: border-color 0.15s, box-shadow 0.15s;
        }

        .scheme-search input:focus {
            border-color: #e07020;
            box-shadow: 0 0 0 3px rgba(224, 112, 32, 0.14);
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
            background: #ea580c;
            border-color: #d97706;
            color: #fff;
            box-shadow: 0 4px 12px rgba(234, 88, 12, 0.18);
        }
        .button.warning:hover {
            background: #c2410c;
        }
        .spa-navbar > .spa-navbar-actions .button.warning {
            border-color: #d97706;
            background: #ea580c;
            box-shadow: 0 4px 12px rgba(234, 88, 12, 0.18);
        }
        .spa-navbar > .spa-navbar-actions .button.warning:hover {
            background: #c2410c;
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
            box-shadow: 0 4px 12px rgba(185, 28, 28, 0.14);
        }
        .button.danger:hover {
            background: #b91c1c;
        }
        .spa-navbar > .spa-navbar-actions .button.danger {
            border-color: #b91c1c;
            background: #dc2626;
            box-shadow: 0 4px 12px rgba(185, 28, 28, 0.14);
        }
        .spa-navbar > .spa-navbar-actions .button.danger:hover {
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
            flex: 1 1 auto;
            overflow-x: hidden;
            border: 1px solid #d7dbe4;
            border-radius: 10px;
            background: #fff;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            min-width: 0;
            table-layout: auto;
            font-size: 14px;
        }

        .scheme-col-select { width: 4%; }
        .scheme-col-id { width: 5%; }
        .scheme-col-controller { width: 9%; }
        .scheme-col-name { width: 26%; }
        .scheme-col-user { width: 7%; }
        .scheme-col-version { width: 7%; }
        .scheme-col-system { width: 11%; }
        .scheme-col-updated { width: 11%; }
        .scheme-col-actions { width: 1%; }

        th,
        td {
            padding: 12px 14px;
            border-bottom: 1px solid #edf0f5;
            text-align: left;
            vertical-align: top;
            font-size: inherit;
        }

        th {
            background: #f8fafc;
            color: #475569;
            font-weight: 700;
            line-height: 1.25;
            text-align: left;
            white-space: nowrap;
        }

        td {
            overflow-wrap: anywhere;
        }

        tr:last-child td {
            border-bottom: 0;
        }

        tbody tr td {
            transition: background-color 0.15s ease;
        }

        tbody tr:hover td {
            background: #f6f7f9;
        }

        .muted {
            color: #64748b;
        }

        .name {
            font-weight: 700;
        }

        .scheme-name-value {
            overflow-wrap: anywhere;
        }

        .description {
            flex: 1 1 auto;
            max-width: 360px;
            margin-top: 4px;
            min-width: 0;
            overflow: hidden;
            color: #64748b;
            font-size: 12px;
            font-weight: 400;
            line-height: 1.35;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .description-row {
            display: flex;
            min-width: 0;
            align-items: center;
            gap: 7px;
        }

        .description-view-button {
            flex: 0 0 auto;
            padding: 0;
            border: 0;
            color: #2563eb;
            background: transparent;
            cursor: pointer;
            font-size: 11px;
            font-weight: 700;
        }

        .description-view-button:hover {
            text-decoration: underline;
        }

        .description-full-text {
            margin: 0;
            color: #334155;
            font-size: 14px;
            line-height: 1.55;
            overflow-wrap: anywhere;
            white-space: pre-wrap;
        }

        .row-actions {
            display: flex;
            flex-wrap: nowrap;
            align-items: center;
            justify-content: flex-end;
            gap: 4px;
        }

        td:last-child {
            text-align: right;
            white-space: nowrap;
        }

        .button.compact {
            min-height: 26px;
            padding: 0 8px;
            border-radius: 5px;
            font-size: 12px;
        }

        .updated {
            color: #64748b;
            font-size: 11px;
            white-space: nowrap;
        }

        .controller-badge {
            display: inline-flex;
            align-items: center;
            min-height: 24px;
            padding: 2px 8px;
            border: 1px solid #bfdbfe;
            border-radius: 999px;
            color: #1d4ed8;
            background: #eff6ff;
            font-size: 12px;
            font-weight: 700;
            white-space: nowrap;
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
        .controller-grid {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 10px;
        }
        .controller-option {
            position: relative;
            min-width: 0;
            margin: 0;
            cursor: pointer;
        }
        .controller-option input {
            position: absolute;
            width: 1px;
            height: 1px;
            opacity: 0;
            pointer-events: none;
        }
        .controller-option-body {
            display: flex;
            min-height: 128px;
            align-items: center;
            justify-content: space-between;
            flex-direction: column;
            gap: 10px;
            padding: 12px 8px 10px;
            border: 2px solid #d7dbe4;
            border-radius: 9px;
            color: #334155;
            background: #fff;
            transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
        }
        .controller-option-body img {
            width: 100%;
            height: 88px;
            object-fit: contain;
        }
        .controller-option-body strong {
            font-size: 13px;
        }
        .controller-option:hover .controller-option-body {
            border-color: #93c5fd;
            background: #f8fbff;
        }
        .controller-option input:checked + .controller-option-body {
            border-color: #2563eb;
            background: #eff6ff;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .controller-option input:focus-visible + .controller-option-body {
            outline: 3px solid rgba(37, 99, 235, 0.2);
            outline-offset: 2px;
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

        @media (max-width: 900px) {
            .page {
                padding: 18px 12px;
            }
            h1 {
                font-size: 22px;
            }
            .page-heading {
                align-items: stretch;
                flex-direction: column;
                gap: 12px;
            }
            .scheme-search {
                width: 100%;
                flex-basis: auto;
            }
            .table-wrap {
                overflow: visible;
                border: 0;
                background: transparent;
            }
            table,
            tbody,
            tr,
            td {
                display: block;
                width: 100%;
            }
            table {
                min-width: 0;
            }
            thead {
                display: none;
            }
            tbody {
                display: grid;
                gap: 12px;
            }
            tbody tr {
                box-sizing: border-box;
                overflow: hidden;
                border: 1px solid #d7dbe4;
                border-radius: 10px;
                background: #fff;
                box-shadow: 0 5px 16px rgba(15, 23, 42, 0.05);
            }
            tbody tr:hover td {
                background: #f6f7f9;
            }
            tbody td {
                box-sizing: border-box;
                display: grid;
                grid-template-columns: 112px minmax(0, 1fr);
                gap: 10px;
                padding: 9px 12px;
                border-bottom: 1px solid #edf0f5;
            }
            tbody td::before {
                content: attr(data-label);
                color: #64748b;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
            }
            tbody td:first-child {
                display: flex;
                justify-content: flex-end;
            }
            tbody td:first-child::before,
            tbody td:last-child::before {
                display: none;
            }
            tbody td:last-child {
                display: block;
            }
            .description {
                max-width: none;
            }
            .row-actions {
                padding-bottom: 2px;
            }
            .controller-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }
    </style>
</head>
<body>
    <nav class="spa-navbar">
        <div class="spa-navbar-brand">
            <a href="{{ route('home') }}" class="spa-navbar-logo-link" aria-label="MyHeat — главная">
                <img src="{{ Vite::asset('resources/assets/logo/logo.svg') }}" alt="MyHeat" class="spa-navbar-logo">
            </a>
            <div class="spa-alpha-notice">
                <span>Приложение находится <u>в стадии альфа-тестирования</u>, все вопросы к разработчику:</span>
                <a href="https://t.me/mmingareev" target="_blank" rel="noreferrer">Telegram</a>
            </div>
        </div>
        <div class="spa-navbar-actions">
            <button class="button warning" id="emptySchemeBtn" type="button">Открыть пустую схему</button>
            <button class="button danger" id="deleteSelectedBtn" type="button" disabled>Удалить выбранные</button>
        </div>
    </nav>
    <main class="page">
        <div class="page-heading">
            <h1>Сохраненные схемы</h1>
            <form class="scheme-search" id="schemeSearchForm" method="get" action="{{ route('schemes.index') }}" role="search">
                <input
                    id="schemeSearchInput"
                    name="search"
                    type="search"
                    value="{{ $search }}"
                    placeholder="Поиск по названию"
                    autocomplete="off"
                    aria-label="Поиск схем по названию"
                >
            </form>
        </div>

        <div class="table-wrap">
            @if ($schemes->isEmpty())
                <div class="empty">Сохраненных схем пока нет.</div>
            @else
                <table>
                    <colgroup>
                        <col class="scheme-col-select">
                        <col class="scheme-col-id">
                        <col class="scheme-col-controller">
                        <col class="scheme-col-name">
                        <col class="scheme-col-user">
                        <col class="scheme-col-version">
                        <col class="scheme-col-system">
                        <col class="scheme-col-updated">
                        <col class="scheme-col-actions">
                    </colgroup>
                    <thead>
                         <tr>
                             <th><input class="scheme-select" id="selectAllSchemes" type="checkbox" aria-label="Выбрать все схемы"></th>
                              <th>ID</th>
                             <th>Контроллер</th>
                             <th>Название</th>
                            <th>User ID</th>
                            <th>Версия</th>
                             <th>Device ID</th>
                            <th>Обновлена</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($schemes as $scheme)
                            @php
                                $controller = data_get($scheme->incoming_scheme, 'controller');
                                $controllerType = strtolower((string) (is_array($controller) ? ($controller['type'] ?? '') : $controller));
                                $controllerLabel = match ($controllerType) {
                                    'go' => 'GO',
                                    'go+' => 'GO+',
                                    'smart2' => 'Smart2',
                                    'pro' => 'PRO',
                                    'ecosmart' => 'ECOsmart',
                                    default => $controllerType !== '' ? strtoupper($controllerType) : '—',
                                };
                                $description = (string) ($scheme->description ?? '');
                            @endphp
                             <tr class="scheme-row" data-update-url="{{ route('schemes.update', ['scheme' => $scheme]) }}">
                                 <td data-label="Выбор"><input class="scheme-select scheme-select-item" type="checkbox" value="{{ $scheme->id }}" aria-label="Выбрать схему {{ $scheme->name }}"></td>
                                  <td data-label="ID">{{ $scheme->id }}</td>
                                <td data-label="Контроллер"><span class="controller-badge">{{ $controllerLabel }}</span></td>
                                <td class="name" data-label="Название">
                                    <div class="scheme-name-value">{{ $scheme->name }}</div>
                                    <div class="description-row">
                                        <div class="description scheme-description-value">{{ $description !== '' ? $description : 'Без описания' }}</div>
                                        <button
                                            class="description-view-button"
                                            type="button"
                                            data-description="{{ $description }}"
                                            hidden
                                        >Посмотреть</button>
                                    </div>
                                </td>
                                <td data-label="User ID">{{ $scheme->user_id ?? '—' }}</td>
                                <td data-label="Версия">{{ $scheme->version }}</td>
                                <td data-label="Device ID">
                                    <span class="system-device-value">{{ $scheme->system_device_id ?? '—' }}</span>
                                </td>
                                <td class="updated" data-label="Обновлена">{{ optional($scheme->updated_at)->format('Y-m-d H:i') }}</td>
                                  <td data-label="Действия"><div class="row-actions">
                                      <a class="button compact info" href="{{ route('scheme.with-id', ['scheme' => $scheme]) }}" target="_blank">Открыть</a>
                                       <button
                                           class="button compact edit-scheme-button"
                                           type="button"
                                           aria-label="Изменить схему"
                                           title="Изменить"
                                           data-name="{{ $scheme->name }}"
                                           data-description="{{ $scheme->description }}"
                                           data-system-device-id="{{ $scheme->system_device_id }}"
                                       ><span class="scheme-settings-icon" aria-hidden="true"></span></button>
                                       <button
                                           class="button compact danger delete-scheme-button"
                                          type="button"
                                          aria-label="Удалить схему"
                                          title="Удалить"
                                          data-url="{{ route('schemes.destroy', ['scheme' => $scheme]) }}"
                                          data-name="{{ $scheme->name }}"
                                       ><span class="scheme-trash-icon" aria-hidden="true"></span></button>
                                  </div></td>
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
                <h2>Выберите контроллер</h2>
                <form id="controllerForm">
                    <div class="controller-grid">
                        @foreach ([
                            ['type' => 'go', 'label' => 'GO', 'asset' => 'resources/assets/controllers/go/go.svg'],
                            ['type' => 'go+', 'label' => 'GO+', 'asset' => 'resources/assets/controllers/go+/go+.svg'],
                            ['type' => 'smart2', 'label' => 'Smart2', 'asset' => 'resources/assets/controllers/smart2/smart2.svg'],
                            ['type' => 'pro', 'label' => 'PRO', 'asset' => 'resources/assets/controllers/pro/pro.svg'],
                            ['type' => 'ecosmart', 'label' => 'ECOsmart', 'asset' => 'resources/assets/controllers/ecosmart/ecosmart.svg'],
                        ] as $controller)
                            <label class="controller-option">
                                <input type="radio" name="controller" value="{{ $controller['type'] }}">
                                <span class="controller-option-body">
                                    <img src="{{ Vite::asset($controller['asset']) }}" alt="Контроллер {{ $controller['label'] }}">
                                    <strong>{{ $controller['label'] }}</strong>
                                </span>
                            </label>
                        @endforeach
                    </div>
                    <div class="error" id="formError"></div>
                    <div class="actions">
                        <button class="button" type="button" id="cancelBtn">Отмена</button>
                        <button class="button primary" type="submit" id="continueBtn" disabled>Продолжить</button>
                    </div>
                </form>
            </div>
        </div>

        <div class="overlay" id="editModalOverlay">
            <div class="modal">
                <h2>Изменить схему</h2>
                <form id="editSchemeForm">
                    <div class="field">
                        <label for="editSchemeName">Название</label>
                        <input id="editSchemeName" type="text" maxlength="255" required>
                    </div>
                    <div class="field">
                        <label for="editSchemeDescription">Описание</label>
                        <textarea id="editSchemeDescription" maxlength="65535" placeholder="Без описания"></textarea>
                    </div>
                    <div class="field">
                        <label for="editSystemDeviceId">System Device ID</label>
                        <input id="editSystemDeviceId" type="number" step="1" placeholder="Не задан">
                    </div>
                    <div class="error" id="editFormError"></div>
                    <div class="actions">
                        <button class="button" type="button" id="cancelEditModalBtn">Отмена</button>
                        <button class="button primary" type="submit" id="saveEditModalBtn">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>

        <div class="overlay" id="descriptionModalOverlay">
            <div class="modal">
                <h2>Описание схемы</h2>
                <p class="description-full-text" id="descriptionFullText"></p>
                <div class="actions">
                    <button class="button primary" type="button" id="closeDescriptionModalBtn">Закрыть</button>
                </div>
            </div>
        </div>

        <div class="toast" id="toast"></div>
    </main>

    <script>
        (function() {
            const overlay = document.getElementById('modalOverlay');
            const emptySchemeBtn = document.getElementById('emptySchemeBtn');
            const cancelBtn = document.getElementById('cancelBtn');
            const form = document.getElementById('controllerForm');
            const errorEl = document.getElementById('formError');
            const continueBtn = document.getElementById('continueBtn');
            const controllerOptions = document.querySelectorAll('input[name="controller"]');
             const toast = document.getElementById('toast');
             const deleteButtons = document.querySelectorAll('.delete-scheme-button');
             const editButtons = document.querySelectorAll('.edit-scheme-button');
             const editModalOverlay = document.getElementById('editModalOverlay');
             const editSchemeForm = document.getElementById('editSchemeForm');
             const editSchemeName = document.getElementById('editSchemeName');
             const editSchemeDescription = document.getElementById('editSchemeDescription');
             const editSystemDeviceId = document.getElementById('editSystemDeviceId');
             const editFormError = document.getElementById('editFormError');
             const saveEditModalBtn = document.getElementById('saveEditModalBtn');
             const cancelEditModalBtn = document.getElementById('cancelEditModalBtn');
             const descriptionButtons = document.querySelectorAll('.description-view-button');
             const descriptionModalOverlay = document.getElementById('descriptionModalOverlay');
             const descriptionFullText = document.getElementById('descriptionFullText');
             const closeDescriptionModalBtn = document.getElementById('closeDescriptionModalBtn');
             const selectAllSchemes = document.getElementById('selectAllSchemes');
             const schemeSelectionItems = document.querySelectorAll('.scheme-select-item');
             const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
             const schemeSearchForm = document.getElementById('schemeSearchForm');
             const schemeSearchInput = document.getElementById('schemeSearchInput');
             let schemeSearchTimer = null;

             function selectedSchemeIds() {
                 return Array.from(schemeSelectionItems)
                     .filter(function(item) { return item.checked; })
                     .map(function(item) { return Number(item.value); });
             }

             function applySchemeSearch() {
                 const targetUrl = new URL(schemeSearchForm.action, window.location.origin);
                 const searchValue = schemeSearchInput.value.trim();
                 if (searchValue) targetUrl.searchParams.set('search', searchValue);
                 window.location.assign(targetUrl.toString());
             }

             schemeSearchForm.addEventListener('submit', function(event) {
                 event.preventDefault();
                 window.clearTimeout(schemeSearchTimer);
                 applySchemeSearch();
             });

             schemeSearchInput.addEventListener('input', function() {
                 window.clearTimeout(schemeSearchTimer);
                 schemeSearchTimer = window.setTimeout(applySchemeSearch, 400);
             });

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
                continueBtn.disabled = true;
            }

            function closeModal() {
                overlay.classList.remove('open');
            }

            function showToast(msg) {
                toast.textContent = msg;
                toast.classList.add('show');
                setTimeout(function() { toast.classList.remove('show'); }, 2500);
            }

            emptySchemeBtn.addEventListener('click', openModal);
            cancelBtn.addEventListener('click', closeModal);
            controllerOptions.forEach(function(option) {
                option.addEventListener('change', function() {
                    continueBtn.disabled = !form.elements.controller.value;
                });
            });
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

             function closeEditModal() {
                 editModalOverlay.classList.remove('open');
                 editSchemeForm.dataset.rowIndex = '';
                 editFormError.textContent = '';
             }

             function closeDescriptionModal() {
                 descriptionModalOverlay.classList.remove('open');
                 descriptionFullText.textContent = '';
             }

             function syncDescriptionButton(button) {
                 const descriptionValue = button.dataset.description || '';
                 const descriptionElement = button.closest('.description-row')?.querySelector('.scheme-description-value');
                 button.hidden = true;
                 if (!descriptionValue || !descriptionElement) return;
                 button.hidden = descriptionElement.scrollWidth <= descriptionElement.clientWidth;
             }

             descriptionButtons.forEach(function(button) {
                 syncDescriptionButton(button);
                 button.addEventListener('click', function() {
                     descriptionFullText.textContent = button.dataset.description || 'Без описания';
                     descriptionModalOverlay.classList.add('open');
                 });
             });
             window.addEventListener('resize', function() {
                 descriptionButtons.forEach(syncDescriptionButton);
             });

             closeDescriptionModalBtn.addEventListener('click', closeDescriptionModal);
             descriptionModalOverlay.addEventListener('click', function(event) {
                 if (event.target === descriptionModalOverlay) closeDescriptionModal();
             });

             editButtons.forEach(function(button, index) {
                 button.addEventListener('click', function() {
                     editSchemeForm.dataset.rowIndex = String(index);
                     editSchemeName.value = button.dataset.name || '';
                     editSchemeDescription.value = button.dataset.description || '';
                     editSystemDeviceId.value = button.dataset.systemDeviceId || '';
                     editFormError.textContent = '';
                     editModalOverlay.classList.add('open');
                     editSchemeName.focus();
                 });
             });

             cancelEditModalBtn.addEventListener('click', closeEditModal);
             editModalOverlay.addEventListener('click', function(event) {
                 if (event.target === editModalOverlay) closeEditModal();
             });

             editSchemeForm.addEventListener('submit', function(event) {
                 event.preventDefault();
                 const rowIndex = Number(editSchemeForm.dataset.rowIndex);
                 const editButton = editButtons[rowIndex];
                 const row = editButton?.closest('.scheme-row');
                 if (!row) return;
                 const name = editSchemeName.value.trim();
                 const systemDeviceText = editSystemDeviceId.value.trim();

                 editFormError.textContent = '';
                 if (!name) {
                     editFormError.textContent = 'Название не может быть пустым';
                     editSchemeName.focus();
                     return;
                 }
                 if (systemDeviceText && !/^-?\d+$/.test(systemDeviceText)) {
                     editFormError.textContent = 'System Device ID должен быть целым числом';
                     editSystemDeviceId.focus();
                     return;
                 }

                 saveEditModalBtn.disabled = true;
                 saveEditModalBtn.textContent = 'Сохранение...';
                 fetch(row.dataset.updateUrl, {
                     method: 'PATCH',
                     headers: {
                         'Content-Type': 'application/json',
                         'X-CSRF-TOKEN': '{{ csrf_token() }}',
                         'Accept': 'application/json',
                     },
                     body: JSON.stringify({
                         name: name,
                         description: editSchemeDescription.value.trim() || null,
                         system_device_id: systemDeviceText ? Number(systemDeviceText) : null,
                     }),
                 })
                 .then(function(response) {
                     return response.json().then(function(body) {
                         if (!response.ok) throw new Error(body.message || 'Не удалось сохранить изменения');
                         return body;
                     });
                 })
                 .then(function(body) {
                     row.querySelector('.scheme-name-value').textContent = body.name;
                     row.querySelector('.scheme-description-value').textContent = body.description || 'Без описания';
                     row.querySelector('.system-device-value').textContent = body.system_device_id ?? '—';
                     if (body.updated_at) row.querySelector('.updated').textContent = body.updated_at;
                     editButton.dataset.name = body.name;
                     editButton.dataset.description = body.description || '';
                     editButton.dataset.systemDeviceId = body.system_device_id ?? '';
                     row.querySelector('.delete-scheme-button').dataset.name = body.name;
                     const descriptionButton = row.querySelector('.description-view-button');
                     descriptionButton.dataset.description = body.description || '';
                     syncDescriptionButton(descriptionButton);
                     closeEditModal();
                     showToast('Изменения сохранены');
                 })
                 .catch(function(saveError) {
                     editFormError.textContent = saveError.message || 'Не удалось сохранить изменения';
                 })
                 .finally(function() {
                     saveEditModalBtn.disabled = false;
                     saveEditModalBtn.textContent = 'Сохранить';
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
                const controllerType = form.elements.controller.value;
                if (!controllerType) return;
                const targetUrl = new URL('{{ route('scheme') }}', window.location.origin);
                targetUrl.searchParams.set('controller', controllerType);
                window.location.assign(targetUrl.toString());
            });
        })();
    </script>
</body>
</html>
