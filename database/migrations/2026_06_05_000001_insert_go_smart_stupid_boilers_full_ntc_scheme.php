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
            'name' => 'GO с одним умным и тупым котлом и заполненным ntc модулем',
            'description' => 'GO с одним умным и тупым котлом и заполненным ntc модулем',
            'user_id' => 1,
            'version' => 1,
            'system_device_id' => null,
            'incoming_scheme' => json_encode([
                'controller' => [
                    'type' => 'go',
                    'relay_devices' => [],
                    'relay_s_devices' => [],
                    'one_wire_devices' => [],
                    'ai_devices' => [],
                    'di_devices' => [],
                    'modbus_devices' => [],
                    'devices_420' => [],
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
                    [
                        'id' => 0,
                        'device_type' => 'boiler',
                        'type' => 'stupid',
                        'name' => 'Baxi HT',
                        'reserve' => false,
                        'connection_type' => 'RELAY',
                    ],
                ],
                'di_modules' => [],
                'one_wire_modules' => [
                    [
                        'id' => 0,
                        'device_type' => 'module',
                        'type' => 'ntc-1-wire',
                        'connection_type' => '1-wire',
                        'ntc1_devices' => [],
                        'ntc2_devices' => [],
                    ],
                ],
                'power_modules' => [],
                'wifi_modules' => [],
                'sensors' => [
                    [
                        'id' => 0,
                        'device_type' => 'sensor',
                        'type' => 'ntc-sensor',
                        'connection_type' => 'ntc',
                    ],
                    [
                        'id' => 1,
                        'device_type' => 'sensor',
                        'type' => 'ntc-sensor',
                        'connection_type' => 'ntc',
                    ],
                    [
                        'id' => 2,
                        'device_type' => 'sensor',
                        'type' => 'ntc-sensor',
                        'connection_type' => 'ntc',
                    ],
                    [
                        'id' => 3,
                        'device_type' => 'sensor',
                        'type' => 'ntc-sensor',
                        'connection_type' => 'ntc',
                    ],
                    [
                        'id' => 4,
                        'device_type' => 'sensor',
                        'type' => 'ntc-sensor',
                        'connection_type' => 'ntc',
                    ],
                    [
                        'id' => 5,
                        'device_type' => 'sensor',
                        'type' => 'ntc-sensor',
                        'connection_type' => 'ntc',
                    ],
                ],
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
            ->where('name', 'GO с одним умным и тупым котлом и заполненным ntc модулем')
            ->where('user_id', 1)
            ->where('version', 1)
            ->delete();
    }
};
