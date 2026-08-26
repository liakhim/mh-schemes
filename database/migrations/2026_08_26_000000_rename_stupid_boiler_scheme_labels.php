<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $this->renameScheme(
            'GO с одним умным котлом и 1 тупым',
            'GO с одним умным котлом и 1 простым',
        );
        $this->renameScheme(
            'GO с одним умным и тупым котлом и заполненным ntc модулем',
            'GO с одним умным и простым котлом и заполненным ntc модулем',
        );
    }

    public function down(): void
    {
        $this->renameScheme(
            'GO с одним умным котлом и 1 простым',
            'GO с одним умным котлом и 1 тупым',
        );
        $this->renameScheme(
            'GO с одним умным и простым котлом и заполненным ntc модулем',
            'GO с одним умным и тупым котлом и заполненным ntc модулем',
        );
    }

    private function renameScheme(string $from, string $to): void
    {
        DB::table('schemes')
            ->where('description', $from)
            ->update(['description' => $to]);

        DB::table('schemes')
            ->where('name', $from)
            ->update(['name' => $to]);
    }
};
