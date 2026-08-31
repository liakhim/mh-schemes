<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\View\View;
use RuntimeException;

class LoginController extends Controller
{
    public function show(Request $request): View|RedirectResponse
    {
        if ($this->usesDatabaseAuth() ? Auth::check() : $request->cookies->has('PHPSESSID')) {
            return redirect()->route('settings');
        }

        return view('auth');
    }

    public function store(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        if (! $this->usesDatabaseAuth()) {
            return redirect()->route('settings')->withCookie(cookie('PHPSESSID', '1'));
        }

        abort_unless(config('database.enabled'), 503, 'Database authentication is not configured.');

        $loginColumn = $this->configuredColumn('login.login_column');
        $passwordColumn = $this->configuredColumn('login.password_column');
        $user = User::query()->where($loginColumn, $credentials['email'])->first();
        $passwordHash = $user?->getAttribute($passwordColumn);

        if (! is_string($passwordHash) || ! $this->passwordMatches($credentials['password'], $passwordHash)) {
            return back()
                ->withInput($request->only('email'))
                ->withErrors(['credentials' => 'Неверный email или пароль.']);
        }

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('settings');
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('auth')->withoutCookie('PHPSESSID');
    }

    private function usesDatabaseAuth(): bool
    {
        return config('login.mode') === 'database';
    }

    private function configuredColumn(string $key): string
    {
        $column = (string) config($key);
        if (! preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $column)) {
            throw new RuntimeException("Invalid authentication column configured for {$key}.");
        }

        return $column;
    }

    private function passwordMatches(string $password, string $hash): bool
    {
        if (preg_match('/^[A-F0-9]{64}$/i', $hash) === 1) {
            return hash_equals(strtoupper($hash), strtoupper(hash('sha256', $password)));
        }

        try {
            return Hash::check($password, $hash);
        } catch (RuntimeException) {
            return password_verify($password, $hash);
        }
    }
}
