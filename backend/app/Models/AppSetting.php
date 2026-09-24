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
    }
}