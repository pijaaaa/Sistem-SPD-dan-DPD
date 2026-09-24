<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DpdExpense extends Model
{
    protected $fillable = ['dpd_id', 'category_id', 'description', 'amount', 'expense_date', 'attachment_path'];

    protected $casts = [
        'amount' => 'decimal:2',
        'expense_date' => 'date',
    ];

    public function dpd()
    {
        return $this->belongsTo(Dpd::class);
    }

    public function category()
    {
        return $this->belongsTo(DpdExpenseCategory::class);
    }

    public function getAttachmentUrlAttribute()
    {
        if ($this->attachment_path) {
            return asset('storage/' . $this->attachment_path);
        }
        return null;
    }
}