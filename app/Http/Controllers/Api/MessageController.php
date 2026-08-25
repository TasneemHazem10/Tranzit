<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index(Request $request, string $driverId): JsonResponse
    {
        $user = $request->user();

        $messages = Message::where('user_id', $user->id)
            ->where('driver_id', $driverId)
            ->orderBy('created_at')
            ->get();

        Message::where('user_id', $user->id)
            ->where('driver_id', $driverId)
            ->where('is_from_driver', true)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['messages' => $messages]);
    }

    public function store(Request $request, string $driverId): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
            'shipment_id' => ['nullable', 'integer', 'exists:shipments,id'],
        ]);

        $message = Message::create([
            'user_id' => $user->id,
            'driver_id' => $driverId,
            'shipment_id' => $validated['shipment_id'] ?? null,
            'body' => $validated['body'],
            'is_from_driver' => false,
        ]);

        return response()->json(['message' => $message], 201);
    }
}
