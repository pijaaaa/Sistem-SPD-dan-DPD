<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dpd_approval_chains', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dpd_id')->constrained('dpds')->cascadeOnDelete();
            $table->foreignId('approver_employee_id')->constrained('employees')->cascadeOnDelete();
            $table->integer('level_order');
            $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled'])->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dpd_approval_chains');
    }
};
