<?php

namespace Database\Seeders;

use App\Models\DpdExpenseCategory;
use Illuminate\Database\Seeder;

class DpdExpenseCategoriesSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Transport', 'code' => 'transport', 'description' => 'Biaya transportasi (pesawat, kereta, mobil)'],
            ['name' => 'Akomodasi', 'code' => 'accommodation', 'description' => 'Biaya penginapan dan akomodasi'],
            ['name' => 'Konsumsi', 'code' => 'consumption', 'description' => 'Biaya makanan dan minuman'],
            ['name' => 'Lainnya', 'code' => 'other', 'description' => 'Biaya lain-lain'],
        ];

        foreach ($categories as $category) {
            DpdExpenseCategory::create($category);
        }
    }
}