<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\DriverOffer;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DriverApiTest extends TestCase
{
    use DatabaseMigrations;

    private const PASSWORD = 'secret123';

    protected function setUp(): void
    {
        parent::setUp();
        $this->app['env'] = 'local';
    }

    private function createDriver(array $overrides = []): Driver
    {
        return Driver::create(array_merge([
            'name' => 'Driver One',
            'phone' => '966511122250',
            'password' => self::PASSWORD,
            'vehicle_plate' => 'PLT300',
            'vehicle_type' => 'van',
            'vehicle_model' => 'Toyota',
            'vehicle_year' => '2020',
            'status' => 'available',
            'approval_status' => 'approved',
            'rating_avg' => 5.0,
            'total_trips' => 0,
        ], $overrides));
    }

    private function createUser(string $phone = '966511122240'): User
    {
        return User::create([
            'name' => 'Customer One',
            'phone' => $phone,
            'password' => bcrypt('password123'),
        ]);
    }

    private function loginAs(Driver $driver): string
    {
        $res = $this->postJson('/api/v1/driver/login', [
            'phone' => $driver->phone,
            'password' => self::PASSWORD,
        ]);

        $res->assertOk();

        return $res->json('token');
    }

    // ── Auth ───────────────────────────────────────────────────

    public function test_driver_login_returns_token_and_driver(): void
    {
        $driver = $this->createDriver();

        $res = $this->postJson('/api/v1/driver/login', [
            'phone' => $driver->phone,
            'password' => self::PASSWORD,
        ]);

        $res->assertOk()
            ->assertJsonStructure(['message', 'token', 'driver'])
            ->assertJsonPath('driver.phone', $driver->phone);
    }

    public function test_driver_login_wrong_password_fails(): void
    {
        $this->createDriver();

        $res = $this->postJson('/api/v1/driver/login', [
            'phone' => '966511122250',
            'password' => 'wrong-password',
        ]);

        $res->assertStatus(422);
    }

    public function test_driver_login_without_password_fails(): void
    {
        $this->createDriver(['password' => null]);

        $res = $this->postJson('/api/v1/driver/login', [
            'phone' => '966511122250',
            'password' => self::PASSWORD,
        ]);

        $res->assertStatus(422);
    }

    public function test_driver_me_requires_valid_token(): void
    {
        $this->getJson('/api/v1/driver/me')->assertStatus(401);
    }

    public function test_driver_me_returns_profile(): void
    {
        $driver = $this->createDriver();
        $token = $this->loginAs($driver);

        $this->withToken($token)
            ->getJson('/api/v1/driver/me')
            ->assertOk()
            ->assertJsonPath('driver.id', $driver->id)
            ->assertJsonMissing(['password']);
    }

    public function test_driver_logout_revokes_token(): void
    {
        $driver = $this->createDriver();
        $token = $this->loginAs($driver);

        $this->withToken($token)
            ->postJson('/api/v1/driver/logout')
            ->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);

        // Guard users are memoized per test app instance; reset to simulate
        // a new request (a deleted token must no longer authenticate).
        $this->app->make('auth')->forgetGuards();

        $this->withToken($token)
            ->getJson('/api/v1/driver/me')
            ->assertStatus(401);
    }

    // ── Profile ────────────────────────────────────────────────

    public function test_driver_can_update_profile_status_and_location(): void
    {
        $driver = $this->createDriver();
        $token = $this->loginAs($driver);

        $res = $this->withToken($token)->putJson('/api/v1/driver/profile', [
            'status' => 'offline',
            'lat' => 30.0444,
            'lng' => 31.2357,
            'vehicle_model' => 'Kia Picanto',
        ]);

        $res->assertOk()
            ->assertJsonPath('driver.status', 'offline')
            ->assertJsonPath('driver.vehicle_model', 'Kia Picanto');

        $driver->refresh();
        $this->assertSame('offline', $driver->status);
        $this->assertEquals(30.0444, $driver->lat);
        $this->assertEquals(31.2357, $driver->lng);
    }

    public function test_driver_profile_rejects_invalid_status(): void
    {
        $driver = $this->createDriver();
        $token = $this->loginAs($driver);

        $this->withToken($token)
            ->putJson('/api/v1/driver/profile', ['status' => 'sleeping'])
            ->assertStatus(422);
    }

    public function test_driver_profile_rejects_duplicate_phone(): void
    {
        $this->createDriver();
        $second = $this->createDriver(['phone' => '966511122251']);
        $token = $this->loginAs($second);

        $this->withToken($token)
            ->putJson('/api/v1/driver/profile', ['phone' => '966511122250'])
            ->assertStatus(422);
    }

    public function test_driver_can_update_password_then_login_with_it(): void
    {
        $driver = $this->createDriver();
        $token = $this->loginAs($driver);

        $this->withToken($token)->putJson('/api/v1/driver/password', [
            'current_password' => self::PASSWORD,
            'password' => 'newpassword456',
            'password_confirmation' => 'newpassword456',
        ])->assertOk();

        $this->postJson('/api/v1/driver/login', [
            'phone' => $driver->phone,
            'password' => 'newpassword456',
        ])->assertOk();
    }

    public function test_driver_update_password_with_wrong_current_fails(): void
    {
        $driver = $this->createDriver();
        $token = $this->loginAs($driver);

        $this->withToken($token)->putJson('/api/v1/driver/password', [
            'current_password' => 'not-the-current',
            'password' => 'newpassword456',
            'password_confirmation' => 'newpassword456',
        ])->assertStatus(422);
    }

    public function test_driver_can_update_push_token(): void
    {
        $driver = $this->createDriver();
        $token = $this->loginAs($driver);

        $this->withToken($token)->postJson('/api/v1/driver/push-token', [
            'push_token' => 'ExponentPushToken[driver-abc]',
        ])->assertOk();

        $this->assertDatabaseHas('drivers', [
            'id' => $driver->id,
            'push_token' => 'ExponentPushToken[driver-abc]',
        ]);
    }

    // ── Jobs / shipments ───────────────────────────────────────

    private function createShipment(User $user, Driver $driver, string $status, float $price = 120): Shipment
    {
        return Shipment::create([
            'user_id' => $user->id,
            'driver_id' => $driver->id,
            'tracking_code' => Shipment::generateTrackingCode(),
            'status' => $status,
            'pickup_address' => 'Pickup',
            'pickup_lat' => 30.0444,
            'pickup_lng' => 31.2357,
            'dropoff_address' => 'Dropoff',
            'dropoff_lat' => 30.1,
            'dropoff_lng' => 31.3,
            'package_type' => 'medium',
            'vehicle_type' => 'small_car',
            'payment_method' => 2,
            'price' => $price,
        ]);
    }

    public function test_available_shipments_returns_only_pending_with_distance(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $pending = $this->createShipment($user, $driver, Shipment::STATUS_PENDING);
        $this->createShipment($user, $driver, Shipment::STATUS_ASSIGNED);

        $token = $this->loginAs($driver);
        $res = $this->withToken($token)->getJson('/api/v1/driver/available-shipments');

        $res->assertOk()->assertJsonCount(1, 'shipments');
        $res->assertJsonPath('shipments.0.tracking_code', $pending->tracking_code);
        $res->assertJsonStructure(['shipments' => [[
            'tracking_code', 'status', 'estimate_fare', 'driver_has_offer',
            'pickup_lat', 'pickup_lng', 'dropoff_lat', 'dropoff_lng', 'distance_from_driver_km',
        ]]]);
    }

    public function test_driver_can_make_offer_on_pending_shipment(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $shipment = $this->createShipment($user, $driver, Shipment::STATUS_PENDING);

        $token = $this->loginAs($driver);
        $res = $this->withToken($token)->postJson("/api/v1/driver/shipments/{$shipment->tracking_code}/offers", [
            'amount' => 185,
        ]);

        $res->assertStatus(201)->assertJsonPath('offer.status', DriverOffer::STATUS_PENDING);
        $this->assertDatabaseHas('driver_offers', [
            'shipment_id' => $shipment->id,
            'driver_id' => $driver->id,
            'amount' => 185,
            'status' => DriverOffer::STATUS_PENDING,
        ]);
    }

    public function test_driver_duplicate_pending_offer_rejected(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $shipment = $this->createShipment($user, $driver, Shipment::STATUS_PENDING);

        DriverOffer::create([
            'shipment_id' => $shipment->id,
            'driver_id' => $driver->id,
            'amount' => 185,
            'status' => DriverOffer::STATUS_PENDING,
        ]);

        $token = $this->loginAs($driver);
        $this->withToken($token)->postJson("/api/v1/driver/shipments/{$shipment->tracking_code}/offers", [
            'amount' => 200,
        ])->assertStatus(422);
    }

    public function test_driver_cannot_offer_on_assigned_shipment(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $shipment = $this->createShipment($user, $driver, Shipment::STATUS_ASSIGNED);

        $token = $this->loginAs($driver);
        $this->withToken($token)->postJson("/api/v1/driver/shipments/{$shipment->tracking_code}/offers", [
            'amount' => 185,
        ])->assertStatus(422);
    }

    public function test_jobs_lists_assigned_shipments_with_customer(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $shipment = $this->createShipment($user, $driver, Shipment::STATUS_IN_TRANSIT);

        $token = $this->loginAs($driver);
        $res = $this->withToken($token)->getJson('/api/v1/driver/jobs');

        $res->assertOk()->assertJsonCount(1, 'jobs');
        $res->assertJsonPath('jobs.0.tracking_code', $shipment->tracking_code);
        $res->assertJsonPath('jobs.0.user.name', 'Customer One');
    }

    public function test_earnings_aggregate_delivered_shipments(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver(['total_trips' => 5]);
        $this->createShipment($user, $driver, Shipment::STATUS_DELIVERED, 120);
        $this->createShipment($user, $driver, Shipment::STATUS_DELIVERED, 80.5);
        $this->createShipment($user, $driver, Shipment::STATUS_ASSIGNED, 60);

        $token = $this->loginAs($driver);
        $res = $this->withToken($token)->getJson('/api/v1/driver/earnings');

        $res->assertOk()
            ->assertJsonPath('total_trips', 5)
            ->assertJsonPath('completed_deliveries', 2)
            ->assertJsonPath('earned', 200.5)
            ->assertJsonPath('active_jobs', 1);
    }

    // ── Role isolation ─────────────────────────────────────────

    public function test_user_token_cannot_access_driver_endpoints(): void
    {
        $user = $this->createUser();
        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/v1/driver/me')->assertStatus(403);
        $this->getJson('/api/v1/driver/jobs')->assertStatus(403);
    }

    public function test_driver_token_cannot_access_user_endpoints(): void
    {
        $driver = $this->createDriver();
        $token = $this->loginAs($driver);

        $this->withToken($token)->getJson('/api/v1/me')->assertStatus(403);
        $this->withToken($token)->getJson('/api/v1/shipments')->assertStatus(403);
    }

    // ── Registration ───────────────────────────────────────────

    public function test_register_with_password_creates_loggable_driver(): void
    {
        Storage::fake('public');

        $res = $this->post('/api/v1/driver/register', [
            'name' => 'New Driver',
            'phone' => '966511122299',
            'national_id' => '29901234567890',
            'vehicle_type' => 'van',
            'vehicle_model' => 'Kia',
            'vehicle_year' => '2022',
            'vehicle_plate' => 'NVY22',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'license' => UploadedFile::fake()->image('license.jpg'),
            'national_id_doc' => UploadedFile::fake()->image('id.jpg'),
        ]);

        $res->assertStatus(201);
        $this->assertDatabaseHas('drivers', ['phone' => '966511122299', 'approval_status' => 'pending']);

        $this->postJson('/api/v1/driver/login', [
            'phone' => '966511122299',
            'password' => 'password123',
        ])->assertOk();
    }
}