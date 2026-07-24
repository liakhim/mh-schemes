<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Валидация данных при создании новой схемы.
 */
class StoreSchemeRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:65535'],
            'incoming_scheme' => ['required', 'array'],
            'selection_config' => ['nullable', 'array'],
            'selection_config.schema' => ['required_with:selection_config', 'string', 'in:mh.selection-config'],
            'selection_config.version' => ['required_with:selection_config', 'integer', 'min:1'],
            'selection_config.created_at' => ['nullable', 'date'],
            'selection_config.intent' => ['nullable', 'array'],
            'selection_config.editor' => ['nullable', 'array'],
            'selection_config.selection_state' => ['required_with:selection_config', 'array'],
        ];
    }
}
