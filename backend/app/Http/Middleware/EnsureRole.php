<?php

namespace App\Http\Middleware;

use App\Models\Driver;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /**
     * Restrict an authenticated Sanctum session to the matching role.
     * Passed as `ensure.role:user` or `ensure.role:driver`.
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = $request->user();
        $expected = $role === 'driver' ? Driver::class : User::class;

        if ($user === null || ! $user instanceof $expected) {
            abort(403, 'الوصول غير مصرح به.');
        }

        return $next($request);
    }
}