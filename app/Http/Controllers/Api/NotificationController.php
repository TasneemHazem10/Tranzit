<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = UserNotification::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return response()->json(['notifications' => $notifications]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = UserNotification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->count();

        return response()->json(['count' => $count]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        UserNotification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'تم التحديد كمقروء']);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        UserNotification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'تم التحديد الكل كمقروء']);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $deleted = UserNotification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->delete();

        if (! $deleted) {
            return response()->json(['message' => 'الإشعار غير موجود.'], 404);
        }

        return response()->json(['message' => 'تم حذف الإشعار.']);
    }
}
