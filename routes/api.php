<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ShipmentController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Api\DriverRegistrationController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/otp/send', [AuthController::class, 'resendOtp']);
    Route::post('/otp/verify', [AuthController::class, 'verifyOtp']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/google/login', [AuthController::class, 'googleLogin']);

    Route::post('/driver/register', [DriverRegistrationController::class, 'store']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);

        Route::get('/shipments', [ShipmentController::class, 'index']);
        Route::post('/shipments', [ShipmentController::class, 'store']);
        Route::get('/shipments/{code}', [ShipmentController::class, 'show']);
        Route::post('/shipments/{code}/confirm-delivery', [ShipmentController::class, 'confirmDelivery']);
        Route::post('/shipments/{code}/rate', [ShipmentController::class, 'rate']);
        Route::post('/shipments/{code}/advance', [ShipmentController::class, 'advance']);

        Route::get('/messages/{driverId}', [MessageController::class, 'index']);
        Route::post('/messages/{driverId}', [MessageController::class, 'store']);

        Route::get('/wallet', [WalletController::class, 'show']);
        Route::post('/wallet/topup', [WalletController::class, 'topup']);

        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    });
});
