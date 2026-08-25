<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->string('national_id', 20)->nullable()->after('name');
            $table->string('license_path')->nullable()->after('photo_url');
            $table->string('national_id_path')->nullable()->after('license_path');
            $table->string('insurance_path')->nullable()->after('national_id_path');
            $table->string('registration_path')->nullable()->after('insurance_path');
            $table->string('vehicle_model')->nullable()->after('vehicle_type');
            $table->string('vehicle_year', 4)->nullable()->after('vehicle_model');
            $table->string('vehicle_capacity')->nullable()->after('vehicle_year');
            $table->string('approval_status', 20)->default('pending')->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropColumn([
                'national_id', 'license_path', 'national_id_path',
                'insurance_path', 'registration_path',
                'vehicle_model', 'vehicle_year', 'vehicle_capacity',
                'approval_status',
            ]);
        });
    }
};
