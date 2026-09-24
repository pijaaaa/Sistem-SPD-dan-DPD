<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Spd;
use App\Models\SpdEmployee;
use Illuminate\Auth\Access\HandlesAuthorization;

class SpdPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Spd $spd): bool
    {
        if ($user->employee?->role->name === 'super_admin') return true;

        $isParticipant = SpdEmployee::where('spd_id', $spd->id)
            ->where('employee_id', $user->employee_id)
            ->exists();

        return $isParticipant || $user->employee?->role->name === 'admin_departemen';
    }

    public function create(User $user): bool
    {
        $role = $user->employee?->role->name;
        return in_array($role, ['admin_departemen', 'super_admin']);
    }

    public function update(User $user, Spd $spd): bool
    {
        if ($user->employee?->role->name === 'super_admin') return true;
        return false;
    }

    public function delete(User $user, Spd $spd): bool
    {
        return $user->employee?->role->name === 'super_admin';
    }
}
