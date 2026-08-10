<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PhpSessionCookieMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_redirect_to_auth_without_php_session_cookie(): void
    {
        $this->get('/settings')
            ->assertRedirect(route('auth'));
    }

    public function test_user_schemes_redirect_to_auth_without_php_session_cookie(): void
    {
        $this->get('/user-schemes')
            ->assertRedirect(route('auth'));
    }

    public function test_selection_and_scheme_pages_redirect_to_auth_without_php_session_cookie(): void
    {
        $this->get('/selection')->assertRedirect(route('auth'));
        $this->get('/scheme')->assertRedirect(route('auth'));
    }

    public function test_settings_displays_account_page_with_php_session_cookie(): void
    {
        $this->withCookie('PHPSESSID', 'any-value')
            ->get('/settings')
            ->assertOk()
            ->assertViewIs('settings');
    }

    public function test_auth_sets_php_session_cookie_for_existing_installer_email(): void
    {
        User::factory()->create(['email' => 'installer@example.test']);

        $this->post('/auth', ['email' => 'installer@example.test'])
            ->assertRedirect(route('settings'))
            ->assertCookie('PHPSESSID', '1');
    }

    public function test_auth_shows_error_for_unknown_installer_email(): void
    {
        $this->from('/auth')
            ->post('/auth', ['email' => 'missing@example.test'])
            ->assertRedirect('/auth')
            ->assertSessionHasErrors('email');
    }
}
