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
            'incoming_scheme' => ['controller' => ['type' => 'go']],
        ]);

        $this->withCookie('PHPSESSID', 'any-value')
            ->get(route('scheme.with-id', $scheme))
            ->assertOk()
            ->assertViewIs('spa')
            ->assertViewHas('scheme', $scheme);
    }
}
