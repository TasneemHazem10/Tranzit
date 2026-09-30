<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Removed: jobs, job_batches, and failed_jobs tables are not used by TRANZET app.
    }

    public function down(): void
    {
        //
    }
};
