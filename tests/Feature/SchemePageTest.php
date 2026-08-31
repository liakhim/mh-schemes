<?php

namespace Tests\Feature;

use App\Models\Scheme;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SchemePageTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_scheme_editor_is_served_by_the_scheme_controller(): void
    {
        $this->withCookie('PHPSESSID', 'any-value')
            ->get(route('scheme'))
            ->assertOk()
            ->assertViewIs('spa')
            ->assertViewHas('scheme', null);
    }

    public function test_existing_scheme_editor_receives_the_bound_scheme(): void
    {
        $scheme = Scheme::create([
            'name' => 'Схема',
            'user_id' => 1,
            'incoming_scheme' => ['controller' => ['type' => 'go']],
        ]);

        $this->withCookie('PHPSESSID', 'any-value')
            ->get(route('scheme.with-id', $scheme))
            ->assertOk()
            ->assertViewIs('spa')
            ->assertViewHas('scheme', $scheme);
    }

    public function test_scheme_can_be_deleted_from_the_dashboard(): void
    {
        $scheme = Scheme::create([
            'name' => 'Схема для удаления',
            'user_id' => 1,
            'incoming_scheme' => ['controller' => ['type' => 'go']],
        ]);

        $this->withCookie('PHPSESSID', 'any-value')
            ->delete(route('schemes.destroy', $scheme))
            ->assertRedirect(route('user-schemes'))
            ->assertSessionHas('status', 'Схема удалена.');

        $this->assertDatabaseMissing('schemes', ['id' => $scheme->id]);
    }
}
