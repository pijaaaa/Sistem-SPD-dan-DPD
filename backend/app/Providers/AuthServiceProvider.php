<?php

namespace App\Providers;

use App\Models\Dpd;
use App\Models\Spd;
use App\Policies\DpdPolicy;
use App\Policies\SpdPolicy;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Spd::class => SpdPolicy::class,
        Dpd::class => DpdPolicy::class,
    ];

    public function boot(): void
    {
        foreach ($this->policies as $model => $policy) {
            Gate::policy($model, $policy);
        }
    }

    public function register(): void
    {
        //
    }
}
