<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class IntegrationProxyTest extends TestCase
{
    public function test_proxy_does_not_forward_application_cookies_to_upstream(): void
    {
        Http::fake([
            '*' => Http::response(['ok' => true]),
        ]);

        $this->withCookie('laravel_session', 'secret-session')
            ->postJson('/api/integration', [
                'action' => 'getNames',
                'data' => ['name' => 'boiler'],
            ])
            ->assertOk();

        Http::assertSent(fn (Request $request): bool => ! $request->hasHeader('Cookie'));
    }
}
