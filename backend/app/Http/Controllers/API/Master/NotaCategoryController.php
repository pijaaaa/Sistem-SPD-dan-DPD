<?php

namespace App\Http\Controllers\API\Master;

use App\Http\Controllers\Controller;
use App\Models\DpdExpenseCategory;
use App\Http\Requests\StoreNotaCategoryRequest;
use App\Http\Requests\UpdateNotaCategoryRequest;
use Illuminate\Support\Facades\Cache;

class NotaCategoryController extends Controller
{
    public function index()
    {
        $categories = Cache::remember('master_nota_categories', 300, function () {
            return DpdExpenseCategory::orderBy('name')->get();
        });

        return response()->json($categories);
    }

    public function store(StoreNotaCategoryRequest $request)
    {
        $category = DpdExpenseCategory::create($request->validated());
        Cache::forget('master_nota_categories');
        return response()->json($category, 201);
    }

    public function show(DpdExpenseCategory $nota_category)
    {
        return response()->json($nota_category);
    }

    public function update(UpdateNotaCategoryRequest $request, DpdExpenseCategory $nota_category)
    {
        $nota_category->update($request->validated());
        Cache::forget('master_nota_categories');
        return response()->json($nota_category);
    }

    public function destroy(DpdExpenseCategory $nota_category)
    {
        $nota_category->delete();
        Cache::forget('master_nota_categories');
        return response()->json(null, 204);
    }
}
