<?php

namespace Tests\Feature;

use Tests\TestCase;

class PhpSessionCookieMiddlewareTest extends TestCase
{
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

    public function test_auth_redirects_to_user_schemes_with_php_session_cookie(): void
    {
        $this->withCookie('PHPSESSID', 'any-value')
            ->get('/auth')
            ->assertRedirect(route('user-schemes'));
    }

    public function test_auth_sets_php_session_cookie_for_any_non_empty_email(): void
    {
        $this->post('/auth', ['email' => 'installer@example.test'])
            ->assertRedirect(route('settings'))
            ->assertCookie('PHPSESSID', '1');
    }
}
