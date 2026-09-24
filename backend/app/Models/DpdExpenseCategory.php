<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DpdExpenseCategory extends Model
{
    protected $fillable = ['name', 'code', 'description'];

    public function expenses()
    {
        return $this->hasMany(DpdExpense::class, 'category_id');
    }
}