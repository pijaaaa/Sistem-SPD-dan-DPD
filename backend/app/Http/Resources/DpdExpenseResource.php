<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class DpdExpenseResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'dpd_id' => $this->dpd_id,
            'category_id' => $this->category_id,
            'category' => $this->whenLoaded('category'),
            'description' => $this->description,
            'amount' => $this->amount,
            'expense_date' => $this->expense_date,
            'attachment_url' => $this->attachment_url,
            'created_at' => $this->created_at,
        ];
    }
}
