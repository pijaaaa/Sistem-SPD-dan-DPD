<?php

namespace App\Http\Controllers\API\Master;

use App\Http\Controllers\Controller;
use App\Models\RoleHierarchy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class RoleHierarchyController extends Controller
{
    public function index()
    {
        $hierarchies = Cache::remember('master_role_hierarchies', 300, function () {
            return RoleHierarchy::with(['role', 'nextApproverRole'])->get();
        });
        
        return response()->json($hierarchies);
    }
}
