<?php

namespace App\Http\Controllers;

use App\Services\MhTestIntegrationClient;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Проксирование запросов к внешнему сервису интеграции mhtest.ru.
 */
class IntegrationController extends Controller
{
    public function __construct(private readonly MhTestIntegrationClient $client)
    {
    }

    /**
     * Переслать входящий запрос интеграции во внешний сервис как есть.
     */
    public function proxy(Request $request): Response
    {
        $response = $this->client->send($request->all(), $request);

        return response($response->body(), $response->status())
            ->header('Content-Type', 'application/json');
    }

    /**
     * Найти котлы по названию через внешний сервис интеграции.
     */
    public function searchBoilers(Request $request): Response
    {
        $validated = $request->validate([
            'query' => ['required', 'string', 'max:255'],
        ]);

        $response = $this->client->searchBoilers($validated['query'], $request);

        return response($response->body(), $response->status())
            ->header('Content-Type', 'application/json');
    }
}
