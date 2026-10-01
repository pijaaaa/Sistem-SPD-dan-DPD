<?php

namespace App\Providers;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Role;
use App\Models\RoleHierarchy;
use App\Observers\DepartmentObserver;
use App\Observers\EmployeeObserver;
use App\Observers\RoleHierarchyObserver;
use App\Observers\RoleObserver;
use Illuminate\Support\ServiceProvider;

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
        Employee::observe(EmployeeObserver::class);
        Role::observe(RoleObserver::class);
        RoleHierarchy::observe(RoleHierarchyObserver::class);
    }
}
