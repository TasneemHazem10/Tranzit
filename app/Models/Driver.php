<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Sanctum\HasApiTokens;

class Driver extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $fillable = [
        'name', 'phone', 'password', 'national_id', 'rating_avg', 'total_trips',
        'vehicle_type', 'vehicle_plate', 'vehicle_model', 'vehicle_year',
        'vehicle_capacity', 'photo_url', 'lat', 'lng', 'status',
        'license_path', 'national_id_path', 'insurance_path',
        'registration_path', 'approval_status', 'push_token',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'rating_avg' => 'float',
            'lat' => 'float',
            'lng' => 'float',
            'password' => 'hashed',
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

    public function offers(): HasMany
    {
        return $this->hasMany(DriverOffer::class);
    }
}