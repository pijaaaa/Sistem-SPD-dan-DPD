<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\Master\RoleController;
use App\Http\Controllers\API\Master\RoleHierarchyController;
use App\Http\Controllers\API\Master\DepartmentController;
use App\Http\Controllers\API\Master\EmployeeController;
use App\Http\Controllers\API\Master\DelegationController;
use App\Http\Controllers\API\DpdController;

use App\Http\Controllers\API\SpdApprovalController;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    Route::prefix('spd')->group(function () {
        Route::get('/my-approvals', [SpdApprovalController::class, 'myApprovals']);
        Route::post('/approval/{chain}/approve', [SpdApprovalController::class, 'approve']);
        Route::post('/approval/{chain}/reject', [SpdApprovalController::class, 'reject']);
    });

    Route::prefix('master')->middleware(['role:super_admin'])->group(function () {
        Route::get('/roles', [RoleController::class, 'index']);
        Route::get('/role-hierarchies', [RoleHierarchyController::class, 'index']);
        
        Route::apiResource('departments', DepartmentController::class);
        Route::apiResource('employees', EmployeeController::class);
    });

    Route::prefix('delegations')->middleware(['role:general_manager'])->group(function () {
        Route::get('/', [DelegationController::class, 'index']);
        Route::get('/active', [DelegationController::class, 'active']);
        Route::post('/', [DelegationController::class, 'store']);
        Route::put('/{delegation}', [DelegationController::class, 'update']);
        Route::post('/{delegation}/cancel', [DelegationController::class, 'cancel']);
        Route::delete('/{delegation}', [DelegationController::class, 'destroy']);
    });

    Route::prefix('dpd')->middleware('auth:sanctum')->group(function () {
        Route::get('/', [DpdController::class, 'index']);
        Route::get('/{dpd}', [DpdController::class, 'show']);
        Route::post('/', [DpdController::class, 'store']);
    });
});
