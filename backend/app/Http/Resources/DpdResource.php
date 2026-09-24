<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class DpdResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'spd_id' => $this->spd_id,
            'dpd_number' => $this->dpd_number,
            'employee_id' => $this->employee_id,
            'submission_date' => $this->submission_date,
            'total_nominal' => $this->total_nominal,
            'status' => $this->status,
            'spm_date' => $this->spm_date,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'spd' => $this->whenLoaded('spd'),
            'employee' => $this->whenLoaded('employee'),
            'reports' => DpdReportResource::collection($this->whenLoaded('reports')),
            'expenses' => DpdExpenseResource::collection($this->whenLoaded('expenses')),
        ];
    }
}
