<?php

use App\Http\Controllers\SchemeController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/user-schemes')->name('home');

Route::get('/auth', function (Request $request) {
    if ($request->cookies->has('PHPSESSID')) {
        return redirect()->route('user-schemes');
    }

    return view('auth');
})->name('auth');
Route::post('/auth', function (Request $request) {
    $request->validate(['email' => ['required', 'string']]);

    return redirect()->route('settings')->withCookie(cookie('PHPSESSID', '1'));
})->name('auth.store');

Route::middleware('php-session')->group(function (): void {
    Route::get('/user-schemes', [SchemeController::class, 'selectionDashboard'])->name('user-schemes');
    Route::view('/settings', 'settings')->name('settings');
    Route::view('/learning', 'learning')->name('learning');
    Route::view('/selection', 'selection')->name('selection');
    Route::get('/scheme', [SchemeController::class, 'create'])->name('scheme');
    Route::get('/scheme/{scheme}', [SchemeController::class, 'edit'])
        ->whereNumber('scheme')
        ->name('scheme.with-id');
});
