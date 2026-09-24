<?php

namespace App\Http\Controllers\API\Master;

use App\Http\Controllers\Controller;
use App\Models\Delegation;
use App\Models\Employee;
use App\Http\Requests\StoreDelegationRequest;
use App\Http\Requests\UpdateDelegationRequest;

class DelegationController extends Controller
{
    public function index()
    {
        $delegations = Delegation::with(['delegator.user', 'delegate.user', 'creator'])
            ->orderByRaw('is_active DESC, end_date DESC')
            ->get();

        return response()->json($delegations);
    }

    public function active()
    {
        $today = now()->toDateString();

        $delegations = Delegation::with(['delegator.user', 'delegate.user'])
            ->where('is_active', true)
            ->where('start_date', '<=', $today)
            ->where('end_date', '>=', $today)
            ->get();

        return response()->json($delegations);
    }

    public function store(StoreDelegationRequest $request)
    {
        try {
            $delegation = Delegation::create([
                'delegator_id' => $request->delegator_id,
                'delegate_id' => $request->delegate_id,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'created_by' => $request->user()->id,
                'is_active' => true,
            ]);

            return response()->json($delegation->load(['delegator', 'delegate', 'creator']), 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function update(UpdateDelegationRequest $request, Delegation $delegation)
    {
        try {
            $data = $request->validated();
            $delegation->update($data);

            return response()->json($delegation->load(['delegator', 'delegate', 'creator']));
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function cancel(Delegation $delegation)
    {
        $delegation->update(['is_active' => false]);

        return response()->json($delegation->load(['delegator', 'delegate', 'creator']));
    }

    public function destroy(Delegation $delegation)
    {
        $delegation->delete();

        return response()->json(null, 204);
    }
}