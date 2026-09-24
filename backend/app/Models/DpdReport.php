<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DpdReport extends Model
{
    protected $fillable = ['dpd_id', 'title', 'description', 'attachment_path'];

    protected $casts = [
        'attachment_path' => 'string',
    ];

    public function dpd()
    {
        return $this->belongsTo(Dpd::class);
    }

    public function getAttachmentUrlAttribute()
    {
        if ($this->attachment_path) {
            return asset('storage/' . $this->attachment_path);
        }
        return null;
    }
}