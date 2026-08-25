<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Driver extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'phone', 'rating_avg', 'total_trips', 'vehicle_type',
        'vehicle_plate', 'photo_url', 'lat', 'lng', 'status',
    ];

    protected function casts(): array
    {
        return [
            'rating_avg' => 'float',
            'lat' => 'float',
            'lng' => 'float',
        ];
    }

    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class);
    }

    public function ratings(): HasMany
    {
        return $this->hasMany(Rating::class);
    }
}
