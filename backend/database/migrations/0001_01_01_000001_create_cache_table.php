<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Removed: cache and cache_locks tables are not used by TRANZET app.
    }

    public function down(): void
    {
        //
    }
};
