<nav class="account-navigation">
    <a href="#">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h6M9 11h6M9 15h3" /></svg>
        <span>Мои устройства</span>
    </a>
    <a @class(['is-active' => request()->routeIs('settings')]) href="{{ route('settings') }}" @if(request()->routeIs('settings')) aria-current="page" @endif>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></svg>
        <span>Настройки аккаунта</span>
    </a>
    <a @class(['is-active' => request()->routeIs('user-schemes')]) href="{{ route('user-schemes') }}" @if(request()->routeIs('user-schemes')) aria-current="page" @endif>
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h.01M12 9h.01M16 9h.01M8 15h.01M12 15h.01M16 15h.01" /></svg>
        <span>Созданные схемы</span>
    </a>
    <a @class(['is-active' => request()->routeIs('selection')]) href="{{ route('selection') }}" @if(request()->routeIs('selection')) aria-current="page" @endif>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h5m4 0h7M4 12h9m4 0h3M4 18h2m4 0h10M9 3v6m6 0v6m-7 0v6" /></svg>
        <span>Подбор оборудования</span>
    </a>
    <a @class(['is-active' => request()->routeIs('cases')]) href="{{ route('cases') }}" @if(request()->routeIs('cases')) aria-current="page" @endif>
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V4h8v3M3 12h18M9 15l2 2 4-4" /></svg>
        <span>Выполненные работы</span>
    </a>
</nav>
