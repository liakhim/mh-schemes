<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RequirePhpSessionCookie
{
    public function handle(Request $request, Closure $next): Response
    {
        $authenticated = config('login.mode') === 'database'
            ? Auth::check()
            : $request->cookies->has('PHPSESSID');

        if (! $authenticated) {
            return redirect()->route('auth');
        }

        return $next($request);
    }
}
