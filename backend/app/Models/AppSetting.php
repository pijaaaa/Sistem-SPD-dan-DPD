<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    protected $fillable = ['key', 'value', 'description'];

    public static function get(string $key, $default = null)
    {
        $setting = static::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    public static function getInt(string $key, int $default = 0): int
    {
        return (int) static::get($key, $default);
    }

    public static function set(string $key, $value, ?string $description = null): self
    {
        $setting = static::updateOrCreate(['key' => $key], [
            'value' => $value,
            'description' => $description,
        ]);

        return $setting;
    }

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($setting) {
            // Validasi tipe data berdasarkan key saat save
            $valid = self::validateSettingValue($setting->key, $setting->value);
            if (!$valid) {
                $message = 'Nilai setting tidak valid untuk key: ' . $setting->key;
                throw new \InvalidArgumentException($message);
            }
        });
    }

    protected static function validateSettingValue(string $key, $value): bool
    {
        if ($value === null || $value === '') {
            return true; // boleh kosong
        }

        // Validasi berdasarkan key
        if ($key === 'dpd_submission_deadline_days') {
            // Harus integer positif
            $intVal = (int) $value;
            return $intVal > 0 && (string) $intVal === (string) $value;
        }

        if ($key === 'max_nominal_per_day') {
            // Harus numeric positif (bisa desimal)
            $floatVal = (float) $value;
            return $floatVal > 0 && (float) $floatVal === (float) $value;
        }

        // Key lain: biarkan bebas (validasi minimal ada value)
        return true;
    }
}