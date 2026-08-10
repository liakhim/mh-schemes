<?php

use App\Http\Controllers\IntegrationController;
use App\Http\Controllers\SchemeController;
use App\Models\Scheme;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Корень ведет в публичный каталог сервисов.
Route::redirect('/', '/user-schemes')->name('home');

// Рабочий раздел подбора оборудования доступен при наличии внешней PHP-сессии.
Route::get('/user-schemes', [SchemeController::class, 'selectionDashboard'])->middleware('php-session')->name('user-schemes');

// Временный вход монтажника: найденный аккаунт создает PHP-сессию-заглушку.
Route::view('/auth', 'auth')->name('auth');
Route::post('/auth', function (Request $request) {
    $validated = $request->validate(['email' => ['required', 'string']]);
    $email = trim($validated['email']);

    if (!User::query()->where('email', $email)->exists()) {
        return back()
            ->withErrors(['email' => 'Аккаунт монтажника с таким email не найден.'])
            ->onlyInput('email');
    }

    return redirect()->route('settings')->withCookie(cookie('PHPSESSID', '1'));
})->name('auth.store');

// Настройки профиля доступны при наличии внешней PHP-сессии.
Route::view('/settings', 'settings')->middleware('php-session')->name('settings');

// Административная страница (тестовые данные).
Route::view('/admin', 'admin', ['data' => 'test'])->name('admin');

// Страница со списком схем с возможностью поиска по названию.
Route::get('/schemes', [SchemeController::class, 'index'])->middleware('php-session')->name('schemes.index');

// Массовое удаление схем по списку идентификаторов.
Route::delete('/api/schemes', [SchemeController::class, 'destroyMany'])->name('schemes.destroy-many');

// Получить данные одной схемы в формате JSON.
Route::get('/api/schemes/{scheme}', [SchemeController::class, 'show'])
    ->whereNumber('scheme')
    ->name('schemes.show');

// Создать новую схему.
Route::post('/api/schemes', [SchemeController::class, 'store'])->name('schemes.store');

// Обновить существующую схему.
Route::patch('/api/schemes/{scheme}', [SchemeController::class, 'update'])
    ->whereNumber('scheme')
    ->name('schemes.update');

// Удалить одну схему.
Route::delete('/api/schemes/{scheme}', [SchemeController::class, 'destroy'])
    ->whereNumber('scheme')
    ->name('schemes.destroy');

// Проксирование запроса интеграции во внешний сервис mhtest.ru.
Route::post('/api/integration', [IntegrationController::class, 'proxy'])->name('integration.proxy');

// Поиск котлов по названию через внешний сервис интеграции.
Route::post('/api/boilers/search', [IntegrationController::class, 'searchBoilers'])->name('boilers.search');

// Страница SVG-редактора.
Route::view('/svg-editor', 'svg-editor')->name('svg-editor');

// Страница обучения.
Route::view('/learning', 'learning')->name('learning');

// Страницы подбора оборудования (текущая и старая версии).
Route::view('/selection', 'selection')->middleware('php-session')->name('selection');
Route::view('/selection-old', 'selection-old')->middleware('php-session')->name('selection-old');

// SPA-страница для создания новой схемы.
Route::view('/scheme', 'spa', ['scheme' => null])->middleware('php-session')->name('scheme');

// SPA-страница для редактирования существующей схемы по идентификатору.
Route::get('/scheme/{scheme}', function (Scheme $scheme) {
    return view('spa', ['scheme' => $scheme]);
})
    ->whereNumber('scheme')
    ->middleware('php-session')
    ->name('scheme.with-id');
