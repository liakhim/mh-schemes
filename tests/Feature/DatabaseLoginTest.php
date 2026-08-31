<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Scheme;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DatabaseLoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'database.enabled' => true,
            'login.mode' => 'database',
            'login.users_table' => 'users',
            'login.login_column' => 'email',
            'login.password_column' => 'password',
        ]);
    }

    public function test_existing_user_can_log_in_without_modifying_users_table(): void
    {
        $createdAt = now()->subDay()->startOfSecond();
        DB::table('users')->insert([
            'id' => 42,
            'name' => 'Beta Tester',
            'email' => 'tester@example.test',
            'password' => Hash::make('correct-password'),
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);

        $response = $this->post('/auth', [
            'email' => 'tester@example.test',
            'password' => 'correct-password',
        ]);

        $response
            ->assertRedirect(route('settings'))
            ->assertCookieMissing('PHPSESSID');
        $this->assertAuthenticatedAs(User::query()->findOrFail(42));
        $this->assertDatabaseHas('users', [
            'id' => 42,
            'updated_at' => $createdAt->toDateTimeString(),
        ]);
        $this->get('/settings')->assertOk();
    }

    public function test_user_with_legacy_sha256_password_can_log_in(): void
    {
        $passwordHash = strtoupper(hash('sha256', 'correct-password'));
        DB::table('users')->insert([
            'id' => 43,
            'name' => 'Legacy User',
            'email' => 'legacy@example.test',
            'password' => $passwordHash,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->post('/auth', [
            'email' => 'legacy@example.test',
            'password' => 'correct-password',
        ])->assertRedirect(route('settings'));

        $this->assertAuthenticatedAs(User::query()->findOrFail(43));
        $this->assertDatabaseHas('users', [
            'id' => 43,
            'password' => $passwordHash,
        ]);
    }

    public function test_wrong_password_is_rejected(): void
    {
        DB::table('users')->insert([
            'name' => 'Beta Tester',
            'email' => 'tester@example.test',
            'password' => strtoupper(hash('sha256', 'correct-password')),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->from('/auth')->post('/auth', [
            'email' => 'tester@example.test',
            'password' => 'wrong-password',
        ])
            ->assertRedirect('/auth')
            ->assertSessionHasErrors('credentials');

        $this->assertGuest();
    }

    public function test_scheme_is_stored_for_the_authenticated_user(): void
    {
        DB::table('users')->insert([
            'id' => 44,
            'name' => 'Scheme Owner',
            'email' => 'owner@example.test',
            'password' => strtoupper(hash('sha256', 'correct-password')),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $user = User::query()->findOrFail(44);

        $this->actingAs($user)
            ->postJson(route('schemes.store'), [
                'name' => 'Схема пользователя',
                'incoming_scheme' => ['controller' => ['type' => 'pro']],
            ])
            ->assertCreated()
            ->assertJsonPath('user_id', 44);

        $this->assertDatabaseHas('schemes', [
            'name' => 'Схема пользователя',
            'user_id' => 44,
        ]);
    }

    public function test_php_session_cookie_does_not_bypass_database_auth(): void
    {
        $this->withCookie('PHPSESSID', '1')
            ->get('/settings')
            ->assertRedirect(route('auth'));
    }

    public function test_logout_invalidates_database_authentication(): void
    {
        DB::table('users')->insert([
            'id' => 45,
            'name' => 'Logout User',
            'email' => 'logout@example.test',
            'password' => strtoupper(hash('sha256', 'correct-password')),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs(User::query()->findOrFail(45))
            ->post(route('logout'))
            ->assertRedirect(route('auth'));

        $this->assertGuest();
    }

    public function test_user_cannot_view_or_delete_another_users_scheme(): void
    {
        DB::table('users')->insert([
            [
                'id' => 46,
                'name' => 'Scheme Owner',
                'email' => 'scheme-owner@example.test',
                'password' => strtoupper(hash('sha256', 'correct-password')),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 47,
                'name' => 'Other Owner',
                'email' => 'other-owner@example.test',
                'password' => strtoupper(hash('sha256', 'correct-password')),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
        $ownScheme = Scheme::create([
            'name' => 'Своя схема',
            'user_id' => 46,
            'incoming_scheme' => ['controller' => ['type' => 'pro']],
        ]);
        $otherScheme = Scheme::create([
            'name' => 'Чужая схема',
            'user_id' => 47,
            'incoming_scheme' => ['controller' => ['type' => 'pro']],
        ]);

        $this->actingAs(User::query()->findOrFail(46))
            ->get(route('user-schemes'))
            ->assertOk()
            ->assertSee($ownScheme->name)
            ->assertDontSee($otherScheme->name);

        $this->delete(route('schemes.destroy', $otherScheme))->assertNotFound();
        $this->assertDatabaseHas('schemes', ['id' => $otherScheme->id]);
    }
}
