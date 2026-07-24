<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Валидация данных при обновлении существующей схемы.
 */
class UpdateSchemeRequest extends FormRequest
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
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:65535'],
            'system_device_id' => ['sometimes', 'nullable', 'integer'],
            'incoming_scheme' => ['sometimes', 'required', 'array'],
        ];
    }
}
