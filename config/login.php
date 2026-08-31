<?php

return [
    'mode' => env('AUTH_MODE', 'stub'),
    'users_table' => env('AUTH_USERS_TABLE', 'users'),
    'login_column' => env('AUTH_LOGIN_COLUMN', 'email'),
    'password_column' => env('AUTH_PASSWORD_COLUMN', 'password'),
];
