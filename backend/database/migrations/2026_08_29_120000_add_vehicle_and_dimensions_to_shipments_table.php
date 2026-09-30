<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->string('vehicle_type', 60)->nullable()->after('package_type');
            $table->decimal('weight_kg', 8, 2)->nullable()->after('vehicle_type');
            $table->decimal('length_cm', 8, 2)->nullable()->after('weight_kg');
            $table->decimal('width_cm', 8, 2)->nullable()->after('length_cm');
            $table->decimal('height_cm', 8, 2)->nullable()->after('width_cm');
        });
    }

    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn(['vehicle_type', 'weight_kg', 'length_cm', 'width_cm', 'height_cm']);
        });
    }
};