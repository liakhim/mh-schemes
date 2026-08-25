<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>MyHeat - Подбор оборудования</title>
    @vite(['resources/css/app.css'])
</head>
<body class="account-page services-page">
    <header class="sel-liquid-header">
        <div class="sel-liquid-header-shine" aria-hidden="true"></div>
        <div class="sel-liquid-header-inner">
            <a class="sel-header-brand" href="{{ route('user-schemes') }}" aria-label="MyHeat, созданные схемы">
                <img src="{{ Vite::asset('resources/assets/logo/logo.svg') }}" alt="MyHeat">
                <span>Личный кабинет</span>
            </a>
        </div>
    </header>
    <main class="account-shell">
        <aside class="account-sidebar" aria-label="Навигация аккаунта">
            <nav class="account-navigation">
                <a href="{{ route('settings') }}">
                    <img src="{{ Vite::asset('resources/assets/icons/settings.svg') }}" alt="" aria-hidden="true">
                    <span>Настройки аккаунта</span>
                </a>
                <a class="is-active" href="{{ route('user-schemes') }}" aria-current="page">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h.01M12 9h.01M16 9h.01M8 15h.01M12 15h.01M16 15h.01" /></svg>
                    <span>Подбор оборудования</span>
                </a>
            </nav>
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
                        <td><a href="{{ route('scheme.with-id', $scheme) }}" target="_blank" rel="noopener">Открыть</a></td>
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
