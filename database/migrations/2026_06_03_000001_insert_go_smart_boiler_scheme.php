<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('schemes')->insert([
            'name' => 'GO с одним умным котлом',
            'description' => 'GO с одним умным котлом',
            'user_id' => 1,
            'version' => 1,
            'system_device_id' => null,
            'incoming_scheme' => json_encode([
                'controller' => [
                    'type' => 'go',
                    'relay_devices' => [],
                    'one_wire_devices' => [],
                    'bus_devices' => [],
                ],
                'ext_modules' => [],
                'boilers' => [
                    [
                        'id' => 0,
                        'device_type' => 'boiler',
                        'type' => 'smart',
                        'name' => 'Baxi Slim',
                        'reserve' => false,
                        'connection_type' => 'BUS',
                    ],
                ],
                'di_modules' => [],
                'one_wire_modules' => [],
                'power_modules' => [],
                'wifi_modules' => [],
                'sensors' => [],
                'wired_devices' => [],
                'wireless_devices' => [],
            ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('schemes')
            ->where('name', 'GO с одним умным котлом')
            ->where('user_id', 1)
            ->where('version', 1)
            ->delete();
    }
};
