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
        <a class="auth-brand" href="{{ route('auth') }}" aria-label="MyHeat Pro">
            <span class="account-logo-lockup"><img src="{{ Vite::asset('resources/assets/logo/logo.svg') }}" alt="MyHeat"><b>PRO</b></span>
        </a>
        <h1>Вход в аккаунт монтажника</h1>
        <p>Укажите email аккаунта монтажника, чтобы продолжить.</p>
        <form method="POST" action="{{ route('auth.store') }}">
            @csrf
            <label for="installer-email">Email аккаунта монтажника</label>
            <input id="installer-email" name="email" type="text" value="{{ old('email') }}" required autofocus>
            @error('email')
                <span class="auth-error">{{ $message }}</span>
            @enderror
            <button type="submit">Продолжить</button>
        </form>
    </main>
</body>
</html>
