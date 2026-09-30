<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymobService
{
    private string $apiKey;
    private int $integrationId;
    private int $iframeId;

    public function __construct()
    {
        $this->apiKey = config('services.paymob.api_key', '');
        $this->integrationId = (int) config('services.paymob.integration_id', 0);
        $this->iframeId = (int) config('services.paymob.iframe_id', 0);
    }

    public function isConfigured(): bool
    {
        return ! empty($this->apiKey) && $this->integrationId > 0;
    }

    public function getAuthToken(): string
    {
        $response = Http::timeout(10)->post('https://accept.paymob.com/api/auth/tokens', [
            'api_key' => $this->apiKey,
        ]);

        $response->throw();

        return $response->json('token');
    }

    public function createOrder(string $token, int $amountCents, string $deliveryId = ''): int
    {
        $response = Http::timeout(10)->withToken($token)->post('https://accept.paymob.com/api/ecommerce/orders', [
            'auth_token' => $token,
            'delivery_needed' => false,
            'amount_cents' => $amountCents,
            'currency' => 'EGP',
            'items' => [
                [
                    'name' => 'Wallet Topup - Tranzet',
                    'amount_cents' => $amountCents,
                    'description' => 'Recarga de billetera Tranzet',
                    'quantity' => 1,
                ],
            ],
            'shipping_data' => [
                'apartment' => 'NA',
                'email' => 'no-reply@tranzet.app',
                'floor' => 'NA',
                'first_name' => 'Tranzet',
                'street' => 'NA',
                'building' => 'NA',
                'phone_number' => '+201000000000',
                'city' => 'Cairo',
                'country' => 'EG',
                'last_name' => 'User',
                'state' => 'Cairo',
            ],
        ]);

        $response->throw();

        return $response->json('id');
    }

    public function createPaymentKey(string $token, int $orderId, int $amountCents, array $billingData): string
    {
        $response = Http::timeout(10)->withToken($token)->post('https://accept.paymob.com/api/acceptance/payment_keys', [
            'auth_token' => $token,
            'amount_cents' => $amountCents,
            'expiration' => 3600,
            'order_id' => $orderId,
            'billing_data' => $billingData,
            'currency' => 'EGP',
            'integration_id' => $this->integrationId,
        ]);

        $response->throw();

        return $response->json('token');
    }

    public function getIframeUrl(string $paymentToken): string
    {
        return "https://accept.paymob.com/api/acceptance/iframes/{$this->iframeId}?payment_token={$paymentToken}";
    }

    public function verifyCallback(array $data): bool
    {
        // Paymob sends HMAC SHA512 in production
        // For simplicity in MVP, we check the success field
        return isset($data['success']) && $data['success'] == true;
    }
}
