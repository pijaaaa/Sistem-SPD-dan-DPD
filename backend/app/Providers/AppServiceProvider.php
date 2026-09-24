<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

use App\Models\Department;
use App\Models\Role;
use App\Models\RoleHierarchy;
use App\Observers\DepartmentObserver;
use App\Observers\RoleObserver;
use App\Observers\RoleHierarchyObserver;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Department::observe(DepartmentObserver::class);
        Role::observe(RoleObserver::class);
        RoleHierarchy::observe(RoleHierarchyObserver::class);
    }
}
