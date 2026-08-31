<?php

use App\Http\Controllers\BetaAccessController;
use App\Http\Controllers\LoginController;
use App\Http\Controllers\SchemeController;
use Illuminate\Support\Facades\Route;

Route::get('/beta/{code}', BetaAccessController::class)
    ->middleware('throttle:10,1')
    ->where('code', '[A-Za-z0-9-]+')
    ->name('beta.claim');

Route::middleware('beta-access')->group(function (): void {
    Route::redirect('/', '/user-schemes')->name('home');

    Route::get('/auth', [LoginController::class, 'show'])->name('auth');
    Route::post('/auth', [LoginController::class, 'store'])->name('auth.store');
    Route::post('/logout', [LoginController::class, 'destroy'])->name('logout');

    Route::middleware('php-session')->group(function (): void {
        Route::get('/user-schemes', [SchemeController::class, 'selectionDashboard'])->name('user-schemes');
        Route::view('/settings', 'settings')->name('settings');
        Route::view('/cases', 'cases')->name('cases');
        Route::view('/learning', 'learning')->name('learning');
        Route::view('/selection', 'selection')->name('selection');
        Route::get('/scheme', [SchemeController::class, 'create'])->name('scheme');
        Route::get('/scheme/{scheme}', [SchemeController::class, 'edit'])
            ->whereNumber('scheme')
            ->name('scheme.with-id');
    });
});
