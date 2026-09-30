<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\DriverOffer;
use App\Models\Shipment;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaymentWalletTest extends TestCase
{
    use DatabaseMigrations;

    protected function setUp(): void
    {
        parent::setUp();
        Http::fake([
            'accept.paymob.com/api/auth/tokens' => Http::response(['token' => 'test-auth-token']),
            'accept.paymob.com/api/ecommerce/orders' => Http::response(['id' => 555]),
            'accept.paymob.com/api/acceptance/payment_keys' => Http::response(['token' => 'test-payment-key']),
        ]);
        Config::set('services.paymob.api_key', 'test_api_key');
        Config::set('services.paymob.integration_id', 123);
        Config::set('services.paymob.iframe_id', 456);
    }

    private function createUser(string $phone = '966511122220'): User
    {
        return User::create([
            'name' => 'Payment User',
            'phone' => $phone,
            'password' => bcrypt('password123'),
        ]);
    }

    private function createDriver(): Driver
    {
        return Driver::create([
            'name' => 'Payment Driver',
            'phone' => '966511122221',
            'vehicle_plate' => 'PLT100',
            'status' => 'available',
            'approval_status' => 'approved',
        ]);
    }

    private function createWallet(User $user, float $balance = 0): Wallet
    {
        return Wallet::create(['user_id' => $user->id, 'balance' => $balance]);
    }

    private function createShipment(User $user, int $paymentMethod, float $price = 0, array $overrides = []): Shipment
    {
        return Shipment::create(array_merge([
            'user_id' => $user->id,
            'tracking_code' => Shipment::generateTrackingCode(),
            'status' => Shipment::STATUS_PENDING,
            'pickup_address' => 'Pickup',
            'pickup_lat' => 30.0444,
            'pickup_lng' => 31.2357,
            'dropoff_address' => 'Dropoff',
            'dropoff_lat' => 30.1,
            'dropoff_lng' => 31.3,
            'package_type' => 'medium',
            'vehicle_type' => 'small_car',
            'payment_method' => $paymentMethod,
            'price' => $price,
        ], $overrides));
    }

    private function attachOffer(Shipment $shipment, Driver $driver, float $amount): DriverOffer
    {
        return DriverOffer::create([
            'shipment_id' => $shipment->id,
            'driver_id' => $driver->id,
            'amount' => $amount,
            'status' => DriverOffer::STATUS_PENDING,
        ]);
    }

    // ── Wallet balance + history ────────────────────────────────

    public function test_wallet_topup_and_history(): void
    {
        $user = $this->createUser();
        $this->actingAs($user, 'sanctum');

        $res = $this->postJson('/api/v1/wallet/topup', ['amount' => 100]);
        $res->assertOk()->assertJsonPath('balance', '100.00');

        $history = $this->getJson('/api/v1/wallet');
        $history->assertOk()->assertJsonPath('balance', '100.00');
        $this->assertCount(1, $history->json('transactions'));
        $this->assertSame('topup', $history->json('transactions.0.type'));
    }

    public function test_wallet_history_is_paginated_and_excludes_pending_markers(): void
    {
        $user = $this->createUser();
        $wallet = $this->createWallet($user, 500);
        $this->actingAs($user, 'sanctum');

        foreach ([100, 150, 200, 250, 300, 350] as $i => $amount) {
            WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'type' => 'refund',
                'amount' => $amount,
                'description' => 'refund '.$i,
            ]);
        }

        WalletTransaction::create([
            'wallet_id' => $wallet->id,
            'type' => 'payment',
            'amount' => 300,
            'description' => 'paymob_shipment_pending',
        ]);

        $page1 = $this->getJson('/api/v1/wallet?per_page=5&page=1');
        $page1->assertOk();
        $this->assertCount(5, $page1->json('transactions'));
        $this->assertTrue($page1->json('has_more'));
        foreach ($page1->json('transactions') as $tx) {
            $this->assertNotSame('paymob_shipment_pending', $tx['description']);
        }

        $page2 = $this->getJson('/api/v1/wallet?per_page=5&page=2');
        $page2->assertOk();
        $this->assertCount(1, $page2->json('transactions'));
        $this->assertFalse($page2->json('has_more'));
    }

    // ── Wallet debits / refunds on shipments ────────────────────

    public function test_accept_offer_deducts_wallet_and_records_payment(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $wallet = $this->createWallet($user, 200);
        $shipment = $this->createShipment($user, 3);
        $offer = $this->attachOffer($shipment, $driver, 100);
        $this->actingAs($user, 'sanctum');

        $res = $this->postJson("/api/v1/shipments/{$shipment->tracking_code}/offers/{$offer->id}/accept");

        $res->assertOk()->assertJsonPath('shipment.status', Shipment::STATUS_ASSIGNED);
        $this->assertSame(100.0, (float) $wallet->fresh()->balance);

        $tx = WalletTransaction::where('wallet_id', $wallet->id)->where('type', 'payment')->first();
        $this->assertNotNull($tx);
        $this->assertSame($shipment->tracking_code, $tx->reference);
        $this->assertSame(100.0, (float) $tx->amount);
    }

    public function test_accept_offer_fails_when_wallet_balance_insufficient(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $wallet = $this->createWallet($user, 50);
        $shipment = $this->createShipment($user, 3);
        $offer = $this->attachOffer($shipment, $driver, 100);
        $this->actingAs($user, 'sanctum');

        $res = $this->postJson("/api/v1/shipments/{$shipment->tracking_code}/offers/{$offer->id}/accept");

        $res->assertStatus(422);
        $this->assertSame(50.0, (float) $wallet->fresh()->balance);
        $this->assertSame(Shipment::STATUS_PENDING, $shipment->fresh()->status);
        $this->assertDatabaseMissing('wallet_transactions', ['type' => 'payment', 'wallet_id' => $wallet->id]);
    }

    public function test_cancel_after_wallet_payment_refunds_balance(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $wallet = $this->createWallet($user, 200);
        $shipment = $this->createShipment($user, 3);
        $offer = $this->attachOffer($shipment, $driver, 100);
        $this->actingAs($user, 'sanctum');

        $this->postJson("/api/v1/shipments/{$shipment->tracking_code}/offers/{$offer->id}/accept");
        $this->assertSame(100.0, (float) $wallet->fresh()->balance);

        $res = $this->postJson("/api/v1/shipments/{$shipment->tracking_code}/cancel");
        $res->assertOk()->assertJsonPath('shipment.status', Shipment::STATUS_CANCELED);

        $this->assertSame(200.0, (float) $wallet->fresh()->balance);
        $refund = WalletTransaction::where('wallet_id', $wallet->id)->where('type', 'refund')->first();
        $this->assertNotNull($refund);
        $this->assertSame($shipment->tracking_code, $refund->reference);
    }

    // ── Paymob shipment payment (online method) ─────────────────

    public function test_paymob_shipment_payment_flow(): void
    {
        $user = $this->createUser();
        $shipment = $this->createShipment($user, 1, 120, ['status' => Shipment::STATUS_ASSIGNED]);
        $this->actingAs($user, 'sanctum');

        $init = $this->postJson("/api/v1/payment/shipments/{$shipment->tracking_code}/initiate");
        $init->assertOk()
            ->assertJsonPath('order_id', 555)
            ->assertJsonPath('amount', 120);
        $this->assertStringContainsString('accept.paymob.com/api/acceptance/iframes/456', $init->json('iframe_url'));

        $confirm = $this->postJson("/api/v1/payment/shipments/{$shipment->tracking_code}/confirm", [
            'amount' => 120,
            'order_id' => 555,
        ]);

        $confirm->assertOk()->assertJsonPath('shipment.payment_status', Shipment::PAYMENT_PAID);
        $this->assertDatabaseHas('wallet_transactions', [
            'reference' => 'paymob_shipment_555',
            'description' => 'دفع شحنة ' . $shipment->tracking_code . ' أونلاين',
        ]);
    }

    public function test_paymob_shipment_confirm_rejects_mismatched_amount(): void
    {
        $user = $this->createUser();
        $shipment = $this->createShipment($user, 1, 120, ['status' => Shipment::STATUS_ASSIGNED]);
        $this->actingAs($user, 'sanctum');

        $this->postJson("/api/v1/payment/shipments/{$shipment->tracking_code}/initiate");
        $confirm = $this->postJson("/api/v1/payment/shipments/{$shipment->tracking_code}/confirm", [
            'amount' => 50,
            'order_id' => 555,
        ]);

        $confirm->assertStatus(422);
        $this->assertSame(Shipment::PAYMENT_PENDING, $shipment->fresh()->payment_status);
    }

    // ── Paymob wallet topup ─────────────────────────────────────

    public function test_paymob_topup_credits_wallet_after_confirm(): void
    {
        $user = $this->createUser();
        $this->actingAs($user, 'sanctum');

        $init = $this->postJson('/api/v1/payment/initiate', ['amount' => 100]);
        $init->assertOk()
            ->assertJsonPath('order_id', 555)
            ->assertJsonPath('amount', 100);

        $confirm = $this->postJson('/api/v1/payment/confirm', ['amount' => 100, 'order_id' => 555]);
        $confirm->assertOk()->assertJsonPath('balance', '100.00');

        $wallet = Wallet::where('user_id', $user->id)->first();
        $this->assertSame(100.0, (float) $wallet->balance);
    }
}