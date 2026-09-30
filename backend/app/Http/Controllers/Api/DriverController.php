<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\DriverOffer;
use App\Models\Shipment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class DriverController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $driver = Driver::where('phone', $validated['phone'])->first();

        if ($driver === null
            || $driver->password === null
            || ! Hash::check($validated['password'], $driver->password)) {
            return response()->json(['message' => 'بيانات الدخول غير صحيحة.'], 422);
        }

        $token = $driver->createToken('driver-app')->plainTextToken;

        return response()->json([
            'message' => 'تم تسجيل الدخول بنجاح.',
            'token' => $token,
            'driver' => $driver,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'تم تسجيل الخروج.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['driver' => $request->user()]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        /** @var Driver $driver */
        $driver = $request->user();

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255', 'min:3'],
            'phone' => ['sometimes', 'string', 'regex:/^[0-9+\s-]{8,15}$/', Rule::unique('drivers', 'phone')->ignore($driver->id)],
            'national_id' => ['sometimes', 'string', 'digits_between:10,20', Rule::unique('drivers', 'national_id')->ignore($driver->id)],
            'status' => ['sometimes', Rule::in(['available', 'busy', 'offline'])],
            'lat' => ['sometimes', 'numeric', 'between:-90,90'],
            'lng' => ['sometimes', 'numeric', 'between:-180,180'],
            'vehicle_type' => ['sometimes', 'string', 'max:255'],
            'vehicle_model' => ['sometimes', 'string', 'max:255'],
            'vehicle_year' => ['sometimes', 'string', 'digits:4'],
            'vehicle_plate' => ['sometimes', 'string', 'max:20'],
            'vehicle_capacity' => ['sometimes', 'string', 'max:50'],
        ]);

        $driver->update($validated);

        return response()->json([
            'message' => 'تم تحديث البيانات بنجاح.',
            'driver' => $driver->fresh(),
        ]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        /** @var Driver $driver */
        $driver = $request->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (! Hash::check($validated['current_password'], $driver->password)) {
            return response()->json(['message' => 'كلمة المرور الحالية غير صحيحة.'], 422);
        }

        $driver->update(['password' => $validated['password']]);

        return response()->json(['message' => 'تم تغيير كلمة المرور بنجاح.']);
    }

    public function updatePushToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'push_token' => ['required', 'string', 'max:255'],
        ]);

        $request->user()->update(['push_token' => $validated['push_token']]);

        return response()->json(['message' => 'تم تحديث رمز الإشعارات.']);
    }

    /**
     * Shipments waiting for a driver to accept/pick up.
     */
    public function availableShipments(Request $request): JsonResponse
    {
        /** @var Driver $driver */
        $driver = $request->user();

        $items = Shipment::where('status', Shipment::STATUS_PENDING)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn (Shipment $shipment) => $this->toDriverShipment($shipment, $driver));

        return response()->json(['shipments' => $items]);
    }

    /**
     * Shipments the driver is currently handling or has finished.
     */
    public function jobs(Request $request): JsonResponse
    {
        /** @var Driver $driver */
        $driver = $request->user();

        $items = $driver->shipments()
            ->with(['user:id,name,phone', 'statuses'])
            ->orderByDesc('updated_at')
            ->limit(50)
            ->get()
            ->map(fn (Shipment $shipment) => $this->toDriverShipment($shipment, $driver, true));

        return response()->json(['jobs' => $items]);
    }

    /**
     * A driver quotes a price for a pending shipment.
     */
    public function createOffer(Request $request, string $code): JsonResponse
    {
        /** @var Driver $driver */
        $driver = $request->user();

        $shipment = Shipment::where('tracking_code', $code)->firstOrFail();

        if ($shipment->status !== Shipment::STATUS_PENDING) {
            return response()->json(['message' => 'هذه الشحنة لم تعد متاحة.'], 422);
        }

        $hasPendingOffer = DriverOffer::where('shipment_id', $shipment->id)
            ->where('driver_id', $driver->id)
            ->where('status', DriverOffer::STATUS_PENDING)
            ->exists();

        if ($hasPendingOffer) {
            return response()->json(['message' => 'لديك عرض مسبق على هذه الشحنة.'], 422);
        }

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1', 'max:1000000'],
        ]);

        $offer = DriverOffer::create([
            'shipment_id' => $shipment->id,
            'driver_id' => $driver->id,
            'amount' => $validated['amount'],
            'status' => DriverOffer::STATUS_PENDING,
        ]);

        return response()->json([
            'message' => 'تم إرسال عرضك بنجاح.',
            'offer' => $offer->load('shipment'),
        ], 201);
    }

    /**
     * Earnings / performance summary for the driver.
     */
    public function earnings(Request $request): JsonResponse
    {
        /** @var Driver $driver */
        $driver = $request->user();

        $delivered = $driver->shipments()
            ->where('status', Shipment::STATUS_DELIVERED)
            ->get();

        $active = $driver->shipments()
            ->whereIn('status', [
                Shipment::STATUS_ASSIGNED,
                Shipment::STATUS_PICKED_UP,
                Shipment::STATUS_IN_TRANSIT,
            ])
            ->count();

        return response()->json([
            'total_trips' => (int) $driver->total_trips,
            'completed_deliveries' => $delivered->count(),
            'earned' => round($delivered->sum('price'), 2),
            'active_jobs' => $active,
            'rating_avg' => (float) $driver->rating_avg,
        ]);
    }

    private function toDriverShipment(Shipment $shipment, Driver $driver, bool $includeStatuses = false): array
    {
        $hasOffer = $shipment->offers()
            ->where('driver_id', $driver->id)
            ->where('status', DriverOffer::STATUS_PENDING)
            ->exists();

        $distanceFromDriver = null;
        if ($driver->lat !== null && $driver->lng !== null
            && $shipment->pickup_lat !== null && $shipment->pickup_lng !== null) {
            $distanceFromDriver = round(Shipment::distanceBetween(
                $driver->lat,
                $driver->lng,
                $shipment->pickup_lat,
                $shipment->pickup_lng
            ), 1);
        }

        $data = [
            'id' => $shipment->id,
            'tracking_code' => $shipment->tracking_code,
            'status' => $shipment->status,
            'payment_method' => $shipment->payment_method,
            'price' => (float) $shipment->price,
            'estimate_fare' => round($shipment->estimateFare(), 2),
            'distance_km' => $shipment->distance_km,
            'distance_from_driver_km' => $distanceFromDriver,
            'driver_has_offer' => $hasOffer,
            'vehicle_type' => $shipment->vehicle_type,
            'package_type' => $shipment->package_type,
            'weight_kg' => $shipment->weight_kg,
            'pickup_address' => $shipment->pickup_address,
            'pickup_lat' => $shipment->pickup_lat,
            'pickup_lng' => $shipment->pickup_lng,
            'dropoff_address' => $shipment->dropoff_address,
            'dropoff_lat' => $shipment->dropoff_lat,
            'dropoff_lng' => $shipment->dropoff_lng,
            'scheduled_at' => $shipment->scheduled_at?->toISOString(),
            'created_at' => $shipment->created_at?->toISOString(),
            'notes' => $shipment->notes,
        ];

        if ($includeStatuses) {
            $data['user'] = $shipment->user
                ? ['id' => $shipment->user->id, 'name' => $shipment->user->name, 'phone' => $shipment->user->phone]
                : null;
            $data['statuses'] = $shipment->statuses->map(fn ($status) => [
                'status' => $status->status,
                'note' => $status->note,
                'occurred_at' => $status->occurred_at?->toISOString(),
            ]);
        }

        return $data;
    }
}