<?php

namespace App\Http\Controllers;

use App\Models\BetaAccessCode;
use App\Services\BetaDeviceFingerprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class BetaAccessController extends Controller
{
    public function __invoke(Request $request, string $code): Response
    {
        $fingerprintHash = BetaDeviceFingerprint::hash($request);
        $currentToken = $request->cookie(config('beta.cookie'));
        $newToken = null;

        $allowed = DB::transaction(function () use ($code, $fingerprintHash, $currentToken, &$newToken): bool {
            $accessCode = BetaAccessCode::query()
                ->where('code_hash', BetaAccessCode::hashCode($code))
                ->lockForUpdate()
                ->first();

            if (! $accessCode || ! $accessCode->isAvailable()) {
                return false;
            }

            if ($accessCode->claimed_at !== null) {
                if (! is_string($currentToken) || $currentToken === '') {
                    return false;
                }

                return hash_equals(
                    (string) $accessCode->device_token_hash,
                    BetaAccessCode::hashDeviceToken($currentToken),
                ) && hash_equals((string) $accessCode->device_fingerprint_hash, $fingerprintHash);
            }

            $newToken = Str::random(64);
            $accessCode->forceFill([
                'device_token_hash' => BetaAccessCode::hashDeviceToken($newToken),
                'device_fingerprint_hash' => $fingerprintHash,
                'claimed_at' => now(),
                'last_used_at' => now(),
            ])->save();

            return true;
        });

        if (! $allowed) {
            return response()
                ->view('beta-denied', status: 403)
                ->header('Referrer-Policy', 'no-referrer');
        }

        $response = redirect()->route('auth');
        if ($newToken !== null) {
            $response->withCookie(Cookie::make(
                name: config('beta.cookie'),
                value: $newToken,
                minutes: config('beta.cookie_lifetime_minutes'),
                path: '/',
                secure: config('beta.cookie_secure'),
                httpOnly: true,
                sameSite: 'lax',
            ));
        }

        return $response->header('Referrer-Policy', 'no-referrer');
    }
}
