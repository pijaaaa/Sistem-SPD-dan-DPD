<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DpdExpense extends Model
{
    protected $fillable = ['dpd_id', 'category_id', 'description', 'amount', 'expense_date', 'attachments'];

    protected $appends = ['attachment_urls'];

    protected $casts = [
        'amount' => 'decimal:2',
        'expense_date' => 'date',
        'attachments' => 'array',
    ];

    public function dpd()
    {
        return $this->belongsTo(Dpd::class);
    }

    public function category()
    {
        return $this->belongsTo(DpdExpenseCategory::class);
    }

    public function getAttachmentUrlsAttribute()
    {
        if ($this->attachments && is_array($this->attachments)) {
            return array_map(function ($path) {
                return asset('storage/' . $path);
            }, $this->attachments);
        }
        return [];
    }

    // Backward compatibility
    public function getAttachmentUrlAttribute()
    {
        $urls = $this->attachment_urls;
        return !empty($urls) ? $urls[0] : null;
    }
}
