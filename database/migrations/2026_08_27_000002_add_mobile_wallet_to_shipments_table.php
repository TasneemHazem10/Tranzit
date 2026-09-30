<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->string('mobile_wallet_provider')->nullable()->after('payment_method');
            $table->string('mobile_wallet_number')->nullable()->after('mobile_wallet_provider');
            $table->string('mobile_wallet_status', 20)->default('pending')->after('mobile_wallet_number');
        });
    }

    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn(['mobile_wallet_provider', 'mobile_wallet_number', 'mobile_wallet_status']);
        });
    }
};
