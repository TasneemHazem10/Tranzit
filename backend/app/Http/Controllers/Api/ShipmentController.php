<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\DriverOffer;
use App\Models\Rating;
use App\Models\Shipment;
use App\Models\ShipmentStatus;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ShipmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $shipments = $request->user()
            ->shipments()
            ->with(['driver', 'statuses'])
            ->latest()
            ->get();

        return response()->json(['shipments' => $shipments]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pickup_address' => ['required', 'string', 'max:255'],
            'pickup_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'pickup_lng' => ['nullable', 'numeric', 'between:-180,180'],
            'dropoff_address' => ['required', 'string', 'max:255'],
            'dropoff_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'dropoff_lng' => ['nullable', 'numeric', 'between:-180,180'],
            'distance_km' => ['nullable', 'numeric', 'min:0'],
            'estimated_duration_min' => ['nullable', 'numeric', 'min:0'],
            'package_type' => ['nullable', 'in:small,medium,large'],
            'vehicle_type' => ['required', 'in:trike,small_car,van,truck'],
            'weight_kg' => ['nullable', 'numeric', 'min:0', 'max:100000'],
            'length_cm' => ['nullable', 'numeric', 'min:0', 'max:100000'],
            'width_cm' => ['nullable', 'numeric', 'min:0', 'max:100000'],
            'height_cm' => ['nullable', 'numeric', 'min:0', 'max:100000'],
            'payment_method' => ['required', 'integer', 'in:1,2,3,4'],
            'mobile_wallet_provider' => [
                'nullable',
                'string',
                'in:vodafone_cash,orange_cash,etisalat_cash,we_pay,instapay',
            ],
            'mobile_wallet_number' => ['nullable', 'string', 'regex:/^[0-9+\s-]{8,15}$/'],
            'scheduled_at' => ['nullable', 'date', 'after:now'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        // Mobile wallet (method 4) requires provider + number
        if ((int) $data['payment_method'] === 4) {
            if (empty($data['mobile_wallet_provider']) || empty($data['mobile_wallet_number'])) {
                return response()->json([
                    'message' => __('حدد محفظتك الإلكترونية وأدخل رقم هاتفك المحمول.'),
                    'errors' => ['mobile_wallet' => [__('حدد محفظتك الإلكترونية وأدخل رقم هاتفك المحمول.')]],
                ], 422);
            }
        } elseif (! empty($data['mobile_wallet_provider']) || ! empty($data['mobile_wallet_number'])) {
            // Ignore wallet fields when the method isn't mobile wallet
            $data['mobile_wallet_provider'] = null;
            $data['mobile_wallet_number'] = null;
        }

        $attrs = [
            ...$data,
            'package_type' => $data['package_type'] ?? 'medium',
            'tracking_code' => Shipment::generateTrackingCode(),
            'status' => Shipment::STATUS_PENDING,
            'price' => 0,
            'distance_km' => null,
        ];

        if ((int) $data['payment_method'] === 4) {
            $attrs['mobile_wallet_status'] = 'pending';
        }

        $shipment = $request->user()->shipments()->create($attrs);

        // Store the distance between pickup & dropoff (used for fare estimation).
        $distance = isset($data['distance_km'])
            ? (float) $data['distance_km']
            : $shipment->distanceKm();
        if ($distance !== null) {
            $shipment->update(['distance_km' => round($distance, 2)]);
        }

        $estimated = Shipment::estimateFareFrom(
            $shipment->vehicle_type,
            $distance ?? 0,
            isset($data['estimated_duration_min']) ? (float) $data['estimated_duration_min'] : null,
        );
        $shipment->update(['price' => $estimated]);

        $shipment->statuses()->create([
            'status' => Shipment::STATUS_PENDING,
            'note' => __('تم إنشاء الطلب. يبحث النظام عن سائق لتقديم عرض سعر.'),
            'occurred_at' => now(),
        ]);

        return response()->json([
            'message' => __('تم حجز الشحنة بنجاح. جارٍ البحث عن السائقين.'),
            'shipment' => $shipment->load('statuses'),
            'estimated_price' => $estimated,
            'distance_km' => $shipment->distance_km,
        ], 201);
    }

    /**
     * Return the suggested fare for a shipment (base by vehicle size + distance).
     */
    public function estimate(Request $request, string $code): JsonResponse
    {
        $shipment = $this->findUserShipment($request, $code);

        if (! $shipment) {
            return $this->notFound();
        }

        return response()->json([
            'estimated_price' => $shipment->estimateFare(),
            'distance_km' => $shipment->distance_km,
            'bands' => Shipment::fareRates($shipment->vehicle_type)['bands'],
            'per_min' => Shipment::fareRates($shipment->vehicle_type)['per_min'],
            'rates' => Shipment::FARE_RATES,
            'shipment' => $shipment->load(['statuses', 'offers.driver']),
        ]);
    }

    /**
     * Live fare estimate from two arbitrary map points + vehicle type.
     * Used by the booking screen as soon as pickup & dropoff pins are set.
     */
    public function estimateLive(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pickup_lat' => ['required', 'numeric', 'between:-90,90'],
            'pickup_lng' => ['required', 'numeric', 'between:-180,180'],
            'dropoff_lat' => ['required', 'numeric', 'between:-90,90'],
            'dropoff_lng' => ['required', 'numeric', 'between:-180,180'],
            'vehicle_type' => ['required', 'in:trike,small_car,van,truck'],
            'estimated_duration_min' => ['nullable', 'numeric', 'min:0'],
        ]);

        $distance = Shipment::distanceBetween(
            (float) $data['pickup_lat'],
            (float) $data['pickup_lng'],
            (float) $data['dropoff_lat'],
            (float) $data['dropoff_lng'],
        );

        return response()->json([
            'distance_km' => round($distance, 2),
            'estimated_price' => Shipment::estimateFareFrom(
                $data['vehicle_type'],
                $distance,
                isset($data['estimated_duration_min']) ? (float) $data['estimated_duration_min'] : null,
            ),
            'bands' => Shipment::fareRates($data['vehicle_type'])['bands'],
            'per_min' => Shipment::fareRates($data['vehicle_type'])['per_min'],
            'rates' => Shipment::FARE_RATES,
        ]);
    }

    /**
     * Dev-only: simulate a nearby driver quoting a fare for this shipment.
     * Lets the client flow be tested without a full driver app.
     */
    public function simulateOffer(Request $request, string $code): JsonResponse
    {
        if (! app()->environment('local')) {
            abort(404);
        }

        $shipment = $this->findUserShipment($request, $code);

        if (! $shipment) {
            return $this->notFound();
        }

        if ($shipment->status !== Shipment::STATUS_PENDING) {
            return response()->json(['message' => __('هذه الشحنة لم تعد بانتظار عروض.')], 422);
        }

        $driver = Driver::where('approval_status', 'approved')
            ->where('status', 'available')
            ->first();

        if (! $driver) {
            return response()->json(['message' => __('لا يوجد سائقون متاحون حالياً.')], 422);
        }

        // A driver may quote between the base and ~2.5x the estimate.
        $estimated = $shipment->estimateFare();
        $amount = round($estimated * (0.9 + (float) random_int(0, 15) / 10), 2);

        $offer = DriverOffer::create([
            'shipment_id' => $shipment->id,
            'driver_id' => $driver->id,
            'amount' => $amount,
            'status' => DriverOffer::STATUS_PENDING,
        ]);

        $driver->update(['status' => 'busy']);
        $shipment->fresh();

        $pushService = app(\App\Services\PushNotificationService::class);
        $pushService->notifyShipmentUpdate(
            $request->user(),
            $shipment->tracking_code,
            'offer',
            'تلقيت عرض سعر بقيمة ' . number_format($amount, 2) . ' جنيه من السائق ' . $driver->name . '.'
        );

        return response()->json([
            'message' => __('وصل عرض سعر من السائق.'),
            'offer' => $offer->load('driver'),
            'shipment' => $shipment->load(['statuses', 'offers.driver']),
        ]);
    }

    public function updateBid(Request $request, string $code): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:20'],
        ]);
        $shipment = $this->findUserShipment($request, $code);

        if (! $shipment) {
            return $this->notFound();
        }
        if ($shipment->status !== Shipment::STATUS_PENDING) {
            return response()->json(['message' => __('لا يمكن تغيير السعر بعد تعيين السائق.')], 422);
        }

        $shipment->update(['price' => round((float) $data['amount'])]);

        return response()->json([
            'message' => __('تم تحديث السعر المقترح.'),
            'shipment' => $shipment->fresh()->load(['statuses', 'offers.driver']),
        ]);
    }

    /**
     * User accepts a pending driver offer -> assigns driver + price.
     */
    public function acceptOffer(Request $request, string $code, int $offerId): JsonResponse
    {
        $shipment = $this->findUserShipment($request, $code);

        if (! $shipment) {
            return $this->notFound();
        }

        if ($shipment->status !== Shipment::STATUS_PENDING) {
            return response()->json(['message' => __('لا يمكن قبول عرض في هذه المرحلة.')], 422);
        }

        $offer = $shipment->offers()->find($offerId);

        if (! $offer || $offer->status !== DriverOffer::STATUS_PENDING) {
            return response()->json(['message' => __('هذا العرض لم يعد متاحاً.')], 422);
        }

        if ((int) $shipment->payment_method === 3) {
            $wallet = Wallet::firstOrCreate(['user_id' => $request->user()->id]);

            if ((float) $wallet->balance < (float) $offer->amount) {
                return response()->json([
                    'message' => __('رصيد محفظتك غير كافٍ. الرصيد الحالي: :balance جنيه.', ['balance' => number_format($wallet->balance, 2)]),
                ], 422);
            }

            DB::transaction(function () use ($wallet, $offer, $shipment) {
                $wallet->decrement('balance', $offer->amount);
                WalletTransaction::create([
                    'wallet_id' => $wallet->id,
                    'type' => 'payment',
                    'amount' => $offer->amount,
                    'description' => 'دفع شحنة ' . $shipment->tracking_code,
                    'reference' => $shipment->tracking_code,
                ]);
            });
        }

        DB::transaction(function () use ($shipment, $offer) {
            $shipment->update([
                'driver_id' => $offer->driver_id,
                'status' => Shipment::STATUS_ASSIGNED,
                'price' => $offer->amount,
                'payment_status' => (int) $shipment->payment_method === 3
                    ? Shipment::PAYMENT_PAID
                    : Shipment::PAYMENT_PENDING,
                'paid_at' => (int) $shipment->payment_method === 3 ? now() : null,
            ]);

            $offer->update(['status' => DriverOffer::STATUS_ACCEPTED]);

            $shipment->offers()
                ->where('id', '!=', $offer->id)
                ->where('status', DriverOffer::STATUS_PENDING)
                ->update(['status' => DriverOffer::STATUS_DECLINED]);

            optional($offer->driver)->update(array_filter([
                'status' => 'busy',
                'lat' => $shipment->pickup_lat,
                'lng' => $shipment->pickup_lng,
            ], fn ($v) => $v !== null));
        });

        $shipment->statuses()->create([
            'status' => Shipment::STATUS_ASSIGNED,
            'note' => __('تم قبول عرض السائق :name بقيمة :amount جنيه.', [
                'name' => $offer->driver->name,
                'amount' => number_format($offer->amount, 2),
            ]),
            'occurred_at' => now(),
        ]);

        $pushService = app(\App\Services\PushNotificationService::class);
        $pushService->notifyShipmentUpdate(
            $request->user(),
            $shipment->tracking_code,
            'assigned',
            'تم تعيين السائق ' . $offer->driver->name . ' لشحنتك بقيمة ' . number_format($offer->amount, 2) . ' جنيه.'
        );

        return response()->json([
            'message' => __('تم قبول العرض وتعيين السائق.'),
            'shipment' => $shipment->fresh(['driver', 'statuses', 'offers']),
        ]);
    }

    /**
     * User declines an offer -> shipment keeps waiting for another driver.
     */
    public function declineOffer(Request $request, string $code, int $offerId): JsonResponse
    {
        $shipment = $this->findUserShipment($request, $code);

        if (! $shipment) {
            return $this->notFound();
        }

        $offer = $shipment->offers()->find($offerId);

        if (! $offer) {
            return $this->notFound();
        }

        if ($offer->status === DriverOffer::STATUS_PENDING) {
            $offer->update(['status' => DriverOffer::STATUS_DECLINED]);
            optional($offer->driver)->update(['status' => 'available']);
        }

        $shipment->statuses()->create([
            'status' => Shipment::STATUS_PENDING,
            'note' => __('تم رفض عرض السائق :name. جارٍ البحث عن عرض آخر.', [
                'name' => $offer->driver->name,
            ]),
            'occurred_at' => now(),
        ]);

        return response()->json([
            'message' => __('تم رفض العرض. بانتظار عرض آخر.'),
            'shipment' => $shipment->fresh(['statuses', 'offers.driver']),
        ]);
    }

    public function show(Request $request, string $code): JsonResponse
    {
        $shipment = $this->findUserShipment($request, $code);

        if (! $shipment) {
            return $this->notFound();
        }

        return response()->json([
            'shipment' => array_merge($shipment->load('offers.driver')->toArray(), [
                'rating' => Rating::where('shipment_id', $shipment->id)->first(),
                'proof_photo_url' => $shipment->proof_photo_path ? url(Storage::url($shipment->proof_photo_path)) : null,
                'signature_url' => $shipment->signature_path ? url(Storage::url($shipment->signature_path)) : null,
                'estimated_price' => $shipment->estimateFare(),
                'distance_km' => $shipment->distance_km,
            ]),
        ]);
    }

    public function confirmDelivery(Request $request, string $code): JsonResponse
    {
        $shipment = $this->findUserShipment($request, $code);

        if (! $shipment) {
            return $this->notFound();
        }

        if ($shipment->status !== Shipment::STATUS_IN_TRANSIT && $shipment->status !== Shipment::STATUS_DELIVERED) {
            return response()->json([
                'message' => __('لا يمكن تأكيد التسليم إلا أثناء وجود الشحنة في الطريق.'),
            ], 422);
        }

        $data = $request->validate([
            'proof_photo' => ['nullable', 'image', 'max:5120'],
            'signature_image' => ['nullable', 'image', 'max:5120'],
        ]);

        if ($request->hasFile('proof_photo')) {
            $shipment->proof_photo_path = $request->file('proof_photo')->store('proofs', 'public');
        }

        if ($request->hasFile('signature_image')) {
            $shipment->signature_path = $request->file('signature_image')->store('signatures', 'public');
        }

        $wasDelivered = $shipment->status === Shipment::STATUS_DELIVERED;

        if (! $wasDelivered) {
            $shipment->status = Shipment::STATUS_DELIVERED;
            $shipment->delivered_at = now();

            if ((int) $shipment->payment_method === 2) {
                $shipment->payment_status = Shipment::PAYMENT_PAID;
                $shipment->paid_at = now();
            }

            $shipment->save();

            $shipment->statuses()->create([
                'status' => Shipment::STATUS_DELIVERED,
                'note' => __('تم تسليم الشحنة بنجاح.'),
                'occurred_at' => now(),
            ]);

            optional($shipment->driver)->update(['status' => 'available']);

            $this->refreshDriverTrips($shipment->driver_id);

            $pushService = app(\App\Services\PushNotificationService::class);
            $pushService->notifyShipmentUpdate(
                $shipment->user,
                $shipment->tracking_code,
                'delivered',
                'تم تسليم شحنتك بنجاح.'
            );
        } else {
            $shipment->save();
        }

        return response()->json([
            'message' => __('تم تأكيد التسليم.'),
            'shipment' => $shipment->fresh(['driver', 'statuses']),
        ]);
    }

    public function rate(Request $request, string $code): JsonResponse
    {
        $shipment = $this->findUserShipment($request, $code);

        if (! $shipment) {
            return $this->notFound();
        }

        if ($shipment->status !== Shipment::STATUS_DELIVERED) {
            return response()->json([
                'message' => __('يمكن التقييم بعد اكتمال التسليم فقط.'),
            ], 422);
        }

        $data = $request->validate([
            'stars' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:500'],
        ]);

        if (! $shipment->driver_id) {
            return response()->json(['message' => __('لا يوجد سائق مرتبط بهذه الشحنة.')], 422);
        }

        $rating = Rating::updateOrCreate(
            ['shipment_id' => $shipment->id],
            ['driver_id' => $shipment->driver_id, ...$data]
        );

        $driver = Driver::find($shipment->driver_id);
        $avg = (float) Rating::where('driver_id', $driver->id)->avg('stars');
        $driver->update(['rating_avg' => round($avg, 1)]);

        return response()->json([
            'message' => __('شكراً لتقييمك!'),
            'rating' => $rating,
            'driver' => $driver,
        ]);
    }

    /**
     * Dev-only helper to simulate the driver progressing a shipment so the
     * tracking screens can be tested without a separate driver app.
     */
    public function cancel(Request $request, string $code): JsonResponse
    {
        $shipment = $this->findUserShipment($request, $code);

        if (! $shipment) {
            return $this->notFound();
        }

        if ($shipment->status !== Shipment::STATUS_PENDING && $shipment->status !== Shipment::STATUS_ASSIGNED) {
            return response()->json([
                'message' => __('لا يمكن إلغاء الشحنة في هذه المرحلة.'),
            ], 422);
        }

        if ((int) $shipment->payment_method === 3 && $shipment->payment_status === Shipment::PAYMENT_PAID) {
            $wallet = Wallet::firstOrCreate(['user_id' => $request->user()->id]);
            $wallet->increment('balance', $shipment->price);
            WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'type' => 'refund',
                'amount' => $shipment->price,
                'description' => 'استرداد شحنة ملغاة ' . $shipment->tracking_code,
                'reference' => $shipment->tracking_code,
            ]);
        }

        $shipment->update([
            'status' => Shipment::STATUS_CANCELED,
            'payment_status' => $shipment->payment_status === Shipment::PAYMENT_PAID
                ? Shipment::PAYMENT_REFUNDED
                : $shipment->payment_status,
        ]);

        $shipment->statuses()->create([
            'status' => Shipment::STATUS_CANCELED,
            'note' => __('تم إلغاء الشحنة من قبل المستخدم.'),
            'occurred_at' => now(),
        ]);

        if ($shipment->driver_id) {
            optional($shipment->driver)->update(['status' => 'available']);
        }

        return response()->json([
            'message' => __('تم إلغاء الشحنة.'),
            'shipment' => $shipment->fresh(['driver', 'statuses']),
        ]);
    }

    /**
     * Mark a mobile wallet (Vodafone Cash etc.) payment as paid.
     * The transfer is done by the user/driver to the company wallet,
     * and this endpoint records that the payment was received.
     */
    public function confirmMobileWallet(Request $request, string $code): JsonResponse
    {
        $shipment = $this->findUserShipment($request, $code);

        if (! $shipment) {
            return $this->notFound();
        }

        if ((int) $shipment->payment_method !== 4) {
            return response()->json([
                'message' => __('هذه الشحنة لا تستخدم محفظة إلكترونية.'),
            ], 422);
        }

        if ($shipment->mobile_wallet_status === 'paid') {
            return response()->json([
                'message' => __('تم تأكيد الدفع بالفعل.'),
                'shipment' => $shipment->fresh(['driver', 'statuses']),
            ]);
        }

        $sync = $request->boolean('paid', true);

        $shipment->update([
            'mobile_wallet_status' => $sync ? 'paid' : 'pending',
            'payment_status' => $sync ? Shipment::PAYMENT_PAID : Shipment::PAYMENT_PENDING,
            'paid_at' => $sync ? now() : null,
        ]);

        if ($sync) {
            $shipment->statuses()->create([
                'status' => $shipment->status,
                'note' => __('تم تأكيد الدفع عبر المحفظة الإلكترونية (:provider).', [
                    'provider' => $this->providerLabel($shipment->mobile_wallet_provider),
                ]),
                'occurred_at' => now(),
            ]);
        }

        return response()->json([
            'message' => $sync ? __('تم تأكيد دفع المحفظة الإلكترونية.') : __('تم تراجع حالة الدفع.'),
            'shipment' => $shipment->fresh(['driver', 'statuses']),
        ]);
    }

    /**
     * Confirm an online (Paymob / card) payment for a shipment.
     * When Paymob keys are not configured, the frontend confirms the
     * payment manually (same out-of-band pattern as mobile wallets).
     */
    public function confirmOnlinePayment(Request $request, string $code): JsonResponse
    {
        $shipment = $this->findUserShipment($request, $code);

        if (! $shipment) {
            return $this->notFound();
        }

        if ((int) $shipment->payment_method !== 1) {
            return response()->json([
                'message' => __('هذه الشحنة لا تستخدم الدفع أونلاين.'),
            ], 422);
        }

        if ($shipment->payment_status === Shipment::PAYMENT_PAID) {
            return response()->json([
                'message' => __('تم تأكيد الدفع بالفعل.'),
                'shipment' => $shipment->fresh(['driver', 'statuses']),
            ]);
        }

        $sync = $request->boolean('paid', true);

        $shipment->update([
            'payment_status' => $sync ? Shipment::PAYMENT_PAID : Shipment::PAYMENT_PENDING,
            'paid_at' => $sync ? now() : null,
        ]);

        if ($sync) {
            $shipment->statuses()->create([
                'status' => $shipment->status,
                'note' => __('تم تأكيد الدفع الأونلاين بقيمة :amount جنيه.', [
                    'amount' => number_format($shipment->price, 2),
                ]),
                'occurred_at' => now(),
            ]);
        }

        return response()->json([
            'message' => $sync ? __('تم تأكيد الدفع الأونلاين.') : __('تم تراجع حالة الدفع.'),
            'shipment' => $shipment->fresh(['driver', 'statuses']),
        ]);
    }

    private function providerLabel(?string $key): string
    {
        return match ($key) {
            'vodafone_cash' => 'فودافون كاش',
            'orange_cash' => 'أورنج كاش',
            'etisalat_cash' => 'اتصالات كاش',
            'we_pay' => 'وي باي',
            'instapay' => 'إنستا باي',
            default => 'المحفظة الإلكترونية',
        };
    }

    public function advance(Request $request, string $code): JsonResponse
    {
        if (! app()->environment('local')) {
            abort(404);
        }

        $shipment = $this->findUserShipment($request, $code);

        if (! $shipment) {
            return $this->notFound();
        }

        $flow = [
            Shipment::STATUS_PENDING => [Shipment::STATUS_ASSIGNED, __('تم تعيين السائق لشحنتك.')],
            Shipment::STATUS_ASSIGNED => [Shipment::STATUS_PICKED_UP, __('تم استلام الشحنة من المرسل.')],
            Shipment::STATUS_PICKED_UP => [Shipment::STATUS_IN_TRANSIT, __('الشحنة في الطريق إلى الوجهة.')],
            Shipment::STATUS_IN_TRANSIT => [Shipment::STATUS_DELIVERED, __('تم تسليم الشحنة بنجاح.')],
        ];

        if ($shipment->status === Shipment::STATUS_DELIVERED || ! isset($flow[$shipment->status])) {
            return response()->json(['message' => __('الشحنة وصلت بالفعل.'), 'shipment' => $shipment->load('driver', 'statuses')]);
        }

        [$next, $note] = $flow[$shipment->status];

        $updates = ['status' => $next];

        if ($next === Shipment::STATUS_ASSIGNED && ! $shipment->driver_id) {
            $updates['driver_id'] = Driver::where('status', 'available')->first()?->id;
        }

        if ($next === Shipment::STATUS_DELIVERED) {
            $updates['delivered_at'] = now();
            if ((int) $shipment->payment_method === 2) {
                $updates['payment_status'] = Shipment::PAYMENT_PAID;
                $updates['paid_at'] = now();
            }
            optional($shipment->driver)->update(['status' => 'available']);
        }

        $shipment->update($updates);

        // Refresh driver total_trips count after any delivery.
        if ($next === Shipment::STATUS_DELIVERED) {
            $this->refreshDriverTrips($shipment->driver_id);
        }

        // Move the assigned driver along the route so live location tracking
        // shows a realistic position at every stage.
        if ($shipment->driver_id) {
            $driver = Driver::find($shipment->driver_id);
            $position = $this->driverPositionAt($shipment, $next);
            if ($driver && $position !== null) {
                $driver->update($position);
            }
        }

        $shipment->statuses()->create([
            'status' => $next,
            'note' => $note,
            'occurred_at' => now(),
        ]);

        // Send push notification for every status transition.
        if ($shipment->user) {
            $pushService = app(\App\Services\PushNotificationService::class);
            $pushService->notifyShipmentUpdate(
                $shipment->user,
                $shipment->tracking_code,
                $next,
                $note
            );
        }

        return response()->json([
            'message' => $note,
            'shipment' => $shipment->load('driver', 'statuses'),
        ]);
    }

    /**
     * Simulated driver position while a shipment advances along its route.
     * Returns [lat, lng] interpolated between pickup and dropoff, or null
     * when there is no driver yet or no coordinates are available.
     *
     * @return array{lat: float, lng: float}|null
     */
    private function driverPositionAt(Shipment $shipment, string $status): ?array
    {
        if ($shipment->pickup_lat === null || $shipment->pickup_lng === null
            || $shipment->dropoff_lat === null || $shipment->dropoff_lng === null) {
            return null;
        }

        $fractions = [
            Shipment::STATUS_ASSIGNED => 0.0,
            Shipment::STATUS_PICKED_UP => 0.12,
            Shipment::STATUS_IN_TRANSIT => 0.55,
            Shipment::STATUS_DELIVERED => 1.0,
        ];

        $fraction = $fractions[$status] ?? null;
        if ($fraction === null) {
            return null;
        }

        return [
            'lat' => (float) round(
                $shipment->pickup_lat + ($shipment->dropoff_lat - $shipment->pickup_lat) * $fraction,
                6
            ),
            'lng' => (float) round(
                $shipment->pickup_lng + ($shipment->dropoff_lng - $shipment->pickup_lng) * $fraction,
                6
            ),
        ];
    }

    /**
     * Push a live driver location for a shipment. Dev-only for now, since the
     * driver client is not built yet; the tracking screens use this to show
     * the driver marker moving on the map.
     */
    public function updateDriverLocation(Request $request, string $code): JsonResponse
    {
        if (! app()->environment('local')) {
            abort(404);
        }

        $shipment = $this->findUserShipment($request, $code);

        if (! $shipment) {
            return $this->notFound();
        }

        if (! $shipment->driver_id) {
            return response()->json(['message' => __('لا يوجد سائق معيّن لهذه الشحنة.')], 422);
        }

        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $shipment->driver->update([
            'lat' => (float) $data['lat'],
            'lng' => (float) $data['lng'],
        ]);

        return response()->json([
            'message' => __('تم تحديث موقع السائق.'),
            'shipment' => $shipment->fresh(['driver', 'statuses']),
        ]);
    }

    private function findUserShipment(Request $request, string $code): ?Shipment
    {
        return $request->user()->shipments()
            ->with(['driver', 'statuses'])
            ->where('tracking_code', strtoupper($code))
            ->first();
    }

    private function notFound(): JsonResponse
    {
        return response()->json(['message' => __('لم يتم العثور على الشحنة.')], 404);
    }

    /**
     * Recalculate a driver's total_trips from the actual delivered shipments.
     * Idempotent — safe to call repeatedly after delivery.
     */
    private function refreshDriverTrips(?int $driverId): void
    {
        if (! $driverId) {
            return;
        }

        $deliveredCount = Shipment::where('driver_id', $driverId)
            ->where('status', Shipment::STATUS_DELIVERED)
            ->count();

        Driver::where('id', $driverId)->update(['total_trips' => $deliveredCount]);
    }
}
