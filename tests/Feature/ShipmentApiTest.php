<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\DriverOffer;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ShipmentApiTest extends TestCase
{
    use DatabaseMigrations;

    protected function setUp(): void
    {
        parent::setUp();
        Http::fake(['exp.host/*' => Http::response(['data' => [['status' => 'ok']]])]);
        $this->app['env'] = 'local';
    }

    private function createUser(string $phone = '966511122501'): User
    {
        return User::create([
            'name' => 'Shipment User',
            'phone' => $phone,
            'password' => bcrypt('password123'),
        ]);
    }

    private function createDriver(string $phone = '966511122502'): Driver
    {
        return Driver::create([
            'name' => 'Shipment Driver',
            'phone' => $phone,
            'vehicle_plate' => 'PLT501',
            'vehicle_type' => 'small_car',
            'status' => 'available',
            'approval_status' => 'approved',
            'rating_avg' => 5.0,
            'total_trips' => 0,
        ]);
    }

    private function createShipment(
        User $user,
        int $paymentMethod = 2,
        string $status = Shipment::STATUS_PENDING,
        ?Driver $driver = null
    ): Shipment {
        return Shipment::create([
            'user_id' => $user->id,
            'driver_id' => $driver?->id,
            'tracking_code' => Shipment::generateTrackingCode(),
            'status' => $status,
            'pickup_address' => 'Pickup St',
            'pickup_lat' => 30.0444,
            'pickup_lng' => 31.2357,
            'dropoff_address' => 'Dropoff St',
            'dropoff_lat' => 30.1,
            'dropoff_lng' => 31.3,
            'package_type' => 'small',
            'vehicle_type' => 'small_car',
            'payment_method' => $paymentMethod,
            'price' => 0,
        ]);
    }

    private function makeOffer(Shipment $shipment, Driver $driver, float $amount = 150): DriverOffer
    {
        return DriverOffer::create([
            'shipment_id' => $shipment->id,
            'driver_id' => $driver->id,
            'amount' => $amount,
            'status' => DriverOffer::STATUS_PENDING,
        ]);
    }

    private const STORE_PAYLOAD = [
        'pickup_address' => 'Pickup St',
        'pickup_lat' => 30.0444,
        'pickup_lng' => 31.2357,
        'dropoff_address' => 'Dropoff St',
        'dropoff_lat' => 30.1,
        'dropoff_lng' => 31.3,
        'package_type' => 'small',
        'vehicle_type' => 'small_car',
        'payment_method' => 2,
    ];

    // ── Store (create) ─────────────────────────────────────────

    public function test_store_creates_pending_shipment(): void
    {
        $user = $this->createUser();
        $this->actingAs($user, 'sanctum');

        $res = $this->postJson('/api/v1/shipments', self::STORE_PAYLOAD);

        $res->assertStatus(201)
            ->assertJsonPath('shipment.status', Shipment::STATUS_PENDING)
            ->assertJsonStructure(['shipment' => ['tracking_code', 'price', 'distance_km'], 'estimated_price', 'distance_km']);

        $code = $res->json('shipment.tracking_code');
        $this->assertMatchesRegularExpression('/^TZ\d{6}$/', $code);

        $this->assertDatabaseHas('shipments', [
            'tracking_code' => $code,
            'status' => Shipment::STATUS_PENDING,
            'user_id' => $user->id,
        ]);
        $this->assertDatabaseHas('shipment_statuses', [
            'shipment_id' => $res->json('shipment.id'),
            'status' => Shipment::STATUS_PENDING,
        ]);
    }

    public function test_store_computes_distance_and_estimated_price(): void
    {
        $user = $this->createUser();
        $this->actingAs($user, 'sanctum');

        $res = $this->postJson('/api/v1/shipments', self::STORE_PAYLOAD);

        $distance = Shipment::distanceBetween(30.0444, 31.2357, 30.1, 31.3);
        $res->assertStatus(201)
            ->assertJsonPath('distance_km', round($distance, 2));

        $this->assertEqualsWithDelta(
            Shipment::estimateFareFrom('small_car', $distance),
            $res->json('estimated_price'),
            0.01,
        );
    }

    public function test_store_requires_addresses_and_payment_method(): void
    {
        $this->actingAs($this->createUser(), 'sanctum');

        $this->postJson('/api/v1/shipments', [])->assertStatus(422);
        $this->postJson('/api/v1/shipments', [
            ...self::STORE_PAYLOAD,
            'payment_method' => 9,
        ])->assertStatus(422);
    }

    public function test_mobile_wallet_requires_provider_and_number(): void
    {
        $this->actingAs($this->createUser(), 'sanctum');

        $this->postJson('/api/v1/shipments', [
            ...self::STORE_PAYLOAD,
            'payment_method' => 4,
        ])->assertStatus(422);

        $res = $this->postJson('/api/v1/shipments', [
            ...self::STORE_PAYLOAD,
            'payment_method' => 4,
            'mobile_wallet_provider' => 'vodafone_cash',
            'mobile_wallet_number' => '01000000000',
        ]);

        $res->assertStatus(201)->assertJsonPath('shipment.mobile_wallet_status', 'pending');
    }

    public function test_mobile_wallet_fields_ignored_for_other_methods(): void
    {
        $this->actingAs($this->createUser(), 'sanctum');

        $res = $this->postJson('/api/v1/shipments', [
            ...self::STORE_PAYLOAD,
            'payment_method' => 2,
            'mobile_wallet_provider' => 'vodafone_cash',
            'mobile_wallet_number' => '01000000000',
        ]);

        $res->assertStatus(201);
        $this->assertNull($res->json('shipment.mobile_wallet_provider'));
        $this->assertNull($res->json('shipment.mobile_wallet_number'));
    }

    // ── Index / show / ownership ───────────────────────────────

    public function test_index_returns_only_own_shipments(): void
    {
        $user = $this->createUser();
        $other = $this->createUser('966511122503');
        $mine = $this->createShipment($user);
        $this->createShipment($other);

        $res = $this->actingAs($user, 'sanctum')->getJson('/api/v1/shipments');

        $res->assertOk()->assertJsonCount(1, 'shipments');
        $res->assertJsonPath('shipments.0.tracking_code', $mine->tracking_code);
    }

    public function test_show_returns_shipment_with_markers(): void
    {
        $user = $this->createUser();
        $shipment = $this->createShipment($user);

        $res = $this->actingAs($user, 'sanctum')->getJson('/api/v1/shipments/' . $shipment->tracking_code);

        $res->assertOk()
            ->assertJsonPath('shipment.tracking_code', $shipment->tracking_code)
            ->assertJsonPath('shipment.estimated_price', round($shipment->estimateFare(), 2))
            ->assertJsonStructure(['shipment' => ['pickup_lat', 'pickup_lng', 'statuses']]);
    }

    public function test_show_404_for_other_users_shipment(): void
    {
        $owner = $this->createUser();
        $stranger = $this->createUser('966511122504');
        $shipment = $this->createShipment($owner);

        $this->actingAs($stranger, 'sanctum')
            ->getJson('/api/v1/shipments/' . $shipment->tracking_code)
            ->assertStatus(404);
    }

    // ── Estimates ──────────────────────────────────────────────

    public function test_estimate_returns_fare_breakdown(): void
    {
        $user = $this->createUser();
        $shipment = $this->createShipment($user);

        $res = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/shipments/' . $shipment->tracking_code . '/estimate');

        $res->assertOk()
            ->assertJsonPath('estimated_price', round($shipment->estimateFare(), 2))
            ->assertJsonStructure(['package_base', 'per_km', 'per_km_long', 'long_distance_km', 'rates'])
            ->assertJsonPath('shipment.tracking_code', $shipment->tracking_code);
    }

    public function test_estimate_404_for_other_users_shipment(): void
    {
        $owner = $this->createUser();
        $stranger = $this->createUser('966511122505');
        $shipment = $this->createShipment($owner);

        $this->actingAs($stranger, 'sanctum')
            ->getJson('/api/v1/shipments/' . $shipment->tracking_code . '/estimate')
            ->assertStatus(404);
    }

    public function test_estimate_live_computes_distance_and_price(): void
    {
        $this->actingAs($this->createUser(), 'sanctum');

        $res = $this->postJson('/api/v1/fare/estimate', [
            'pickup_lat' => 30.0444,
            'pickup_lng' => 31.2357,
            'dropoff_lat' => 30.1,
            'dropoff_lng' => 31.3,
            'vehicle_type' => 'small_car',
        ]);

        $distance = Shipment::distanceBetween(30.0444, 31.2357, 30.1, 31.3);

        $res->assertOk()
            ->assertJsonPath('distance_km', round($distance, 2))
            ->assertJsonPath('estimated_price', Shipment::estimateFareFrom('small_car', $distance))
            ->assertJsonPath('package_base', 30);
    }

    public function test_estimate_live_validates_vehicle_type(): void
    {
        $this->actingAs($this->createUser(), 'sanctum');

        $this->postJson('/api/v1/fare/estimate', [
            'pickup_lat' => 30.0444,
            'pickup_lng' => 31.2357,
            'dropoff_lat' => 30.1,
            'dropoff_lng' => 31.3,
            'vehicle_type' => 'rocket',
        ])->assertStatus(422);
    }

    // ── Offers (simulate / accept / decline) ───────────────────

    public function test_simulate_offer_creates_offer_and_marks_driver_busy(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $shipment = $this->createShipment($user);

        $res = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shipments/' . $shipment->tracking_code . '/offers/simulate');

        $res->assertOk()
            ->assertJsonPath('offer.status', DriverOffer::STATUS_PENDING)
            ->assertJsonPath('offer.driver.id', $driver->id);

        $this->assertDatabaseHas('driver_offers', [
            'shipment_id' => $shipment->id,
            'driver_id' => $driver->id,
            'status' => DriverOffer::STATUS_PENDING,
        ]);

        $driver->refresh();
        $this->assertSame('busy', $driver->status);
    }

    public function test_simulate_offer_rejects_non_pending_shipment(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $shipment = $this->createShipment($user, 2, Shipment::STATUS_ASSIGNED, $driver);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shipments/' . $shipment->tracking_code . '/offers/simulate')
            ->assertStatus(422);
    }

    public function test_accept_offer_assigns_driver_and_sets_price(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $shipment = $this->createShipment($user);
        $offer = $this->makeOffer($shipment, $driver, 150);

        $res = $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/shipments/{$shipment->tracking_code}/offers/{$offer->id}/accept");

        $res->assertOk()->assertJsonPath('shipment.status', Shipment::STATUS_ASSIGNED);

        $shipment->refresh();
        $this->assertSame($driver->id, $shipment->driver_id);
        $this->assertSame(150.0, (float) $shipment->price);
        $this->assertSame(Shipment::PAYMENT_PENDING, $shipment->payment_status);

        $offer->refresh();
        $this->assertSame(DriverOffer::STATUS_ACCEPTED, $offer->status);
        $driver->refresh();
        $this->assertSame('busy', $driver->status);

        $this->assertDatabaseHas('shipment_statuses', [
            'shipment_id' => $shipment->id,
            'status' => Shipment::STATUS_ASSIGNED,
        ]);
    }

    public function test_accept_offer_declines_sibling_offers(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $driverB = $this->createDriver('966511122506');
        $shipment = $this->createShipment($user);
        $offer = $this->makeOffer($shipment, $driver, 150);
        $sibling = $this->makeOffer($shipment, $driverB, 200);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/shipments/{$shipment->tracking_code}/offers/{$offer->id}/accept")
            ->assertOk();

        $sibling->refresh();
        $this->assertSame(DriverOffer::STATUS_DECLINED, $sibling->status);
    }

    public function test_accept_stale_offer_fails(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $shipment = $this->createShipment($user);
        $offer = $this->makeOffer($shipment, $driver, 150);
        $offer->update(['status' => DriverOffer::STATUS_DECLINED]);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/shipments/{$shipment->tracking_code}/offers/{$offer->id}/accept")
            ->assertStatus(422);
    }

    public function test_accept_offer_only_owner(): void
    {
        $owner = $this->createUser();
        $stranger = $this->createUser('966511122507');
        $driver = $this->createDriver();
        $shipment = $this->createShipment($owner);
        $offer = $this->makeOffer($shipment, $driver, 150);

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/v1/shipments/{$shipment->tracking_code}/offers/{$offer->id}/accept")
            ->assertStatus(404);
    }

    public function test_decline_offer_frees_driver_and_keeps_shipment_pending(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $driver->update(['status' => 'busy']);
        $shipment = $this->createShipment($user);
        $offer = $this->makeOffer($shipment, $driver, 150);

        $res = $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/shipments/{$shipment->tracking_code}/offers/{$offer->id}/decline");

        $res->assertOk()->assertJsonPath('shipment.status', Shipment::STATUS_PENDING);

        $offer->refresh();
        $this->assertSame(DriverOffer::STATUS_DECLINED, $offer->status);
        $driver->refresh();
        $this->assertSame('available', $driver->status);
    }

    // ── Cancel ─────────────────────────────────────────────────

    public function test_cancel_pending_shipment(): void
    {
        $user = $this->createUser();
        $shipment = $this->createShipment($user);

        $res = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shipments/' . $shipment->tracking_code . '/cancel');

        $res->assertOk()->assertJsonPath('shipment.status', Shipment::STATUS_CANCELED);

        $this->assertDatabaseHas('shipment_statuses', [
            'shipment_id' => $shipment->id,
            'status' => Shipment::STATUS_CANCELED,
        ]);
    }

    public function test_cancel_in_transit_forbidden(): void
    {
        $user = $this->createUser();
        $shipment = $this->createShipment($user, 2, Shipment::STATUS_IN_TRANSIT);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shipments/' . $shipment->tracking_code . '/cancel')
            ->assertStatus(422);
    }

    // ── Delivery confirmation ──────────────────────────────────

    public function test_confirm_delivery_completes_cash_shipment(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $shipment = $this->createShipment($user, 2, Shipment::STATUS_IN_TRANSIT, $driver);

        $res = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shipments/' . $shipment->tracking_code . '/confirm-delivery');

        $res->assertOk()->assertJsonPath('shipment.status', Shipment::STATUS_DELIVERED);

        $shipment->refresh();
        $this->assertNotNull($shipment->delivered_at);
        $this->assertSame(Shipment::PAYMENT_PAID, $shipment->payment_status);

        $driver->refresh();
        $this->assertSame('available', $driver->status);
        $this->assertSame(1, (int) $driver->total_trips);
    }

    public function test_confirm_delivery_requires_in_transit(): void
    {
        $user = $this->createUser();
        $shipment = $this->createShipment($user, 2, Shipment::STATUS_ASSIGNED);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shipments/' . $shipment->tracking_code . '/confirm-delivery')
            ->assertStatus(422);
    }

    public function test_confirm_delivery_stores_proof_photo(): void
    {
        Storage::fake('public');

        $user = $this->createUser();
        $driver = $this->createDriver();
        $shipment = $this->createShipment($user, 2, Shipment::STATUS_IN_TRANSIT, $driver);

        $this->actingAs($user, 'sanctum')
            ->post('/api/v1/shipments/' . $shipment->tracking_code . '/confirm-delivery', [
                'proof_photo' => UploadedFile::fake()->image('proof.jpg'),
            ])
            ->assertOk();

        $shipment->refresh();
        $this->assertNotNull($shipment->proof_photo_path);
        Storage::disk('public')->assertExists($shipment->proof_photo_path);

        $show = $this->getJson('/api/v1/shipments/' . $shipment->tracking_code);
        $show->assertOk()->assertJsonPath('shipment.status', Shipment::STATUS_DELIVERED);
        $this->assertStringContainsString('/storage/proofs/', (string) $show->json('shipment.proof_photo_url'));
    }

    // ── Mobile wallet + online payment confirmation ────────────

    public function test_confirm_mobile_wallet_marks_paid(): void
    {
        $user = $this->createUser();
        $shipment = $this->createShipment($user, 4);
        $shipment->update([
            'mobile_wallet_provider' => 'vodafone_cash',
            'mobile_wallet_number' => '01000000000',
        ]);

        $res = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shipments/' . $shipment->tracking_code . '/mobile-wallet/confirm', ['paid' => true]);

        $res->assertOk()->assertJsonPath('shipment.mobile_wallet_status', 'paid');

        $shipment->refresh();
        $this->assertSame(Shipment::PAYMENT_PAID, $shipment->payment_status);
        $this->assertNotNull($shipment->paid_at);
        $this->assertDatabaseHas('shipment_statuses', [
            'shipment_id' => $shipment->id,
            'status' => $shipment->status,
        ]);
    }

    public function test_confirm_mobile_wallet_wrong_method_rejected(): void
    {
        $user = $this->createUser();
        $shipment = $this->createShipment($user, 2);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shipments/' . $shipment->tracking_code . '/mobile-wallet/confirm')
            ->assertStatus(422);
    }

    public function test_confirm_online_payment_marks_paid(): void
    {
        $user = $this->createUser();
        $shipment = $this->createShipment($user, 1);

        $res = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shipments/' . $shipment->tracking_code . '/online/confirm', ['paid' => true]);

        $res->assertOk()->assertJsonPath('shipment.payment_status', Shipment::PAYMENT_PAID);

        $shipment->refresh();
        $this->assertNotNull($shipment->paid_at);
    }

    public function test_confirm_online_payment_wrong_method_rejected(): void
    {
        $user = $this->createUser();
        $shipment = $this->createShipment($user, 2);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shipments/' . $shipment->tracking_code . '/online/confirm')
            ->assertStatus(422);
    }

    // ── Advance (dev) ──────────────────────────────────────────

    public function test_advance_assigns_available_driver_when_none(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $shipment = $this->createShipment($user);

        $res = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shipments/' . $shipment->tracking_code . '/advance');

        $res->assertOk()->assertJsonPath('shipment.status', Shipment::STATUS_ASSIGNED);
        $res->assertJsonPath('shipment.driver.id', $driver->id);
    }

    public function test_full_lifecycle_flow_to_delivery(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $this->actingAs($user, 'sanctum');

        $store = $this->postJson('/api/v1/shipments', self::STORE_PAYLOAD)->assertStatus(201);
        $code = $store->json('shipment.tracking_code');

        $this->postJson("/api/v1/shipments/{$code}/offers/simulate")->assertOk();

        $offer = DriverOffer::where('driver_id', $driver->id)->firstOrFail();
        $this->postJson("/api/v1/shipments/{$code}/offers/{$offer->id}/accept")->assertOk();

        $this->postJson("/api/v1/shipments/{$code}/advance")->assertJsonPath('shipment.status', 'picked_up');
        $this->postJson("/api/v1/shipments/{$code}/advance")->assertJsonPath('shipment.status', 'in_transit');
        $this->postJson("/api/v1/shipments/{$code}/confirm-delivery")->assertOk();

        $this->assertDatabaseHas('shipments', [
            'tracking_code' => $code,
            'status' => Shipment::STATUS_DELIVERED,
            'payment_status' => Shipment::PAYMENT_PAID,
        ]);
        $this->assertSame(1, (int) Driver::find($driver->id)->total_trips);
        $this->assertSame('available', Driver::find($driver->id)->status);
    }

    public function test_foreign_user_cannot_act_on_shipment(): void
    {
        $owner = $this->createUser();
        $stranger = $this->createUser('966511122508');
        $shipment = $this->createShipment($owner);

        $this->actingAs($stranger, 'sanctum')
            ->postJson('/api/v1/shipments/' . $shipment->tracking_code . '/cancel')
            ->assertStatus(404);

        $this->actingAs($stranger, 'sanctum')
            ->postJson('/api/v1/shipments/' . $shipment->tracking_code . '/confirm-delivery')
            ->assertStatus(404);
    }

    public function test_driver_location_update_is_scoped_to_shipment(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $shipment = $this->createShipment($user, 2, Shipment::STATUS_ASSIGNED, $driver);

        $res = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shipments/' . $shipment->tracking_code . '/driver/location', [
                'lat' => 30.05,
                'lng' => 31.25,
            ]);

        $res->assertOk();
        $driver->refresh();
        $this->assertEquals(30.05, $driver->lat);
        $this->assertEquals(31.25, $driver->lng);
    }

    public function test_driver_location_rejects_bad_coordinates(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $shipment = $this->createShipment($user, 2, Shipment::STATUS_ASSIGNED, $driver);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shipments/' . $shipment->tracking_code . '/driver/location', [
                'lat' => 'abc',
                'lng' => 31.25,
            ])
            ->assertStatus(422);
    }
}