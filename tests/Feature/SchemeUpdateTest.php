<?php

namespace Tests\Feature;

use App\Models\Scheme;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SchemeUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_scheme_metadata_can_be_updated_from_the_list(): void
    {
        $scheme = Scheme::create([
            'name' => 'Исходная схема',
            'description' => null,
            'incoming_scheme' => ['controller' => ['type' => 'go']],
        ]);

        $response = $this->patchJson(route('schemes.update', $scheme), [
            'name' => 'Обновленная схема',
            'description' => 'Новое описание',
            'system_device_id' => 12345,
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('name', 'Обновленная схема')
            ->assertJsonPath('description', 'Новое описание')
            ->assertJsonPath('system_device_id', 12345);

        $this->assertDatabaseHas('schemes', [
            'id' => $scheme->id,
            'name' => 'Обновленная схема',
            'description' => 'Новое описание',
            'system_device_id' => 12345,
        ]);
    }

    public function test_system_device_id_can_be_cleared(): void
    {
        $scheme = Scheme::create([
            'name' => 'Схема',
            'system_device_id' => 12345,
            'incoming_scheme' => ['controller' => ['type' => 'go']],
        ]);

        $this->patchJson(route('schemes.update', $scheme), [
            'system_device_id' => null,
        ])->assertOk()->assertJsonPath('system_device_id', null);

        $this->assertNull($scheme->fresh()->system_device_id);
    }
}
