<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Twilio\Rest\Client as TwilioClient;

class SmsService
{
    public function send(string $to, string $message): bool
    {
        $sid = config('services.twilio.sid');
        $token = config('services.twilio.auth_token');
        $from = config('services.twilio.from');

        if (empty($sid) || empty($token) || empty($from)) {
            Log::warning('Twilio SMS not configured. Message to '.$to.': '.$message);

            return false;
        }

        try {
            $client = new TwilioClient($sid, $token);
            $client->messages->create($to, [
                'from' => $from,
                'body' => $message,
            ]);

            Log::info('SMS sent to '.$to);

            return true;
        } catch (\Throwable $e) {
            Log::error('Twilio SMS failed to '.$to.': '.$e->getMessage());

            return false;
        }
    }
}
