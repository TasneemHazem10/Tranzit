<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ShipmentController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Api\DriverRegistrationController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\GeocodeController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/geocode/search', [GeocodeController::class, 'search']);
    Route::get('/geocode/reverse', [GeocodeController::class, 'reverse']);
    Route::get('/directions', [GeocodeController::class, 'directions']);

    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/otp/send', [AuthController::class, 'resendOtp']);
    Route::post('/otp/verify', [AuthController::class, 'verifyOtp']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/google/login', [AuthController::class, 'googleLogin']);

    Route::post('/driver/register', [DriverRegistrationController::class, 'store']);
    Route::post('/driver/login', [DriverController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        // Customer (user) endpoints.
        Route::middleware('ensure.role:user')->group(function () {
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::put('/profile', [AuthController::class, 'updateProfile']);
            Route::put('/password', [AuthController::class, 'changePassword']);

            Route::get('/shipments', [ShipmentController::class, 'index']);
            Route::post('/shipments', [ShipmentController::class, 'store']);
            Route::get('/shipments/{code}', [ShipmentController::class, 'show']);
            Route::get('/shipments/{code}/estimate', [ShipmentController::class, 'estimate']);
            Route::post('/shipments/{code}/offers/simulate', [ShipmentController::class, 'simulateOffer']);
            Route::post('/shipments/{code}/bid', [ShipmentController::class, 'updateBid']);
            Route::post('/shipments/{code}/offers/{offerId}/accept', [ShipmentController::class, 'acceptOffer']);
            Route::post('/shipments/{code}/offers/{offerId}/decline', [ShipmentController::class, 'declineOffer']);
            Route::post('/shipments/{code}/confirm-delivery', [ShipmentController::class, 'confirmDelivery']);
            Route::post('/shipments/{code}/rate', [ShipmentController::class, 'rate']);
            Route::post('/shipments/{code}/advance', [ShipmentController::class, 'advance']);
            Route::post('/shipments/{code}/driver/location', [ShipmentController::class, 'updateDriverLocation']);
            Route::post('/shipments/{code}/cancel', [ShipmentController::class, 'cancel']);
            Route::post('/shipments/{code}/mobile-wallet/confirm', [ShipmentController::class, 'confirmMobileWallet']);
            Route::post('/shipments/{code}/online/confirm', [ShipmentController::class, 'confirmOnlinePayment']);
            Route::post('/fare/estimate', [ShipmentController::class, 'estimateLive']);

            Route::get('/messages/{driverId}', [MessageController::class, 'index']);
            Route::post('/messages/{driverId}', [MessageController::class, 'store']);
            Route::get('/messages/{driverId}/stream', [MessageController::class, 'stream']);

            Route::get('/wallet', [WalletController::class, 'show']);
            Route::post('/wallet/topup', [WalletController::class, 'topup']);

            Route::post('/payment/initiate', [PaymentController::class, 'initiateTopup']);
            Route::post('/payment/confirm', [PaymentController::class, 'confirmPayment']);
            Route::post('/payment/callback', [PaymentController::class, 'callback']);
            Route::post('/payment/shipments/{code}/initiate', [PaymentController::class, 'initiateShipmentPayment']);
            Route::post('/payment/shipments/{code}/confirm', [PaymentController::class, 'confirmShipmentPayment']);

            Route::post('/push-token', [AuthController::class, 'updatePushToken']);

            Route::get('/notifications', [NotificationController::class, 'index']);
            Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
            Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead']);
            Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
            Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
        });

        // Driver endpoints.
        Route::middleware('ensure.role:driver')->prefix('driver')->group(function () {
            Route::get('/me', [DriverController::class, 'me']);
            Route::post('/logout', [DriverController::class, 'logout']);
            Route::put('/profile', [DriverController::class, 'updateProfile']);
            Route::put('/password', [DriverController::class, 'updatePassword']);
            Route::post('/push-token', [DriverController::class, 'updatePushToken']);
            Route::get('/available-shipments', [DriverController::class, 'availableShipments']);
            Route::get('/jobs', [DriverController::class, 'jobs']);
            Route::post('/shipments/{code}/offers', [DriverController::class, 'createOffer']);
            Route::get('/earnings', [DriverController::class, 'earnings']);
        });
    });
});