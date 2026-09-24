<?php

namespace App\Observers;

use App\Models\RoleHierarchy;
use Illuminate\Support\Facades\Cache;

class RoleHierarchyObserver
{
    /**
     * Handle the RoleHierarchy "created" event.
     */
    public function created(RoleHierarchy $roleHierarchy): void
    {
        Cache::forget('master_role_hierarchies');
    }

    public function updated(RoleHierarchy $roleHierarchy): void
    {
        Cache::forget('master_role_hierarchies');
    }

    public function deleted(RoleHierarchy $roleHierarchy): void
    {
        Cache::forget('master_role_hierarchies');
    }

    /**
     * Handle the RoleHierarchy "restored" event.
     */
    public function restored(RoleHierarchy $roleHierarchy): void
    {
        //
    }

    /**
     * Handle the RoleHierarchy "force deleted" event.
     */
    public function forceDeleted(RoleHierarchy $roleHierarchy): void
    {
        //
    }
}
