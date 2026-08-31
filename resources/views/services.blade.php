<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>MyHeat - Созданные схемы</title>
    @vite(['resources/css/app.css'])
</head>
<body class="account-page services-page">
    <header class="sel-liquid-header">
        <div class="sel-liquid-header-shine" aria-hidden="true"></div>
        <div class="sel-liquid-header-inner">
            <a class="sel-header-brand" href="{{ route('user-schemes') }}" aria-label="MyHeat, созданные схемы">
                <img src="{{ Vite::asset('resources/assets/logo/logo.svg') }}" alt="MyHeat">
            </a>
            @include('partials.logout-button')
        </div>
    </header>
    <main class="account-shell">
        <aside class="account-sidebar" aria-label="Навигация аккаунта">
            <div class="account-navigation-disclosure">
                <input class="account-menu-checkbox" id="services-account-menu" type="checkbox" aria-label="Открыть навигацию аккаунта">
                <label class="account-menu-toggle" for="services-account-menu">
                    <span class="account-menu-toggle-icon" aria-hidden="true"><span></span><span></span><span></span></span>
                    <span class="account-menu-toggle-copy"><strong>Меню</strong><small>Созданные схемы</small></span>
                    <span class="account-menu-toggle-chevron" aria-hidden="true"></span>
            </label>
                @include('partials.account-navigation')
            </div>
        </aside>
        <section class="services-content selection-dashboard" aria-labelledby="selection-dashboard-title">
            <div class="selection-dashboard-heading">
                <div>
                    <h1 id="selection-dashboard-title">Созданные схемы</h1>
                    <p>Продолжайте работу с сохраненной схемой или создайте новую конфигурацию оборудования.</p>
                </div>
                <a class="selection-dashboard-action" href="{{ route('selection') }}">
                    Создать схему
                    <span aria-hidden="true">→</span>
                </a>
            </div>

            <div class="selection-dashboard-table-wrap">
                @if (session('status'))
                    <div class="selection-dashboard-status" role="status">{{ session('status') }}</div>
                @endif
                @forelse ($schemes as $scheme)
                    @if ($loop->first)
                        <table class="selection-dashboard-table">
                            <thead>
                                <tr>
                                    <th>Схема</th>
                                    <th>Контроллер</th>
                                    <th>Обновлена</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                    @endif
                    @php
                        $controller = data_get($scheme->incoming_scheme, 'controller');
                        $controllerType = is_array($controller) ? ($controller['type'] ?? null) : $controller;
                    @endphp
                    <tr>
                        <td>
                            <strong>{{ $scheme->name }}</strong>
                            @if ($scheme->description)
                                <span>{{ $scheme->description }}</span>
                            @endif
                        </td>
                        <td><span class="selection-dashboard-controller">{{ $controllerType ?: 'Не указан' }}</span></td>
                        <td>{{ $scheme->updated_at?->format('d.m.Y H:i') ?? '—' }}</td>
                        <td>
                            <div class="selection-dashboard-row-actions">
                                <div class="selection-dashboard-open-links">
                                    <a class="is-scheme" href="{{ route('scheme.with-id', $scheme) }}?view=scheme" target="_blank" rel="noopener">Схема</a>
                                    <a class="is-installation" href="{{ route('scheme.with-id', $scheme) }}?view=installation" target="_blank" rel="noopener">Инсталляция</a>
                                    <a class="is-commercial" href="{{ route('scheme.with-id', $scheme) }}?view=commercial" target="_blank" rel="noopener">Коммерческое предложение</a>
                                </div>
                                <form method="POST" action="{{ route('schemes.destroy', $scheme) }}" onsubmit="return window.confirm('Удалить эту схему?')">
                                    @csrf
                                    @method('DELETE')
                                    <button class="selection-dashboard-delete" type="submit" aria-label="Удалить схему" title="Удалить схему">
                                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-9 0 1 14h10l1-14M10 11v6m4-6v6"></path></svg>
                                    </button>
                                </form>
                            </div>
                        </td>
                    </tr>
                    @if ($loop->last)
                            </tbody>
                        </table>
                    @endif
                @empty
                    <div class="selection-dashboard-empty">
                        <strong>Схем пока нет</strong>
                        <span>Начните подбор, чтобы собрать первую конфигурацию.</span>
                        <a href="{{ route('selection') }}">Перейти в подбор</a>
                    </div>
                @endforelse
            </div>
            @if ($schemes->hasPages())
                <nav class="selection-dashboard-pagination" aria-label="Пагинация схем">
                    @if ($schemes->onFirstPage())
                        <span class="is-disabled">← Назад</span>
                    @else
                        <a href="{{ $schemes->previousPageUrl() }}">← Назад</a>
                    @endif

                    <span class="selection-dashboard-page-status">Страница {{ $schemes->currentPage() }} из {{ $schemes->lastPage() }}</span>

                    @if ($schemes->hasMorePages())
                        <a href="{{ $schemes->nextPageUrl() }}">Вперёд →</a>
                    @else
                        <span class="is-disabled">Вперёд →</span>
                    @endif
                </nav>
            @endif
        </section>
    </main>
</body>
</html>
