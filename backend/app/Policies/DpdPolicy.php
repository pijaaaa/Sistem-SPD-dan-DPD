<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Dpd;
use App\Models\SpdEmployee;
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

        if ($dpd->employee_id === $user->employee?->id) return true;

        $isParticipant = SpdEmployee::where('spd_id', $dpd->spd_id)
            ->where('employee_id', $user->employee?->id)
            ->exists();

        return $isParticipant;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Dpd $dpd): bool
    {
        if ($user->employee?->role->name === 'super_admin') return true;
        if ($dpd->employee_id !== $user->employee?->id) return false;
        return $dpd->status === 'draft';
    }

    public function delete(User $user, Dpd $dpd): bool
    {
        if ($user->employee?->role->name === 'super_admin') return true;
        if ($dpd->employee_id !== $user->employee?->id) return false;
        return $dpd->status === 'draft';
    }
}
