<?php

use App\Models\Scheme;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/selection');
Route::view('/admin', 'admin', ['data' => 'test'])->name('admin');

Route::get('/schemes', function () {
    return view('schemes', [
        'schemes' => Scheme::query()
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->paginate(20),
    ]);
})->name('schemes.index');

Route::delete('/api/schemes', function (Request $request) {
    $validated = $request->validate([
        'ids' => ['required', 'array', 'min:1'],
        'ids.*' => ['required', 'integer', 'distinct'],
    ]);

    $deleted = Scheme::query()->whereIn('id', $validated['ids'])->delete();

    return response()->json(['deleted' => $deleted]);
})->name('schemes.destroy-many');

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
        'name' => ['sometimes', 'required', 'string', 'max:255'],
        'incoming_scheme' => ['sometimes', 'required', 'array'],
    ]);

    if (array_key_exists('name', $validated)) {
        $scheme->name = $validated['name'];
    }
    if (array_key_exists('incoming_scheme', $validated)) {
        $scheme->incoming_scheme = $validated['incoming_scheme'];
    }
    $scheme->save();

    return response()->json([
        'id' => $scheme->id,
        'name' => $scheme->name,
        'incoming_scheme' => $scheme->incoming_scheme,
    ]);
})->whereNumber('scheme')->name('schemes.update');

Route::delete('/api/schemes/{scheme}', function (Scheme $scheme) {
    $scheme->delete();

    return response()->noContent();
})->whereNumber('scheme')->name('schemes.destroy');

$integrationHeaders = function (Request $request): array {
    $headers = [
        'Accept' => '*/*',
        'Origin' => 'https://mhtest.ru',
        'Referer' => 'https://mhtest.ru/podbor-oborudovaniya',
    ];

    if ($request->header('Cookie')) {
        $headers['Cookie'] = $request->header('Cookie');
    }

    return $headers;
};

$proxyIntegration = function (Request $request) use ($integrationHeaders) {
    $response = Http::withHeaders($integrationHeaders($request))
        ->asJson()
        ->timeout(10)
        ->post('https://mhtest.ru/api/integration', $request->all());

    return response($response->body(), $response->status())
        ->header('Content-Type', 'application/json');
};

Route::post('/api/proxy/integration', $proxyIntegration)->name('proxy.integration');
Route::post('/api/integration', $proxyIntegration)->name('integration.proxy');

Route::post('/api/boilers/search', function (Request $request) use ($integrationHeaders) {
    $validated = $request->validate([
        'query' => ['required', 'string', 'max:255'],
    ]);

    $response = Http::withHeaders($integrationHeaders($request))
        ->asJson()
        ->timeout(10)
        ->post('https://mhtest.ru/api/integration', [
            'action' => 'getNames',
            'data' => [
                'name' => $validated['query'],
            ],
        ]);

    return response($response->body(), $response->status())
        ->header('Content-Type', 'application/json');
})->name('boilers.search');

Route::view('/selection', 'selection')->name('selection');
Route::view('/selection-old', 'selection-old')->name('selection-old');
Route::view('/scheme', 'spa', ['scheme' => null])->name('scheme');
Route::get('/scheme/{scheme}', function (Scheme $scheme) {
    return view('spa', ['scheme' => $scheme]);
})
    ->whereNumber('scheme')
    ->name('scheme.with-id');
