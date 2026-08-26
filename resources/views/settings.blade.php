<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>MyHeat - Настройки аккаунта</title>
    @vite(['resources/css/app.css'])
</head>
<body class="account-page account-settings-page">
    <header class="sel-liquid-header">
        <div class="sel-liquid-header-shine" aria-hidden="true"></div>
        <div class="sel-liquid-header-inner">
            <a class="sel-header-brand" href="{{ route('user-schemes') }}" aria-label="MyHeat, созданные схемы">
                <img src="{{ Vite::asset('resources/assets/logo/logo.svg') }}" alt="MyHeat">
            </a>
        </div>
    </header>
    <main class="account-shell">
        <aside class="account-sidebar" aria-label="Навигация аккаунта">
            <div class="account-navigation-disclosure">
                <input class="account-menu-checkbox" id="settings-account-menu" type="checkbox" aria-label="Открыть навигацию аккаунта">
                <label class="account-menu-toggle" for="settings-account-menu">
                    <span class="account-menu-toggle-icon" aria-hidden="true"><span></span><span></span><span></span></span>
                    <span class="account-menu-toggle-copy"><strong>Меню</strong><small>Настройки аккаунта</small></span>
                    <span class="account-menu-toggle-chevron" aria-hidden="true"></span>
                </label>
            <nav class="account-navigation">
                <a class="is-active" href="{{ route('settings') }}" aria-current="page">
                    <img src="{{ Vite::asset('resources/assets/icons/settings.svg') }}" alt="" aria-hidden="true">
                    <span>Настройки аккаунта</span>
                </a>
                <a href="{{ route('user-schemes') }}">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h.01M12 9h.01M16 9h.01M8 15h.01M12 15h.01M16 15h.01" /></svg>
                    <span>Созданные схемы</span>
                </a>
                <a href="{{ route('selection') }}">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h5m4 0h7M4 12h9m4 0h3M4 18h2m4 0h10M9 3v6m6 0v6m-7 0v6" /></svg>
                    <span>Подбор оборудования</span>
                </a>
            </nav>
            </div>
        </aside>

        <form class="account-settings-form">
            <section class="account-card">
                <h1>Персональная информация</h1>
                <p>Ваши фамилия, имя и отчество необходимы для идентификации личности, а также будут отображаться в разделе «Найти монтажника».</p>
                <div class="account-fields account-personal-fields">
                    <label><span>Имя *</span><input value="1" aria-label="Имя" /></label>
                    <label><span>Фамилия *</span><input value="1" aria-label="Фамилия" /></label>
                    <label><span>Отчество</span><input value="1" aria-label="Отчество" /></label>
                </div>
            </section>

            <section class="account-card">
                <h2>Детальная информация</h2>
                <p>Укажите информацию о себе, о вашем опыте работы, перечень оказываемых услуг, чтобы заказчик выбрал именно вас.</p>
                <label class="account-textarea"><span>О себе</span><textarea aria-label="О себе">1</textarea></label>
            </section>

            <section class="account-card account-contact-card">
                <h2>Время для связи</h2>
                <p>Укажите время для связи, в течение которого вам будет удобно принять звонок от заказчика.</p>
                <div class="account-time-fields">
                    <span>с</span>
                    <label><input value="09:00" aria-label="Время начала" /><button type="button" aria-label="Очистить время начала">×</button></label>
                    <span>до</span>
                    <label><input value="18:00" aria-label="Время окончания" /><button type="button" aria-label="Очистить время окончания">×</button></label>
                </div>
            </section>

            <section class="account-card">
                <h2>Населенный пункт</h2>
                <p>Укажите населенный пункт и радиус выездов для того, чтобы заказчик из вашего города или близлежащих населенных пунктов мог найти ваш профиль в разделе «Найти монтажника».</p>
                <div class="account-fields">
                    <label><span>Выезжаю в пределах (км)</span><input value="4" aria-label="Радиус выезда" /></label>
                    <label><span>Населенный пункт *</span><input value="Можга, Республика Удмуртия" aria-label="Населенный пункт" /></label>
                </div>
            </section>

            <section class="account-card account-visibility-card">
                <h2>Видимость вашего профиля</h2>
                <p>Разрешите показывать профиль заказчикам в разделе «Найти монтажника».</p>
                <label class="account-toggle"><input type="checkbox" checked /><span aria-hidden="true"></span>Показывать мой профиль</label>
            </section>
        </form>
    </main>
</body>
</html>
