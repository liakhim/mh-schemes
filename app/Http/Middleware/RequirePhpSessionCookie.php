<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequirePhpSessionCookie
{
    public function handle(Request $request, Closure $next): Response
    {
        // Until the external account integration is connected, cookie presence is sufficient.
        if (!$request->cookies->has('PHPSESSID')) {
            return redirect()->route('auth');
        }

        return $next($request);
    }
}
