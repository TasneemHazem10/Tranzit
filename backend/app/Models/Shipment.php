<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shipment extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_ASSIGNED = 'assigned';
    public const STATUS_PICKED_UP = 'picked_up';
    public const STATUS_IN_TRANSIT = 'in_transit';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_CANCELED = 'canceled';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_ASSIGNED,
        self::STATUS_PICKED_UP,
        self::STATUS_IN_TRANSIT,
        self::STATUS_DELIVERED,
        self::STATUS_CANCELED,
    ];

    /**
     * Fare rates in EGP based on the Egyptian last-mile / freight market
     * (2025-2026). Each rate is keyed by the vehicle (car) size the user
     * picks, since the price depends on the distance and the size of the car:
     * - trike:      base 25  + 2.0  EGP/km (motor tricycle, cheapest)
     * - small car:  base 30  + 3.0  EGP/km
     * - van:        base 40  + 4.0  EGP/km
     * - truck:      base 50  + 5.0  EGP/km
     * The elevated long-distance rate mirrors Egyptian freight bands
     * (same-governorate is cheaper, inter-governorate / long runs cost more).
     */
    public const FARE_RATES = [
        'trike' => ['bands' => [25.0, 18.0, 15.0, 5.0], 'per_min' => 10.0],
        'small_car' => ['bands' => [30.0, 23.0, 20.0, 10.0], 'per_min' => 10.0],
        'van' => ['bands' => [40.0, 33.0, 28.0, 15.0], 'per_min' => 10.0],
        'truck' => ['bands' => [50.0, 43.0, 38.0, 25.0], 'per_min' => 10.0],
    ];

    public const FARE_BAND_ENDS = [50.0, 100.0, 200.0];

    public const PAYMENT_PENDING = 'pending';
    public const PAYMENT_PAID = 'paid';
    public const PAYMENT_REFUNDED = 'refunded';

    protected $fillable = [
        'user_id', 'driver_id', 'tracking_code', 'status',
        'pickup_address', 'pickup_lat', 'pickup_lng',
        'dropoff_address', 'dropoff_lat', 'dropoff_lng',
        'package_type', 'vehicle_type', 'weight_kg', 'length_cm', 'width_cm', 'height_cm',
        'payment_method', 'scheduled_at',
        'price', 'distance_km', 'notes', 'proof_photo_path', 'signature_path',
        'delivered_at',
        'mobile_wallet_provider', 'mobile_wallet_number', 'mobile_wallet_status',
        'payment_status', 'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'delivered_at' => 'datetime',
            'paid_at' => 'datetime',
            'price' => 'float',
            'distance_km' => 'float',
            'weight_kg' => 'float',
            'length_cm' => 'float',
            'width_cm' => 'float',
            'height_cm' => 'float',
            'pickup_lat' => 'float',
            'pickup_lng' => 'float',
            'dropoff_lat' => 'float',
            'dropoff_lng' => 'float',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }

    public function statuses(): HasMany
    {
        return $this->hasMany(ShipmentStatus::class)->orderBy('occurred_at');
    }

    public function rating()
    {
        return Rating::where('shipment_id', $this->id)->first();
    }

    public function offers(): HasMany
    {
        return $this->hasMany(DriverOffer::class)->orderByDesc('amount');
    }

    /**
     * Great-circle distance (km) between pickup and dropoff.
     */
    public function distanceKm(): ?float
    {
        if ($this->pickup_lat === null || $this->pickup_lng === null
            || $this->dropoff_lat === null || $this->dropoff_lng === null) {
            return null;
        }

        $earth = 6371.0;
        $dlat = deg2rad($this->dropoff_lat - $this->pickup_lat);
        $dlng = deg2rad($this->dropoff_lng - $this->pickup_lng);

        $a = sin($dlat / 2) ** 2
            + cos(deg2rad($this->pickup_lat)) * cos(deg2rad($this->dropoff_lat))
            * sin($dlng / 2) ** 2;

        return $earth * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /**
     * Suggested fare = base by vehicle (car) size + per-km surcharge.
     */
    public function estimateFare(?float $durationMin = null): float
    {
        return self::estimateFareFrom(
            $this->vehicle_type,
            $this->distance_km ?? $this->distanceKm() ?? 0,
            $durationMin
        );
    }

    /**
     * Compute a fare from a vehicle type and a distance in km.
     * Static so it can also be reused to give a live estimate before
     * a shipment is created (from two arbitrary map points).
     */
    public static function estimateFareFrom(string $vehicleType, float $distanceKm, ?float $durationMin = null): float
    {
        $rates = self::fareRates($vehicleType);
        $first = min($distanceKm, 50.0);
        $second = min(max($distanceKm - 50.0, 0.0), 50.0);
        $third = min(max($distanceKm - 100.0, 0.0), 100.0);
        $fourth = max($distanceKm - 200.0, 0.0);
        $distanceCharge = ($first * $rates['bands'][0])
            + ($second * $rates['bands'][1])
            + ($third * $rates['bands'][2])
            + ($fourth * $rates['bands'][3]);
        $time = $durationMin ?? (($distanceKm / 30.0) * 60.0);
        $timeRate = $distanceKm > 200.0 ? 4.0 : 10.0;

        return round($distanceCharge + ($time * $timeRate), 2);
    }

    /**
     * Fare rates for a vehicle type.
     *
    * @return array{bands: array<int, float>, per_min: float}
     */
    public static function fareRates(string $vehicleType): array
    {
        return self::FARE_RATES[$vehicleType] ?? self::FARE_RATES['small_car'];
    }

    /**
     * Great-circle distance (km) between two arbitrary points.
     */
    public static function distanceBetween(
        float $lat1,
        float $lng1,
        float $lat2,
        float $lng2
    ): float {
        $earth = 6371.0;
        $dlat = deg2rad($lat2 - $lat1);
        $dlng = deg2rad($lng2 - $lng1);

        $a = sin($dlat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2))
            * sin($dlng / 2) ** 2;

        return $earth * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    public static function generateTrackingCode(): string
    {
        do {
            $code = 'TZ'.str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        } while (self::where('tracking_code', $code)->exists());

        return $code;
    }
}
