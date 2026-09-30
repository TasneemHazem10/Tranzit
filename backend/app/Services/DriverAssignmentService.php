<?php

namespace App\Services;

use App\Models\Driver;
use App\Models\Shipment;

class DriverAssignmentService
{
    public function assignNearest(Shipment $shipment): ?Driver
    {
        $query = Driver::where('approval_status', 'approved')
            ->where('status', 'available');

        if ($shipment->pickup_lat && $shipment->pickup_lng) {
            $query->selectRaw('*, (
                6371 * acos(
                    cos(radians(?)) * cos(radians(lat)) *
                    cos(radians(lng) - radians(?)) +
                    sin(radians(?)) * sin(radians(lat))
                )
            ) as distance', [
                $shipment->pickup_lat,
                $shipment->pickup_lng,
                $shipment->pickup_lat,
            ])
            ->orderByRaw('distance ASC')
            ->limit(1);
        } else {
            $query->limit(1);
        }

        $driver = $query->first();

        if (! $driver) {
            return null;
        }

        $shipment->update([
            'driver_id' => $driver->id,
            'status' => Shipment::STATUS_ASSIGNED,
        ]);

        $shipment->statuses()->create([
            'status' => Shipment::STATUS_ASSIGNED,
            'note' => 'تم تعيين السائق ' . $driver->name . ' للشحنة.',
            'occurred_at' => now(),
        ]);

        $driver->update(['status' => 'busy']);

        return $driver;
    }
}
