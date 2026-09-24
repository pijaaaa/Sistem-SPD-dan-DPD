<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class DpdReportResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'dpd_id' => $this->dpd_id,
            'title' => $this->title,
            'description' => $this->description,
            'attachment_url' => $this->attachment_url,
            'created_at' => $this->created_at,
        ];
    }
}
