<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    /**
     * Send a push notification to a user via Expo Push Notification Service.
     */
    public function sendToUser(User $user, string $title, string $body, array $data = []): bool
    {
        if (! $user->push_token) {
            return false;
        }

        return $this->send([$user->push_token], $title, $body, $data);
    }

    /**
     * Send push notifications to multiple Expo push tokens.
     */
    public function send(array $tokens, string $title, string $body, array $data = []): bool
    {
        if (empty($tokens)) {
            return false;
        }

        $messages = array_map(fn ($token) => [
            'to' => $token,
            'title' => $title,
            'body' => $body,
            'data' => $data,
            'sound' => 'default',
            'badge' => 1,
        ], $tokens);

        try {
            $response = Http::timeout(10)
                ->withHeaders(['Accept' => 'application/json'])
                ->post('https://exp.host/--/api/v2/push/send', $messages);

            if ($response->failed()) {
                Log::error('Push notification failed: ' . $response->body());
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('Push notification error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Persist an in-app notification row and send a device push.
     */
    public function persistAndNotify(User $user, string $title, string $body, array $data = []): void
    {
        UserNotification::create([
            'user_id' => $user->id,
            'title'   => $title,
            'body'    => $body,
            'type'    => $data['type'] ?? 'shipment',
            'data'    => $data,
        ]);

        $this->sendToUser($user, $title, $body, $data);
    }

    /**
     * Send push notification to a driver via Expo Push Notification Service.
     */
    public function sendToDriver(\App\Models\Driver $driver, string $title, string $body, array $data = []): bool
    {
        if (! $driver->push_token) {
            return false;
        }

        return $this->send([$driver->push_token], $title, $body, $data);
    }

    /**
     * Notify user about shipment status change.
     */
    public function notifyShipmentUpdate(User $user, string $trackingCode, string $status, string $note): void
    {
        $titleMap = [
            'assigned'  => 'تم تعيين سائق لشحنتك',
            'picked_up' => 'تم استلام شحنتك',
            'in_transit' => 'شحنتك في الطريق',
            'delivered' => 'تم تسليم شحنتك بنجاح',
            'canceled'  => 'تم إلغاء الشحنة',
        ];

        $this->persistAndNotify(
            $user,
            $titleMap[$status] ?? 'تحديث الشحنة',
            $note,
            ['tracking_code' => $trackingCode, 'status' => $status, 'type' => 'shipment']
        );
    }
}
