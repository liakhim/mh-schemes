<form class="app-logout-form" method="POST" action="{{ route('logout') }}">
    @csrf
    <button class="app-logout-button" type="submit">Выйти</button>
</form>
