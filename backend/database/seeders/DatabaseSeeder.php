<?php

namespace Database\Seeders;

use App\Models\Driver;
use App\Models\Shipment;
use App\Models\ShipmentStatus;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['phone' => '0114337313'],
            [
                'name' => 'محمد شمس',
                'email' => 'mohamed@tranzet.app',
                'password' => '123456',
                'phone_verified_at' => now(),
            ]
        );

        $driver = Driver::updateOrCreate(
            ['phone' => '01098765432'],
            [
                'name' => 'محمود عبد الله',
                'rating_avg' => 4.5,
                'total_trips' => 312,
                'vehicle_type' => 'شاحنة نصف نقل',
                'vehicle_plate' => 'ط ن ح 4521',
                'lat' => 30.0444,
                'lng' => 31.2357,
                'status' => 'on_trip',
            ]
        );

        $shipment = Shipment::updateOrCreate(
            ['tracking_code' => 'TZ123456'],
            [
                'user_id' => $user->id,
                'driver_id' => $driver->id,
                'status' => Shipment::STATUS_IN_TRANSIT,
                'pickup_address' => 'مدينة نصر، القاهرة',
                'pickup_lat' => 30.0561,
                'pickup_lng' => 31.3309,
                'dropoff_address' => 'سموحة، الإسكندرية',
                'dropoff_lat' => 31.2105,
                'dropoff_lng' => 29.9187,
                'package_type' => 'large',
                'payment_method' => 2,
                'price' => 1800,
            ]
        );

        $timeline = [
            [Shipment::STATUS_PENDING, 'تم إنشاء الطلب بنجاح.', now()->subHours(5)],
            [Shipment::STATUS_ASSIGNED, 'تم تعيين السائق محمود عبد الله.', now()->subHours(4)],
            [Shipment::STATUS_PICKED_UP, 'تم استلام الشحنة من المرسل.', now()->subHours(3)],
            [Shipment::STATUS_IN_TRANSIT, 'الشحنة في الطريق إلى الوجهة.', now()->subMinutes(40)],
        ];

        foreach ($timeline as [$status, $note, $at]) {
            ShipmentStatus::firstOrCreate(
                ['shipment_id' => $shipment->id, 'status' => $status],
                ['note' => $note, 'occurred_at' => $at]
            );
        }
    }
}
