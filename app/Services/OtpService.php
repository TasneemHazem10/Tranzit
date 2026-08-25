<?php

namespace App\Services;

use App\Models\OtpCode;
use Illuminate\Support\Facades\Log;

class OtpService
{
    public const LIFETIME_MINUTES = 10;
    public const RESEND_SECONDS = 45;

    public function send(string $phone, string $purpose): OtpCode
    {
        OtpCode::where('phone', $phone)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        $code = (string) random_int(1000, 9999);

        $otp = OtpCode::create([
            'phone' => $phone,
            'code' => $code,
            'purpose' => $purpose,
            'expires_at' => now()->addMinutes(self::LIFETIME_MINUTES),
        ]);

        Log::info("Tranzit OTP for {$phone} ({$purpose}): {$code}");

        return $otp;
    }

    public function verify(string $phone, string $purpose, string $code): bool
    {
        $otp = OtpCode::where('phone', $phone)
            ->where('purpose', $purpose)
            ->where('code', $code)
            ->latest()
            ->first();

        if (! $otp || ! $otp->isValid()) {
            return false;
        }

        $otp->update(['consumed_at' => now()]);

        return true;
    }

    public function debugCode(OtpCode $otp): ?string
    {
        if (config('app.otp_debug')) {
            return $otp->code;
        }

        return null;
    }
}
