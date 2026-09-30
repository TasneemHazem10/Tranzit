<?php

namespace App\Services;

use App\Models\OtpCode;
use Illuminate\Support\Facades\Log;

class OtpService
{
    public const LIFETIME_MINUTES = 10;
    public const RESEND_SECONDS = 45;

    public function __construct(private SmsService $sms)
    {
    }

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

        $purposeLabel = match ($purpose) {
            'register' => 'account verification',
            'login' => 'login verification',
            'reset' => 'password reset',
            default => 'verification',
        };

        $message = "Your Tranzet {$purposeLabel} code is: {$code}";

        $this->sms->send($phone, $message);

        Log::info("OTP sent via SMS to {$phone} ({$purpose})");

        if ((bool) config('app.otp_debug')) {
            Log::info("[DEBUG] OTP code for {$phone} ({$purpose}): {$code}");
        }

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
}
