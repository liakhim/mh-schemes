<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * JSON-представление схемы для API-ответов.
 *
 * @mixin \App\Models\Scheme
 */
class SchemeResource extends JsonResource
{
    /**
     * Не оборачивать ответ в ключ "data" — сохраняем плоскую структуру,
     * на которую уже опирается фронтенд и тесты.
     *
     * @var string|null
     */
    public static $wrap = null;

    /**
     * Преобразовать схему в массив для ответа.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'user_id' => $this->user_id,
            'version' => $this->version,
            'system_device_id' => $this->system_device_id,
            'incoming_scheme' => $this->incoming_scheme,
            'selection_config' => $this->selection_config,
            'updated_at' => $this->updated_at?->format('Y-m-d H:i'),
        ];
    }
}
