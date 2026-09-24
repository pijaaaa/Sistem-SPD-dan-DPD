<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Dpd;
use Illuminate\Auth\Access\HandlesAuthorization;

class DpdPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Dpd $dpd): bool
    {
        if ($user->employee?->role->name === 'super_admin') return true;
        if ($dpd->employee_id === $user->employee_id) return true;
        return $user->employee?->role->name === 'admin_departemen';
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Dpd $dpd): bool
    {
        if ($user->employee?->role->name === 'super_admin') return true;
        if ($dpd->employee_id !== $user->employee_id) return false;
        return $dpd->status === 'draft';
    }

    public function delete(User $user, Dpd $dpd): bool
    {
        if ($user->employee?->role->name === 'super_admin') return true;
        if ($dpd->employee_id !== $user->employee_id) return false;
        return $dpd->status === 'draft';
    }
}