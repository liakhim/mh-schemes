<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

/**
 * Клиент для обращения к внешнему сервису интеграции mhtest.ru.
 */
class MhTestIntegrationClient
{
    private readonly string $baseUrl;

    private readonly string $origin;

    private readonly string $referer;

    private readonly int $timeout;

    /**
     * Прочитать настройки подключения из конфигурации сервиса (с возможностью переопределить их вручную).
     */
    public function __construct(
        ?string $baseUrl = null,
        ?string $origin = null,
        ?string $referer = null,
        ?int $timeout = null,
    ) {
        $this->baseUrl = $baseUrl ?? (string) config('services.mhtest.base_url');
        $this->origin = $origin ?? (string) config('services.mhtest.origin');
        $this->referer = $referer ?? (string) config('services.mhtest.referer');
        $this->timeout = $timeout ?? (int) config('services.mhtest.timeout', 10);
    }

    /**
     * Отправить произвольный payload в сервис интеграции, пробрасывая куки клиента.
     */
    public function send(array $payload, Request $request): Response
    {
        return Http::withHeaders($this->buildHeaders($request))
            ->asJson()
            ->timeout($this->timeout)
            ->post($this->baseUrl, $payload);
    }

    /**
     * Найти котлы по названию через сервис интеграции.
     */
    public function searchBoilers(string $query, Request $request): Response
    {
        return $this->send([
            'action' => 'getNames',
            'data' => ['name' => $query],
        ], $request);
    }

    /**
     * Собрать заголовки запроса к внешнему сервису, включая куки клиента.
     *
     * @return array<string, string>
     */
    private function buildHeaders(Request $request): array
    {
        $headers = [
            'Accept' => '*/*',
            'Origin' => $this->origin,
            'Referer' => $this->referer,
        ];

        if ($request->header('Cookie')) {
            $headers['Cookie'] = $request->header('Cookie');
        }

        return $headers;
    }
}
