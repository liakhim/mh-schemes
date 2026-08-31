<?php

use App\Http\Middleware\RequireBetaAccess;
use App\Http\Middleware\RequirePhpSessionCookie;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');
        $middleware->encryptCookies(except: ['beta_device']);
        $middleware->alias([
            'beta-access' => RequireBetaAccess::class,
            'php-session' => RequirePhpSessionCookie::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
