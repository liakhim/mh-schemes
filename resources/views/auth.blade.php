<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>MyHeat - Вход монтажника</title>
    @vite(['resources/css/app.css'])
</head>
<body class="auth-page">
    <main class="auth-card">
        <a class="auth-brand" href="{{ route('auth') }}" aria-label="MyHeat">
            <img src="{{ Vite::asset('resources/assets/logo/logo.svg') }}" alt="MyHeat">
        </a>
        <h1>Вход в аккаунт монтажника</h1>
        <p>Укажите email и пароль аккаунта монтажника, чтобы продолжить.</p>
        <form method="POST" action="{{ route('auth.store') }}">
            @csrf
            @error('credentials')
                <div class="auth-error auth-error-summary" role="alert">{{ $message }}</div>
            @enderror
            <label for="installer-email">Email аккаунта монтажника</label>
            <input id="installer-email" name="email" type="text" value="{{ old('email') }}" required autofocus>
            @error('email')
                <span class="auth-error" role="alert">{{ $message }}</span>
            @enderror
            <label for="installer-password">Пароль</label>
            <input id="installer-password" name="password" type="password" required autocomplete="current-password">
            @error('password')
                <span class="auth-error" role="alert">{{ $message }}</span>
            @enderror
            <button type="submit">Продолжить</button>
        </form>
    </main>
</body>
</html>
