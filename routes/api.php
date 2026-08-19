<?php

use App\Http\Controllers\IntegrationController;
use App\Http\Controllers\SchemeController;
use Illuminate\Support\Facades\Route;

Route::apiResource('schemes', SchemeController::class)
    ->only(['show', 'store', 'update', 'destroy'])
    ->whereNumber('scheme');

Route::delete('schemes', [SchemeController::class, 'destroyMany'])
    ->name('schemes.destroy-many');

Route::post('integration', [IntegrationController::class, 'proxy'])
    ->name('integration.proxy');

Route::post('boilers/search', [IntegrationController::class, 'searchBoilers'])
    ->name('boilers.search');
