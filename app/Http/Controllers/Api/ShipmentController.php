<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\Rating;
use App\Models\Shipment;
use App\Models\ShipmentStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
            'package_type' => ['required', 'in:small,medium,large'],
            'payment_method' => ['required', 'integer', 'in:1,2,3'],
            'scheduled_at' => ['nullable', 'date', 'after:now'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $shipment = $request->user()->shipments()->create([
            ...$data,
            'tracking_code' => Shipment::generateTrackingCode(),
            'status' => Shipment::STATUS_PENDING,
            'price' => Shipment::PRICES[$data['package_type']],
        ]);

        $shipment->statuses()->create([
            'status' => Shipment::STATUS_PENDING,
            'note' => __('تم إنشاء الطلب، بانتظار تعيين سائق.'),
            'occurred_at' => now(),
        ]);

        return response()->json([
            'message' => __('تم حجز الشحنة بنجاح.'),
            'shipment' => $shipment->load('statuses'),
        ], 201);
    }

    public function show(Request $request, string $code): JsonResponse
    {
        $shipment = $this->findUserShipment($request, $code);

        if (! $shipment) {
            return $this->notFound();
        }

        return response()->json([
            'shipment' => array_merge($shipment->toArray(), [
                'rating' => Rating::where('shipment_id', $shipment->id)->first(),
                'proof_photo_url' => $shipment->proof_photo_path ? url(Storage::url($shipment->proof_photo_path)) : null,
                'signature_url' => $shipment->signature_path ? url(Storage::url($shipment->signature_path)) : null,
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
            $shipment->save();

            $shipment->statuses()->create([
                'status' => Shipment::STATUS_DELIVERED,
                'note' => __('تم تسليم الشحنة بنجاح.'),
                'occurred_at' => now(),
            ]);

            optional($shipment->driver)->update(['status' => 'available']);
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
            optional($shipment->driver)->update(['status' => 'available']);
        }

        $shipment->update($updates);

        $shipment->statuses()->create([
            'status' => $next,
            'note' => $note,
            'occurred_at' => now(),
        ]);

        return response()->json([
            'message' => $note,
            'shipment' => $shipment->load('driver', 'statuses'),
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
}
