<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'name',
    'description',
    'user_id',
    'version',
    'system_device_id',
    'incoming_scheme',
    'floor_plan',
])]
class Scheme extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'version' => 'integer',
            'system_device_id' => 'integer',
            'incoming_scheme' => 'array',
            'floor_plan' => 'array',
        ];
    }
}
