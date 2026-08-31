<?php

namespace App\Services;

use Illuminate\Http\Request;

class BetaDeviceFingerprint
{
    public static function hash(Request $request): string
    {
        $parts = [
            self::normalizeVersionedHeader($request->userAgent() ?? ''),
            self::normalizeVersionedHeader($request->header('sec-ch-ua', '')),
            strtolower($request->header('sec-ch-ua-platform', '')),
            strtolower($request->header('sec-ch-ua-mobile', '')),
            strtolower($request->header('accept-language', '')),
        ];

        return hash_hmac('sha256', implode('|', $parts), (string) config('app.key'));
    }

    private static function normalizeVersionedHeader(string $value): string
    {
        return strtolower((string) preg_replace('/\d+(?:\.\d+)*/', '*', trim($value)));
    }
}
