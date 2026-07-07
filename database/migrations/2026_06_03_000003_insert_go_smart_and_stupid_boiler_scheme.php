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
            'name' => 'GO с одним умным котлом и 1 тупым',
            'description' => 'GO с одним умным котлом и 1 тупым',
            'user_id' => 1,
            'version' => 1,
            'system_device_id' => null,
            'incoming_scheme' => json_encode([
                'boilers' => [],
                'sensors' => [
                    [
                        'id' => 0,
                        'device_type' => 'sensor',
                        'type' => 'flask-sensor-stupid-boiler',
                        'connection_type' => '1-wire',
                    ],
                ],
                'controller' => [
                    'type' => 'go',
                    'di_devices' => [],
                    'bus_devices' => [
                        [
                            'id' => 0,
                            'name' => 'Baxi Slim',
                            'type' => 'smart',
                            'reserve' => false,
                            'device_type' => 'boiler',
                            'connection_type' => 'BUS',
                        ],
                    ],
                    'devices_420' => [],
                    'relay_devices' => [
                        [
                            'id' => 0,
                            'type' => 'otherEquipment',
                            'connection_type' => 'relay',
                            'additions' => [],
                            'port_side' => 'right',
                        ],
                    ],
                    'one_wire_devices' => [],
                ],
                'di_modules' => [],
                'ext_modules' => [],
                'wifi_modules' => [],
                'power_modules' => [],
                'wired_devices' => [],
                'one_wire_modules' => [],
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
            ->where('name', 'GO с одним умным котлом и 1 тупым')
            ->where('user_id', 1)
            ->where('version', 1)
            ->delete();
    }
};
