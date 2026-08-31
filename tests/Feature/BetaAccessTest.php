<?php

namespace Tests\Feature;

use App\Models\BetaAccessCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class BetaAccessTest extends TestCase
{
    use RefreshDatabase;

    private const CODE = 'ABCDE-23456';

    private const DEVICE_HEADERS = [
        'User-Agent' => 'Beta Browser/1.2.3 (Desktop)',
        'Accept-Language' => 'ru-RU,ru;q=0.9',
        'Sec-CH-UA-Platform' => '"Windows"',
        'Sec-CH-UA-Mobile' => '?0',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'beta.enabled' => true,
            'beta.cookie_secure' => false,
        ]);
    }

    public function test_first_visit_claims_code_and_sets_device_cookie(): void
    {
        $this->createCode();

        $response = $this->withHeaders(self::DEVICE_HEADERS)->get('/beta/'.self::CODE);

        $response->assertRedirect(route('auth'))->assertCookie(config('beta.cookie'));
        $cookie = $response->getCookie(config('beta.cookie'), false);
        $this->assertTrue($cookie->isHttpOnly());
        $this->assertSame('lax', strtolower((string) $cookie->getSameSite()));
        $this->assertNotSame(self::CODE, $cookie->getValue());

        $accessCode = BetaAccessCode::query()->sole();
        $this->assertNotNull($accessCode->claimed_at);
        $this->assertNotNull($accessCode->device_token_hash);
        $this->assertNotNull($accessCode->device_fingerprint_hash);
        $this->assertDatabaseMissing('beta_access_codes', ['code_hash' => self::CODE]);
    }

    public function test_claimed_code_only_opens_on_bound_device(): void
    {
        $this->createCode();
        $claim = $this->withHeaders(self::DEVICE_HEADERS)->get('/beta/'.self::CODE);
        $token = $claim->getCookie(config('beta.cookie'), false)->getValue();

        $this->withHeaders(self::DEVICE_HEADERS)
            ->withUnencryptedCookie(config('beta.cookie'), $token)
            ->get('/beta/'.self::CODE)
            ->assertRedirect(route('auth'));

        $this->withHeaders(self::DEVICE_HEADERS)
            ->withUnencryptedCookie(config('beta.cookie'), '')
            ->get('/beta/'.self::CODE)
            ->assertForbidden();

        $this->withHeaders([...self::DEVICE_HEADERS, 'User-Agent' => 'Other Device/9.0'])
            ->withUnencryptedCookie(config('beta.cookie'), $token)
            ->get('/beta/'.self::CODE)
            ->assertForbidden();
    }

    public function test_web_and_api_routes_require_bound_device(): void
    {
        $this->createCode();

        $this->get('/auth')->assertForbidden();
        $this->postJson('/api/schemes', [])
            ->assertForbidden()
            ->assertJson(['message' => 'Beta access is required.']);

        $claim = $this->withHeaders(self::DEVICE_HEADERS)->get('/beta/'.self::CODE);
        $token = $claim->getCookie(config('beta.cookie'), false)->getValue();

        $this->withHeaders(self::DEVICE_HEADERS)
            ->withUnencryptedCookie(config('beta.cookie'), $token)
            ->get('/auth')
            ->assertOk();

        $this->withHeaders(self::DEVICE_HEADERS)
            ->withUnencryptedCookie(config('beta.cookie'), $token)
            ->withCookie('PHPSESSID', 'any-value')
            ->withCredentials()
            ->postJson('/api/schemes', [])
            ->assertUnprocessable();
    }

    public function test_revoked_and_expired_codes_cannot_be_claimed(): void
    {
        $this->createCode(['revoked_at' => now()]);
        $this->withHeaders(self::DEVICE_HEADERS)->get('/beta/'.self::CODE)->assertForbidden();

        BetaAccessCode::query()->delete();
        $this->createCode(['expires_at' => now()->subMinute()]);
        $this->withHeaders(self::DEVICE_HEADERS)->get('/beta/'.self::CODE)->assertForbidden();
    }

    public function test_generator_creates_twenty_hashed_codes_by_default(): void
    {
        $exitCode = Artisan::call('beta:codes');

        $this->assertSame(0, $exitCode);
        $this->assertDatabaseCount('beta_access_codes', 20);
        BetaAccessCode::query()->each(function (BetaAccessCode $accessCode): void {
            $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $accessCode->code_hash);
            $this->assertNull($accessCode->claimed_at);
        });
    }

    private function createCode(array $attributes = []): BetaAccessCode
    {
        return BetaAccessCode::query()->create([
            'code_hash' => BetaAccessCode::hashCode(self::CODE),
            ...$attributes,
        ]);
    }
}
