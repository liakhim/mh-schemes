<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('schemes', function (Blueprint $table) {
            // 3D planner data (levels, walls, openings, equipment placements, cable routes).
            // Kept separate from incoming_scheme so the wiring contract stays untouched.
            $table->json('floor_plan')->nullable()->after('incoming_scheme');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schemes', function (Blueprint $table) {
            $table->dropColumn('floor_plan');
        });
    }
};
