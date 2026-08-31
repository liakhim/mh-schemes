<?php

return [
    'enabled' => env('BETA_ACCESS_ENABLED', false),
    'cookie' => 'beta_device',
    'cookie_lifetime_minutes' => 60 * 24 * 365,
    'cookie_secure' => env('BETA_ACCESS_COOKIE_SECURE', env('APP_ENV') === 'production'),
];
