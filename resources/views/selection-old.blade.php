<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Подбор оборудования для системы отопления - MyHeat</title>
    @if (app()->environment('local'))
    <script type="module">
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    </script>
    @endif
    @vite(['resources/css/app.css', 'resources/css/selection-old.css', 'resources/js/selection-old.jsx'])
</head>
<body class="old-shell">
    <header class="old-shell-nav">
        <a class="old-shell-logo-badge" href="{{ route('home') }}" aria-label="MyHeat — главная">
            <img src="{{ Vite::asset('resources/assets/logo/logo.svg') }}" alt="MyHeat">
        </a>
        <span class="old-shell-nav-title">Подбор оборудования</span>
    </header>

    <section class="old-shell-hero">
        <div class="old-shell-breadcrumb">
            <a href="/">Главная</a> / <span>Подбор оборудования</span>
        </div>
        <div class="old-shell-hero-inner">
            <h1>Подбор оборудования для системы отопления</h1>
            <p>Позволит легко и просто подобрать необходимое оборудование для автоматизации вашей системы отопления</p>
        </div>
    </section>

    <main class="old-shell-main">
        <div id="selection-app"></div>
    </main>

    <footer class="old-shell-footer">
        © MyHeat {{ date('Y') }}, Все права защищены
    </footer>
</body>
</html>
