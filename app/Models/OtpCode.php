<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OtpCode extends Model
{
    use HasFactory;

    public const PURPOSE_LOGIN = 'login';
    public const PURPOSE_REGISTER = 'register';
    public const PURPOSE_RESET = 'reset';

    protected $fillable = ['phone', 'code', 'purpose', 'expires_at', 'consumed_at'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isConsumed(): bool
    {
        return $this->consumed_at !== null;
    }

    public function isValid(): bool
    {
        return ! $this->isExpired() && ! $this->isConsumed();
    }
}
