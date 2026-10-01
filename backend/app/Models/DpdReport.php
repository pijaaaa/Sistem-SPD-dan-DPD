<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DpdReport extends Model
{
    protected $fillable = ['dpd_id', 'title', 'description', 'attachments'];

    protected $appends = ['attachment_urls'];

    protected $casts = [
        'attachments' => 'array',
    ];

    public function dpd()
    {
        return $this->belongsTo(Dpd::class);
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
