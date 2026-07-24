<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Валидация списка идентификаторов при массовом удалении схем.
 */
class DestroyManySchemesRequest extends FormRequest
{
    /**
     * Определить, разрешено ли пользователю выполнить этот запрос.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Правила валидации входных данных.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'distinct'],
        ];
    }
}
