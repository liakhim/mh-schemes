<?php

namespace App\Console\Commands;

use App\Models\BetaAccessCode;
use Illuminate\Console\Command;

class GenerateBetaAccessCodes extends Command
{
    protected $signature = 'beta:codes {--count=20 : Number of codes to generate}';

    protected $description = 'Generate beta access links and store only their hashes';

    public function handle(): int
    {
        $count = (int) $this->option('count');
        if ($count < 1 || $count > 100) {
            $this->error('Count must be between 1 and 100.');

            return self::FAILURE;
        }

        $rows = [];
        while (count($rows) < $count) {
            $code = $this->randomCode();
            $created = BetaAccessCode::query()->firstOrCreate([
                'code_hash' => BetaAccessCode::hashCode($code),
            ]);

            if (! $created->wasRecentlyCreated) {
                continue;
            }

            $rows[] = [$code, url('/beta/'.$code)];
        }

        $this->warn('These codes are shown once. Store them securely.');
        $this->table(['Code', 'Activation link'], $rows);

        return self::SUCCESS;
    }

    private function randomCode(): string
    {
        $alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        $value = '';
        for ($index = 0; $index < 10; $index++) {
            $value .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }

        return substr($value, 0, 5).'-'.substr($value, 5);
    }
}
