<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\Rating;
use App\Models\Shipment;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RatingTest extends TestCase
{
    use DatabaseMigrations;

    protected function setUp(): void
    {
        parent::setUp();
        Http::fake(['exp.host/*' => Http::response(['data' => [['status' => 'ok']]])]);
        $this->app['env'] = 'local';
    }

    private function createUser(string $phone = '966511122240'): User
    {
        return User::create([
            'name' => 'Rating User',
            'phone' => $phone,
            'password' => bcrypt('password123'),
        ]);
    }

    private function createDriver(): Driver
    {
        return Driver::create([
            'name' => 'Rating Driver',
            'phone' => '966511122241',
            'vehicle_plate' => 'PLT400',
            'status' => 'available',
            'approval_status' => 'approved',
            'rating_avg' => 5.0,
            'total_trips' => 0,
        ]);
    }

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

    public function test_rate_delivered_shipment_updates_rating_and_driver_avg(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $shipment = $this->createShipment($user, $driver, Shipment::STATUS_DELIVERED);
        $this->actingAs($user, 'sanctum');

        $res = $this->postJson("/api/v1/shipments/{$shipment->tracking_code}/rate", [
            'stars' => 4,
            'comment' => 'ممتاز',
        ]);

        $res->assertOk()->assertJsonPath('rating.stars', 4);
        $this->assertDatabaseHas('ratings', ['shipment_id' => $shipment->id, 'stars' => 4]);
        $this->assertSame(4.0, (float) $driver->fresh()->rating_avg);
    }

    public function test_re_rating_same_shipment_updates_instead_of_duplicating(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $shipment = $this->createShipment($user, $driver, Shipment::STATUS_DELIVERED);
        $this->actingAs($user, 'sanctum');

        $this->postJson("/api/v1/shipments/{$shipment->tracking_code}/rate", ['stars' => 5]);
        $this->postJson("/api/v1/shipments/{$shipment->tracking_code}/rate", ['stars' => 2]);

        $this->assertDatabaseCount('ratings', 1);
        $this->assertDatabaseHas('ratings', ['shipment_id' => $shipment->id, 'stars' => 2]);
        $this->assertSame(2.0, (float) $driver->fresh()->rating_avg);
    }

    public function test_cannot_rate_non_delivered_shipment(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $shipment = $this->createShipment($user, $driver, Shipment::STATUS_IN_TRANSIT);
        $this->actingAs($user, 'sanctum');

        $this->postJson("/api/v1/shipments/{$shipment->tracking_code}/rate", ['stars' => 5])
            ->assertStatus(422);

        $this->assertDatabaseMissing('ratings', ['shipment_id' => $shipment->id]);
    }

    public function test_cannot_rate_shipment_without_driver(): void
    {
        $user = $this->createUser();
        $shipment = $this->createShipment($user, $this->createDriver(), Shipment::STATUS_DELIVERED);
        $shipment->update(['driver_id' => null]);
        $this->actingAs($user, 'sanctum');

        $this->postJson("/api/v1/shipments/{$shipment->tracking_code}/rate", ['stars' => 5])
            ->assertStatus(422)
            ->assertJsonPath('message', 'لا يوجد سائق مرتبط بهذه الشحنة.');
    }

    public function test_stars_range_is_validated(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $shipment = $this->createShipment($user, $driver, Shipment::STATUS_DELIVERED);
        $this->actingAs($user, 'sanctum');

        $this->postJson("/api/v1/shipments/{$shipment->tracking_code}/rate", ['stars' => 6])
            ->assertStatus(422);
        $this->postJson("/api/v1/shipments/{$shipment->tracking_code}/rate", ['stars' => 0])
            ->assertStatus(422);
    }

    public function test_show_includes_rating(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $shipment = $this->createShipment($user, $driver, Shipment::STATUS_DELIVERED);
        Rating::create([
            'shipment_id' => $shipment->id,
            'driver_id' => $driver->id,
            'stars' => 5,
        ]);
        $this->actingAs($user, 'sanctum');

        $res = $this->getJson("/api/v1/shipments/{$shipment->tracking_code}");
        $res->assertOk()->assertJsonPath('shipment.rating.stars', 5);
    }

    public function test_confirm_delivery_increments_driver_total_trips(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $shipment = $this->createShipment($user, $driver, Shipment::STATUS_IN_TRANSIT);
        $this->actingAs($user, 'sanctum');

        $this->postJson("/api/v1/shipments/{$shipment->tracking_code}/confirm-delivery")
            ->assertOk();

        $this->assertSame(1, (int) $driver->fresh()->total_trips);

        // Deliver a second shipment for the same driver via the dev advance endpoint.
        $second = $this->createShipment($user, $driver, Shipment::STATUS_PICKED_UP);
        $this->postJson("/api/v1/shipments/{$second->tracking_code}/advance")
            ->assertOk()->assertJsonPath('shipment.status', Shipment::STATUS_IN_TRANSIT);
        $this->postJson("/api/v1/shipments/{$second->tracking_code}/advance")
            ->assertOk()->assertJsonPath('shipment.status', Shipment::STATUS_DELIVERED);

        $this->assertSame(2, (int) $driver->fresh()->total_trips);
    }

    public function test_advance_persists_delivery_notification(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $shipment = $this->createShipment($user, $driver, Shipment::STATUS_IN_TRANSIT);
        $this->actingAs($user, 'sanctum');

        $this->postJson("/api/v1/shipments/{$shipment->tracking_code}/advance")
            ->assertOk()->assertJsonPath('shipment.status', Shipment::STATUS_DELIVERED);

        $this->assertDatabaseHas('notifications_table', [
            'user_id' => $user->id,
            'title' => 'تم تسليم شحنتك بنجاح',
        ]);
        $row = UserNotification::where('user_id', $user->id)->first();
        $this->assertSame($shipment->tracking_code, $row->data['tracking_code']);
    }
}