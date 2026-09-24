<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\AppSettingLog;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;

class AppSettingService
{
    const CACHE_PREFIX = 'app_setting_';
    const CACHE_TTL = 3600;

    public function get(string $key, $default = null)
    {
        return Cache::remember(self::CACHE_PREFIX . $key, self::CACHE_TTL, function () use ($key, $default) {
            return AppSetting::get($key, $default);
        });
    }

    public function getInt(string $key, int $default = 0): int
    {
        return (int) $this->get($key, $default);
    }

    public function getFloat(string $key, float $default = 0.0): float
    {
        return (float) $this->get($key, $default);
    }

    public function set(string $key, $value, ?string $description = null): void
    {
        $oldValue = AppSetting::get($key);

        AppSetting::set($key, $value, $description);
        Cache::forget(self::CACHE_PREFIX . $key);

        // Catat riwayat perubahan
        AppSettingLog::create([
            'key' => $key,
            'old_value' => $oldValue,
            'new_value' => $value,
            'changed_by' => Auth::id(),
        ]);
    }

    public function getHistory(string $key, int $limit = 20)
    {
        return AppSettingLog::with('changedBy')
            ->where('key', $key)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();
    }

    public function getAllHistory(int $limit = 50)
    {
        return AppSettingLog::with('changedBy')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();
    }

    public function flush(): void
    {
        Cache::flush();
    }

    public function getMaxNominalPerDay(): ?float
    {
        return $this->getFloat('max_nominal_per_day', 0);
    }

    public function getDpdSubmissionDeadlineDays(): int
    {
        return $this->getInt('dpd_submission_deadline_days', 30);
    }

    public function getAll(): array
    {
        return AppSetting::all()->keyBy('key')->map(fn ($s) => $s->value)->toArray();
    }
}
