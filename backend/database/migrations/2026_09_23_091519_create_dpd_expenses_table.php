<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('dpd_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dpd_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('dpd_expense_categories')->cascadeOnDelete();
            $table->string('description');
            $table->decimal('amount', 15, 2);
            $table->date('expense_date');
            $table->string('attachment_path')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dpd_expenses');
    }
};
