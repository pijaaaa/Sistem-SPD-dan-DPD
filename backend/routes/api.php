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
use App\Http\Controllers\API\DpdApprovalController;
use App\Http\Controllers\API\SpdApprovalController;
use App\Http\Controllers\API\SpdController;
use App\Http\Controllers\API\Settings\AppSettingController;
use App\Http\Controllers\API\DashboardController;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::prefix('spd')->group(function () {
        Route::get('/', [SpdController::class, 'index']);
        Route::post('/', [SpdController::class, 'store']);
        Route::get('/my-approvals', [SpdApprovalController::class, 'myApprovals']);
        Route::get('/approved', [SpdApprovalController::class, 'approvedSpds']);
        Route::get('/{spd}', [SpdController::class, 'show']);
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

    Route::prefix('dpd')->group(function () {
        Route::get('/', [DpdController::class, 'index']);
        Route::get('/categories', [DpdController::class, 'categories']);
        Route::get('/my-approvals', [DpdApprovalController::class, 'myApprovals']);
        Route::post('/{dpd}/validate-submission', [DpdApprovalController::class, 'validateSubmission']);
        Route::post('/approval/{chain}/approve', [DpdApprovalController::class, 'approve']);
        Route::post('/approval/{chain}/reject', [DpdApprovalController::class, 'reject']);
        Route::post('/{dpd}/generate-approval-chain', [DpdApprovalController::class, 'generateApprovalChain']);
        Route::get('/{dpd}', [DpdController::class, 'show']);
        Route::post('/', [DpdController::class, 'store']);
        Route::put('/{dpd}', [DpdController::class, 'update']);
        Route::delete('/{dpd}', [DpdController::class, 'destroy']);
    });

    Route::prefix('settings')->middleware(['role:general_manager'])->group(function () {
        Route::get('/', [AppSettingController::class, 'index']);
        Route::put('/', [AppSettingController::class, 'update']);
        Route::get('/history', [AppSettingController::class, 'history']);
    });
});