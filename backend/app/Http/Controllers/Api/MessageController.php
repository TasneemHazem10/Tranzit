<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MessageController extends Controller
{
    public function index(Request $request, string $driverId): JsonResponse
    {
        $user = $request->user();

        $messages = Message::where('user_id', $user->id)
            ->where('driver_id', $driverId)
            ->orderBy('id')
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

    /**
     * Stream new messages for the authenticated user + driver as Server-Sent
     * Events. The client reconnects after each stream closes, passing ?after=
     * with the last message id it already has.
     */
    public function stream(Request $request, string $driverId): StreamedResponse
    {
        $user = $request->user();
        $after = max(0, (int) $request->query('after', 0));
        $iterations = max(1, (int) config('app.chat_stream_iterations', 50));

        ignore_user_abort(true);
        set_time_limit(0);

        $emit = static function (Message $message): void {
            $payload = $message->toArray();
            if ($message->is_from_driver) {
                $payload['read_at'] = now()->toISOString();
            }
            echo 'id: '.$message->id."\n";
            echo 'event: message'."\n";
            echo 'data: '.json_encode($payload, JSON_UNESCAPED_UNICODE)."\n\n";
            flush();
        };

        return response()->stream(function () use ($user, $driverId, $after, $iterations, $emit): void {
            $lastId = $after;

            for ($i = 0; $i < $iterations; $i++) {
                $messages = Message::where('user_id', $user->id)
                    ->where('driver_id', $driverId)
                    ->where('id', '>', $lastId)
                    ->orderBy('id')
                    ->get();

                if ($messages->isNotEmpty()) {
                    $incomingIds = $messages
                        ->where('is_from_driver', true)
                        ->pluck('id');

                    if ($incomingIds->isNotEmpty()) {
                        Message::where('user_id', $user->id)
                            ->where('driver_id', $driverId)
                            ->whereIn('id', $incomingIds)
                            ->whereNull('read_at')
                            ->update(['read_at' => now()]);
                    }

                    foreach ($messages as $message) {
                        $lastId = $message->id;
                        $emit($message);
                    }
                } else {
                    echo ": keep-alive\n\n";
                    flush();
                }

                if (connection_aborted()) {
                    break;
                }

                sleep(1);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, must-revalidate',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}