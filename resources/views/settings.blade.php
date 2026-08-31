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
            @include('partials.logout-button')
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
                @include('partials.account-navigation')
            </div>
        </aside>

        <form class="account-settings-form">
            <section class="account-card account-profile-card">
                <div class="account-profile-layout">
                    <div class="account-photo-section">
                        <h3>Фотография</h3>
                        <div class="account-photo-control">
                            <div class="account-photo-preview">
                                <img id="account-photo-preview" alt="Предпросмотр фотографии профиля" hidden>
                                <svg id="account-photo-placeholder" viewBox="0 0 120 120" aria-hidden="true">
                                    <circle cx="60" cy="43" r="18"></circle>
                                    <ellipse cx="60" cy="82" rx="28" ry="13"></ellipse>
                                </svg>
                            </div>
                            <label class="account-photo-upload" for="account-photo-input">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .8-7.9A6 6 0 0 0 6.3 8.8 4.6 4.6 0 0 0 7 18Z"></path><path d="m9 13 3-3 3 3M12 10v6"></path></svg>
                                <span>Обновить фотографию</span>
                                <input class="account-photo-input" id="account-photo-input" name="photo" type="file" accept="image/png,image/jpeg,image/webp">
                            </label>
                        </div>
                        <p id="account-photo-status" class="account-photo-status" aria-live="polite">PNG, JPG или WebP</p>
                    </div>
                    <div class="account-personal-section">
                        <div class="account-personal-header">
                            <h1>Персональная информация</h1>
                            <div class="account-verification-badge" role="status">
                                <svg class="account-verification-star" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                                <span class="account-verification-state">
                                    <svg class="account-verification-alert" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                                    </svg>
                                    <span>Требуется верификация</span>
                                </span>
                            </div>
                        </div>
                        <p>Ваши фамилия, имя и отчество необходимы для идентификации личности, а также будут отображаться в разделе «Найти монтажника».</p>
                        <div class="account-fields account-personal-fields">
                            <label><span>Имя *</span><input value="1" aria-label="Имя" /></label>
                            <label><span>Фамилия *</span><input value="1" aria-label="Фамилия" /></label>
                            <label><span>Отчество</span><input value="1" aria-label="Отчество" /></label>
                        </div>
                    </div>
                </div>
            </section>

            <section class="account-card">
                <h2>О себе</h2>
                <p>Укажите информацию о себе, о вашем опыте работы, перечень оказываемых услуг, чтобы заказчик выбрал именно вас.</p>
                <label class="account-textarea"><span>О себе</span><textarea aria-label="О себе">1</textarea></label>
            </section>

            <section class="account-card account-availability-card">
                <h2>Доступность для заказчиков</h2>
                <p>Укажите город, радиус выездов и удобное время для звонка. Эти данные будут показаны в разделе «Найти монтажника».</p>
                <div class="account-availability-grid">
                    <div class="account-availability-group">
                        <h3>Где вы работаете</h3>
                        <div class="account-fields account-location-fields">
                            <label><span>Населенный пункт *</span><input value="Можга, Республика Удмуртия" aria-label="Населенный пункт" /></label>
                            <label class="account-radius-field">
                                <span>Радиус выезда</span>
                                <input id="account-radius-input" type="range" min="1" max="200" value="4" aria-describedby="account-radius-value" />
                                <output id="account-radius-value" for="account-radius-input">4 км</output>
                            </label>
                        </div>
                    </div>
                    <div class="account-availability-group account-contact-card">
                        <h3>Когда вам удобно позвонить</h3>
                        <div class="account-time-fields">
                            <label><span>С</span><input type="time" value="09:00" aria-label="Время начала" /><button type="button" aria-label="Очистить время начала">×</button></label>
                            <label><span>До</span><input type="time" value="18:00" aria-label="Время окончания" /><button type="button" aria-label="Очистить время окончания">×</button></label>
                        </div>
                    </div>
                </div>
            </section>

            <section class="account-card account-visibility-card">
                <h2>Видимость вашего профиля</h2>
                <p>Разрешите показывать профиль заказчикам в разделе «Найти монтажника».</p>
                <label class="account-toggle"><input type="checkbox" checked /><span aria-hidden="true"></span>Показывать мой профиль</label>
            </section>
        </form>
    </main>
    <script>
        (() => {
            const input = document.getElementById('account-photo-input');
            const preview = document.getElementById('account-photo-preview');
            const placeholder = document.getElementById('account-photo-placeholder');
            const status = document.getElementById('account-photo-status');
            const radiusInput = document.getElementById('account-radius-input');
            const radiusValue = document.getElementById('account-radius-value');
            let previewUrl = null;

            radiusInput?.addEventListener('input', () => {
                radiusValue.textContent = `${radiusInput.value} км`;
            });

            document.querySelectorAll('.account-time-fields button').forEach((button) => {
                button.addEventListener('click', () => {
                    button.previousElementSibling.value = '';
                });
            });

            input?.addEventListener('change', () => {
                const file = input.files?.[0];
                if (!file) return;

                if (!file.type.startsWith('image/')) {
                    input.value = '';
                    status.textContent = 'Выберите файл изображения.';
                    return;
                }

                if (previewUrl) URL.revokeObjectURL(previewUrl);
                previewUrl = URL.createObjectURL(file);
                preview.src = previewUrl;
                preview.hidden = false;
                placeholder.setAttribute('hidden', '');
                status.textContent = file.name;
            });
        })();
    </script>
</body>
</html>
