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

    public const PRICES = [
        'small' => 50.0,
        'medium' => 100.0,
        'large' => 180.0,
    ];

    protected $fillable = [
        'user_id', 'driver_id', 'tracking_code', 'status',
        'pickup_address', 'pickup_lat', 'pickup_lng',
        'dropoff_address', 'dropoff_lat', 'dropoff_lng',
        'package_type', 'payment_method', 'scheduled_at',
        'price', 'notes', 'proof_photo_path', 'signature_path',
        'delivered_at',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'delivered_at' => 'datetime',
            'price' => 'float',
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

    public static function generateTrackingCode(): string
    {
        do {
            $code = 'TZ'.str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        } while (self::where('tracking_code', $code)->exists());

        return $code;
    }
}
