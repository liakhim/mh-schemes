<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'code_hash',
    'device_token_hash',
    'device_fingerprint_hash',
    'claimed_at',
    'last_used_at',
    'expires_at',
    'revoked_at',
])]
class BetaAccessCode extends Model
{
    public static function normalizeCode(string $code): string
    {
        return strtoupper(str_replace('-', '', trim($code)));
    }

    public static function hashCode(string $code): string
    {
        return self::keyedHash(self::normalizeCode($code));
    }

    public static function hashDeviceToken(string $token): string
    {
        return self::keyedHash($token);
    }

    public function isAvailable(): bool
    {
        return $this->revoked_at === null
            && ($this->expires_at === null || $this->expires_at->isFuture());
    }

    protected function casts(): array
    {
        return [
            'claimed_at' => 'datetime',
            'last_used_at' => 'datetime',
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    private static function keyedHash(string $value): string
    {
        return hash_hmac('sha256', $value, (string) config('app.key'));
    }
}
