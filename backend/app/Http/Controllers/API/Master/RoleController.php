<?php

namespace App\Http\Controllers\API\Master;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class RoleController extends Controller
{
    public function index()
    {
        $roles = Cache::remember('master_roles', 300, function () {
            return Role::orderBy('level', 'desc')->get();
        });
        
        return response()->json($roles);
    }
}
