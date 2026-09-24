<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoleHierarchy extends Model
{
    protected $fillable = ['role_id', 'next_approver_role_id'];

    public function role()
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function nextApproverRole()
    {
        return $this->belongsTo(Role::class, 'next_approver_role_id');
    }
}
