<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>MyHeat - Выполненные работы</title>
    @vite(['resources/css/app.css'])
</head>
<body class="account-page services-page cases-page">
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
                <input class="account-menu-checkbox" id="cases-account-menu" type="checkbox" aria-label="Открыть навигацию аккаунта">
                <label class="account-menu-toggle" for="cases-account-menu">
                    <span class="account-menu-toggle-icon" aria-hidden="true"><span></span><span></span><span></span></span>
                    <span class="account-menu-toggle-copy"><strong>Меню</strong><small>Выполненные работы</small></span>
                    <span class="account-menu-toggle-chevron" aria-hidden="true"></span>
                </label>
                @include('partials.account-navigation')
            </div>
        </aside>
        <section class="services-content selection-dashboard" aria-labelledby="cases-title">
            <div class="selection-dashboard-heading">
                <div>
                    <h1 id="cases-title">Выполненные работы</h1>
                    <p>Здесь будут отображаться выполненные работы.</p>
                </div>
            </div>
        </section>
    </main>
</body>
</html>
