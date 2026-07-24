<?php

namespace App\Http\Controllers;

use App\Http\Requests\DestroyManySchemesRequest;
use App\Http\Requests\StoreSchemeRequest;
use App\Http\Requests\UpdateSchemeRequest;
use App\Http\Resources\SchemeResource;
use App\Models\Scheme;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
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
     * Показать данные одной схемы в формате JSON.
     */
    public function show(Scheme $scheme): SchemeResource
    {
        return new SchemeResource($scheme);
    }

    /**
     * Создать новую схему.
     */
    public function store(StoreSchemeRequest $request): JsonResponse
    {
        $scheme = Scheme::create([
            ...$request->validated(),
            'user_id' => 1,
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
        $scheme->fill($request->validated());
        $scheme->save();

        return new SchemeResource($scheme);
    }

    /**
     * Удалить одну схему.
     */
    public function destroy(Scheme $scheme): Response
    {
        $scheme->delete();

        return response()->noContent();
    }

    /**
     * Удалить несколько схем по списку идентификаторов.
     */
    public function destroyMany(DestroyManySchemesRequest $request): JsonResponse
    {
        $deleted = Scheme::query()->whereIn('id', $request->validated('ids'))->delete();

        return response()->json(['deleted' => $deleted]);
    }
}
