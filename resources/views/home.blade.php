<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>MyHeat - Сервисы проектирования</title>
    @vite(['resources/css/app.css'])
</head>
<body class="home-page">
    <nav class="spa-navbar home-navbar">
        <div class="spa-navbar-brand home-navbar-brand">
            <a href="{{ route('home') }}" aria-label="MyHeat — главная">
                <img src="{{ Vite::asset('resources/assets/logo/logo.svg') }}" alt="MyHeat" class="spa-navbar-logo">
            </a>
            <div class="spa-alpha-notice">
                <span>Приложение находится <u>в стадии альфа-тестирования</u>, все вопросы к разработчику:</span>
                <a href="https://t.me/mmingareev" target="_blank" rel="noreferrer">Telegram</a>
            </div>
        </div>
    </nav>

    <main class="home-main">
        <header class="home-intro">
            <span class="home-kicker">Инструменты MyHeat</span>
            <h1>От подбора оборудования<br>до готовой схемы</h1>
            <p>Выберите нужный сервис для проектирования, проверки или изучения оборудования.</p>
        </header>

        <div class="home-services">
            <a class="home-service home-service-selection" href="{{ route('selection') }}">
                <span class="home-service-index">01</span>
                <span class="home-service-copy">
                    <small>Начать проект</small>
                    <strong>Подбор</strong>
                    <span>Соберите конфигурацию системы и автоматически подберите контроллер и модули.</span>
                </span>
                <span class="home-service-arrow" aria-hidden="true"></span>
                <img src="{{ Vite::asset('resources/assets/controllers/go+/go+.svg') }}" alt="" aria-hidden="true">
            </a>

            <a class="home-service home-service-schemes" href="{{ route('schemes.index') }}">
                <span class="home-service-index">02</span>
                <span class="home-service-copy">
                    <small>Рабочее пространство</small>
                    <strong>Список схем</strong>
                    <span>Откройте сохранённые проекты, продолжите редактирование или создайте копию.</span>
                </span>
                <span class="home-service-arrow" aria-hidden="true"></span>
                <img src="{{ Vite::asset('resources/assets/controllers/pro/pro.svg') }}" alt="" aria-hidden="true">
            </a>

            <a class="home-service home-service-learning" href="{{ route('learning') }}">
                <span class="home-service-index">03</span>
                <span class="home-service-copy">
                    <small>Практика подключения</small>
                    <strong>Обучение</strong>
                    <span>Пройдите интерактивные задания и закрепите правила подключения оборудования.</span>
                </span>
                <span class="home-service-arrow" aria-hidden="true"></span>
                <img src="{{ Vite::asset('resources/assets/controllers/smart2/smart2.svg') }}" alt="" aria-hidden="true">
            </a>

            <a class="home-service home-service-equipment" href="{{ route('admin') }}">
                <span class="home-service-index">04</span>
                <span class="home-service-copy">
                    <small>Технический справочник</small>
                    <strong>Список оборудования</strong>
                    <span>Посмотрите контроллеры, модули и сведения о совместимости устройств.</span>
                </span>
                <span class="home-service-arrow" aria-hidden="true"></span>
                <span class="home-service-equipment-art" aria-hidden="true">
                    <img src="{{ Vite::asset('resources/assets/modules/io4/io4.svg') }}" alt="">
                    <img src="{{ Vite::asset('resources/assets/modules/rl6/rl6.svg') }}" alt="">
                </span>
            </a>
        </div>
    </main>
</body>
</html>
