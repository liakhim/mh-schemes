<?php

namespace App\Http\Controllers;

use App\Http\Requests\DestroyManySchemesRequest;
use App\Http\Requests\StoreSchemeRequest;
use App\Http\Requests\UpdateSchemeRequest;
use App\Http\Resources\SchemeResource;
use App\Models\Scheme;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\View\View;

/**
 * Управление схемами: список, просмотр, создание, изменение и удаление.
 */
class SchemeController extends Controller
{
    /**
     * Показать страницу со списком схем с возможностью поиска по названию.
     */
    public function index(Request $request): View
    {
        $search = trim((string) $request->query('search', ''));

        return view('schemes', [
            'schemes' => Scheme::query()
                ->when($search !== '', fn ($query) => $query->where('name', 'like', "%{$search}%"))
                ->orderByDesc('updated_at')
                ->orderByDesc('id')
                ->paginate(20)
                ->withQueryString(),
            'search' => $search,
        ]);
    }

    /**
     * Показать рабочий список схем в разделе подбора оборудования.
     */
    public function selectionDashboard(): View
    {
        $userId = $this->currentUserId(request());

        return view('services', [
            'schemes' => config('database.enabled')
                ? Scheme::query()
                    ->where('user_id', $userId)
                    ->orderByDesc('updated_at')
                    ->orderByDesc('id')
                    ->paginate(20)
                : new LengthAwarePaginator([], 0, 20, options: ['path' => request()->url()]),
        ]);
    }

    /**
     * Показать редактор новой схемы.
     */
    public function create(): View
    {
        return view('spa', ['scheme' => null]);
    }

    /**
     * Показать редактор существующей схемы.
     */
    public function edit(Request $request, Scheme $scheme): View
    {
        $this->authorizeScheme($request, $scheme);

        return view('spa', ['scheme' => $scheme]);
    }

    /**
     * Показать данные одной схемы в формате JSON.
     */
    public function show(Request $request, Scheme $scheme): SchemeResource
    {
        $this->authorizeScheme($request, $scheme);

        return new SchemeResource($scheme);
    }

    /**
     * Создать новую схему.
     */
    public function store(StoreSchemeRequest $request): JsonResponse
    {
        $scheme = Scheme::create([
            ...$request->validated(),
            'user_id' => $this->currentUserId($request),
        ]);

        return (new SchemeResource($scheme))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Обновить существующую схему.
     */
    public function update(UpdateSchemeRequest $request, Scheme $scheme): SchemeResource
    {
        $this->authorizeScheme($request, $scheme);
        $scheme->fill($request->validated());
        $scheme->save();

        return new SchemeResource($scheme);
    }

    /**
     * Удалить одну схему.
     */
    public function destroy(Request $request, Scheme $scheme): Response|RedirectResponse
    {
        $this->authorizeScheme($request, $scheme);
        $scheme->delete();

        return $request->expectsJson()
            ? response()->noContent()
            : redirect()->route('user-schemes')->with('status', 'Схема удалена.');
    }

    /**
     * Удалить несколько схем по списку идентификаторов.
     */
    public function destroyMany(DestroyManySchemesRequest $request): JsonResponse
    {
        $deleted = Scheme::query()
            ->where('user_id', $this->currentUserId($request))
            ->whereIn('id', $request->validated('ids'))
            ->delete();

        return response()->json(['deleted' => $deleted]);
    }

    private function currentUserId(Request $request): int
    {
        return (int) ($request->user()?->getAuthIdentifier() ?? 1);
    }

    private function authorizeScheme(Request $request, Scheme $scheme): void
    {
        abort_unless($scheme->user_id === $this->currentUserId($request), 404);
    }
}
