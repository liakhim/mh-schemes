<?php

use App\Models\Scheme;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/scheme');
Route::view('/admin', 'admin', ['data' => 'test'])->name('admin');

Route::get('/schemes', function () {
    return view('schemes', [
        'schemes' => Scheme::query()
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->paginate(20),
    ]);
})->name('schemes.index');

Route::get('/api/schemes/{scheme}', function (Scheme $scheme) {
    return response()->json([
        'id' => $scheme->id,
        'name' => $scheme->name,
        'description' => $scheme->description,
        'user_id' => $scheme->user_id,
        'version' => $scheme->version,
        'system_device_id' => $scheme->system_device_id,
        'incoming_scheme' => $scheme->incoming_scheme,
    ]);
})->whereNumber('scheme')->name('schemes.show');

Route::post('/api/schemes', function (Request $request) {
    $validated = $request->validate([
        'name' => ['required', 'string', 'max:255'],
        'description' => ['nullable', 'string', 'max:65535'],
        'incoming_scheme' => ['required', 'array'],
    ]);

    $scheme = Scheme::create([
        'name' => $validated['name'],
        'description' => $validated['description'] ?? null,
        'user_id' => 1,
        'incoming_scheme' => $validated['incoming_scheme'],
    ]);

    return response()->json([
        'id' => $scheme->id,
        'name' => $scheme->name,
        'description' => $scheme->description,
        'incoming_scheme' => $scheme->incoming_scheme,
    ], 201);
})->name('schemes.store');

Route::patch('/api/schemes/{scheme}', function (Request $request, Scheme $scheme) {
    $validated = $request->validate([
        'incoming_scheme' => ['required', 'array'],
    ]);

    $scheme->incoming_scheme = $validated['incoming_scheme'];
    $scheme->save();

    return response()->json([
        'id' => $scheme->id,
        'incoming_scheme' => $scheme->incoming_scheme,
    ]);
})->whereNumber('scheme')->name('schemes.update');

Route::post('/api/proxy/integration', function (Request $request) {
    $response = Http::post('https://my.mhtest.ru/api/landing', $request->all());
    return response($response->body(), $response->status())
        ->header('Content-Type', 'application/json');
})->name('proxy.integration');

Route::view('/selection', 'selection')->name('selection');
Route::view('/scheme', 'spa', ['scheme' => null])->name('scheme');
Route::get('/scheme/{scheme}', function (Scheme $scheme) {
    return view('spa', ['scheme' => $scheme]);
})
    ->whereNumber('scheme')
    ->name('scheme.with-id');
