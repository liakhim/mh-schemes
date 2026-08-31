<?php

namespace App\Http\Middleware;

use App\Models\BetaAccessCode;
use App\Services\BetaDeviceFingerprint;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireBetaAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('beta.enabled')) {
            return $next($request);
        }

        $token = $request->cookie(config('beta.cookie'));
        $accessCode = is_string($token) && $token !== ''
            ? BetaAccessCode::query()
                ->where('device_token_hash', BetaAccessCode::hashDeviceToken($token))
                ->first()
            : null;

        if (! $accessCode
            || ! $accessCode->isAvailable()
            || ! hash_equals(
                (string) $accessCode->device_fingerprint_hash,
                BetaDeviceFingerprint::hash($request),
            )) {
            return $this->deny($request);
        }

        if ($accessCode->last_used_at === null || $accessCode->last_used_at->lt(now()->subMinutes(10))) {
            $accessCode->forceFill(['last_used_at' => now()])->save();
        }

        $request->attributes->set('beta_access_code', $accessCode);

        return $next($request);
    }

    private function deny(Request $request): Response
    {
        if ($request->expectsJson() || $request->is('api/*')) {
            return new JsonResponse(['message' => 'Beta access is required.'], 403);
        }

        return response()
            ->view('beta-denied', status: 403)
            ->header('Referrer-Policy', 'no-referrer');
    }
}
