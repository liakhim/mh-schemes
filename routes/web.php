<?php

use App\Http\Controllers\IntegrationController;
use App\Http\Controllers\SchemeController;
use App\Models\Scheme;
use Illuminate\Support\Facades\Route;

// Редирект с главной страницы на страницу подбора оборудования.
Route::redirect('/', '/selection');

// Административная страница (тестовые данные).
Route::view('/admin', 'admin', ['data' => 'test'])->name('admin');

// Страница со списком схем с возможностью поиска по названию.
Route::get('/schemes', [SchemeController::class, 'index'])->name('schemes.index');

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
Route::view('/selection', 'selection')->name('selection');
Route::view('/selection-old', 'selection-old')->name('selection-old');

// SPA-страница для создания новой схемы.
Route::view('/scheme', 'spa', ['scheme' => null])->name('scheme');

// SPA-страница для редактирования существующей схемы по идентификатору.
Route::get('/scheme/{scheme}', function (Scheme $scheme) {
    return view('spa', ['scheme' => $scheme]);
})
    ->whereNumber('scheme')
    ->name('scheme.with-id');
