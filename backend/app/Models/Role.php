<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $fillable = ['name', 'level'];

    public function employees()
    {
        return $this->hasMany(Employee::class);
    }

    public function roleHierarchy()
    {
        return $this->hasOne(RoleHierarchy::class);
    }
}
