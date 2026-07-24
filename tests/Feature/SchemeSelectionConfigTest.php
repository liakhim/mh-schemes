<?php

namespace Tests\Feature;

use App\Models\Scheme;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Tests\TestCase;

class SchemeSelectionConfigTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(PreventRequestForgery::class);
    }

    public function test_selection_config_is_stored_and_returned_with_a_scheme(): void
    {
        $selectionConfig = [
            'schema' => 'mh.selection-config',
            'version' => 1,
            'created_at' => '2026-07-24T12:30:00.000Z',
            'intent' => [
                'requested_controller_type' => 'go',
                'resolved_controller_type' => 'go+',
                'ups_requested' => true,
            ],
            'selection_state' => [
                'controller' => ['type' => 'go+'],
            ],
        ];

        $response = $this->postJson(route('schemes.store'), [
            'name' => 'Схема из подбора',
            'incoming_scheme' => ['controller' => ['type' => 'go+']],
            'selection_config' => $selectionConfig,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('selection_config.schema', 'mh.selection-config')
            ->assertJsonPath('selection_config.intent.requested_controller_type', 'go');

        $this->assertEquals($selectionConfig, Scheme::findOrFail($response->json('id'))->selection_config);
    }

    public function test_selection_config_is_not_changed_by_scheme_updates(): void
    {
        $scheme = Scheme::create([
            'name' => 'Схема',
            'incoming_scheme' => ['controller' => ['type' => 'go']],
            'selection_config' => [
                'schema' => 'mh.selection-config',
                'version' => 1,
                'selection_state' => ['controller' => ['type' => 'go']],
            ],
        ]);

        $this->patchJson(route('schemes.update', $scheme), [
            'incoming_scheme' => ['controller' => ['type' => 'pro']],
            'selection_config' => [
                'schema' => 'mh.selection-config',
                'version' => 1,
                'selection_state' => ['controller' => ['type' => 'pro']],
            ],
        ])->assertOk();

        $this->assertSame('go', $scheme->fresh()->selection_config['selection_state']['controller']['type']);
    }

    public function test_selection_config_requires_a_supported_contract(): void
    {
        $this->postJson(route('schemes.store'), [
            'name' => 'Некорректный подбор',
            'incoming_scheme' => ['controller' => ['type' => 'go']],
            'selection_config' => ['version' => 1],
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'selection_config.schema',
            'selection_config.selection_state',
        ]);
    }
}
