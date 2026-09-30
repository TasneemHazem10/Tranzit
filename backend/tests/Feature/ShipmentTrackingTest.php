<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ShipmentTrackingTest extends TestCase
{
    use DatabaseMigrations;

    private const PICKUP = ['lat' => 30.0444, 'lng' => 31.2357];
    private const DROPOFF = ['lat' => 30.1, 'lng' => 31.3];

    protected function setUp(): void
    {
        parent::setUp();
        Http::fake();
    }

    private function createUser(): User
    {
        return User::create([
            'name' => 'Tracking User',
            'phone' => '966500000010',
            'password' => bcrypt('password123'),
        ]);
    }

    private function createDriver(): Driver
    {
        return Driver::create([
            'name' => 'Driver One',
            'phone' => '966500000011',
            'national_id' => '1234567890',
            'vehicle_type' => 'شاحنة صغيرة',
            'vehicle_plate' => 'ABC123',
            'status' => 'available',
            'approval_status' => 'approved',
        ]);
    }

    private function actingDriverShipment(array $attrs = []): Shipment
    {
        $user = $this->createUser();
        $driver = $this->createDriver();

        $shipment = Shipment::create(array_merge([
            'user_id' => $user->id,
            'tracking_code' => Shipment::generateTrackingCode(),
            'status' => Shipment::STATUS_PENDING,
            'driver_id' => $driver->id,
            'pickup_address' => 'Pickup',
            'pickup_lat' => self::PICKUP['lat'],
            'pickup_lng' => self::PICKUP['lng'],
            'dropoff_address' => 'Dropoff',
            'dropoff_lat' => self::DROPOFF['lat'],
            'dropoff_lng' => self::DROPOFF['lng'],
            'package_type' => 'medium',
            'vehicle_type' => 'small_car',
            'payment_method' => 1,
            'price' => 100,
        ], $attrs));

        $this->actingAs($user, 'sanctum');

        return $shipment;
    }

    public function test_shipment_index_returns_driver_and_timeline(): void
    {
        $shipment = $this->actingDriverShipment();
        $shipment->statuses()->create([
            'status' => Shipment::STATUS_PENDING,
            'note' => 'created',
            'occurred_at' => now(),
        ]);

        $res = $this->getJson('/api/v1/shipments');
        $res->assertOk();
        $data = $res->json('shipments.0');
        $this->assertSame($shipment->tracking_code, $data['tracking_code']);
        $this->assertSame('Driver One', $data['driver']['name']);
        $this->assertCount(1, $data['statuses']);
    }

    public function test_advance_places_driver_at_pickup_on_assigned(): void
    {
        $shipment = $this->actingDriverShipment();

        $this->app['env'] = 'local';
        $res = $this->postJson("/api/v1/shipments/{$shipment->tracking_code}/advance");
        $this->app['env'] = 'testing';

        $res->assertOk();
        $res->assertJsonPath('shipment.status', Shipment::STATUS_ASSIGNED);
        $this->assertSame((float) self::PICKUP['lat'], (float) $shipment->fresh()->driver->lat);
        $this->assertSame((float) self::PICKUP['lng'], (float) $shipment->fresh()->driver->lng);

        $this->assertSame(Shipment::STATUS_ASSIGNED, $shipment->fresh()->statuses()->first()->status);
    }

    public function test_advance_interpolates_driver_along_route_and_builds_timeline(): void
    {
        $shipment = $this->actingDriverShipment();

        $this->app['env'] = 'local';
        foreach ([
            Shipment::STATUS_ASSIGNED,
            Shipment::STATUS_PICKED_UP,
            Shipment::STATUS_IN_TRANSIT,
            Shipment::STATUS_DELIVERED,
        ] as $expected) {
            $res = $this->postJson("/api/v1/shipments/{$shipment->tracking_code}/advance");
            $res->assertOk();
            $this->assertSame($expected, $res->json('shipment.status'));
        }
        $this->app['env'] = 'testing';

        // Driver ended at the dropoff point.
        $driver = $shipment->fresh()->driver;
        $this->assertSame((float) self::DROPOFF['lat'], (float) $driver->lat);
        $this->assertSame((float) self::DROPOFF['lng'], (float) $driver->lng);

        // The driver was freed up on delivery.
        $this->assertSame('available', $driver->status);

        // One row per timeline step, in order, each with a timestamp.
        $statuses = $shipment->fresh()->statuses()->get();
        $this->assertCount(4, $statuses);
        $this->assertSame(
            [
                Shipment::STATUS_ASSIGNED,
                Shipment::STATUS_PICKED_UP,
                Shipment::STATUS_IN_TRANSIT,
                Shipment::STATUS_DELIVERED,
            ],
            $statuses->pluck('status')->all()
        );
        foreach ($statuses as $s) {
            $this->assertNotNull($s->occurred_at);
        }
    }

    public function test_driver_location_can_be_updated_and_read_via_show(): void
    {
        $shipment = $this->actingDriverShipment();

        $this->app['env'] = 'local';
        $res = $this->postJson("/api/v1/shipments/{$shipment->tracking_code}/driver/location", [
            'lat' => 30.123456,
            'lng' => 31.234567,
        ]);
        $this->app['env'] = 'testing';

        $res->assertOk();
        $this->assertSame(30.123456, (float) $shipment->fresh()->driver->lat);
        $this->assertSame(31.234567, (float) $shipment->fresh()->driver->lng);

        $show = $this->getJson("/api/v1/shipments/{$shipment->tracking_code}");
        $show->assertOk();
        $this->assertSame(30.123456, (float) $show->json('shipment.driver.lat'));
        $this->assertSame(31.234567, (float) $show->json('shipment.driver.lng'));
    }

    public function test_location_endpoint_rejects_non_numeric_coordinates(): void
    {
        $shipment = $this->actingDriverShipment();

        $this->app['env'] = 'local';
        $res = $this->postJson("/api/v1/shipments/{$shipment->tracking_code}/driver/location", [
            'lat' => 'abc',
            'lng' => 31.2,
        ]);
        $this->app['env'] = 'testing';

        $res->assertStatus(422);
    }

    public function test_show_returns_driver_offers_and_marker_fields(): void
    {
        $this->app['env'] = 'local';
        $shipment = $this->actingDriverShipment();

        $res = $this->getJson("/api/v1/shipments/{$shipment->tracking_code}");
        $this->app['env'] = 'testing';

        $res->assertOk()
            ->assertJsonPath('shipment.driver.name', 'Driver One')
            ->assertJsonPath('shipment.pickup_lat', (float) self::PICKUP['lat'])
            ->assertJsonPath('shipment.dropoff_lng', (float) self::DROPOFF['lng']);
    }
}
