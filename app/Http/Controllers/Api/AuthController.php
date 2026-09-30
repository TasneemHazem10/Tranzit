<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OtpCode;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    public function __construct(private OtpService $otp)
    {
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'min:3'],
            'phone' => ['required', 'string', 'regex:/^[0-9+\s-]{8,15}$/', 'unique:users,phone'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $user = User::create($data);

        $otp = $this->otp->send($user->phone, OtpCode::PURPOSE_REGISTER);

        return response()->json([
            'message' => __('تم إنشاء الحساب، أدخل كود التحقق المرسل إليك.'),
            'needs_otp' => true,
            'phone' => $user->phone,
            'debug_code' => config('app.otp_debug') ? $otp->code : null,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'phone' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('phone', $credentials['phone'])->first();

        if (! $user || ! password_verify($credentials['password'], $user->password)) {
            return response()->json([
                'message' => __('رقم الهاتف أو كلمة المرور غير صحيحة.'),
                'errors' => ['phone' => [__('رقم الهاتف أو كلمة المرور غير صحيحة.')]],
            ], 422);
        }

        $otp = $this->otp->send($user->phone, OtpCode::PURPOSE_LOGIN);

        return response()->json([
            'message' => __('تم إرسال كود التحقق إلى رقمك.'),
            'needs_otp' => true,
            'phone' => $user->phone,
            'debug_code' => config('app.otp_debug') ? $otp->code : null,
        ]);
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string'],
            'code' => ['required', 'digits:4'],
            'purpose' => ['required', 'in:login,register,reset'],
        ]);

        if (! $this->otp->verify($data['phone'], $data['purpose'], $data['code'])) {
            return response()->json([
                'message' => __('الكود غير صحيح أو منتهي الصلاحية.'),
                'errors' => ['code' => [__('الكود غير صحيح أو منتهي الصلاحية.')]],
            ], 422);
        }

        $user = User::where('phone', $data['phone'])->firstOrFail();
        $user->forceFill(['phone_verified_at' => now()])->save();

        return $this->tokenResponse($user, __('تم التحقق بنجاح.'));
    }

    public function resendOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string'],
            'purpose' => ['required', 'in:login,register,reset'],
        ]);

        if ($data['purpose'] !== OtpCode::PURPOSE_RESET && ! User::where('phone', $data['phone'])->exists()) {
            return response()->json(['message' => __('رقم الهاتف غير مسجل.')], 404);
        }

        $otp = $this->otp->send($data['phone'], $data['purpose']);

        return response()->json([
            'message' => __('تم إعادة إرسال الكود.'),
            'debug_code' => config('app.otp_debug') ? $otp->code : null,
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string'],
        ]);

        $user = User::where('phone', $data['phone'])->first();

        if (! $user) {
            return response()->json([
                'message' => __('لا يوجد حساب بهذا الرقم.'),
                'errors' => ['phone' => [__('لا يوجد حساب بهذا الرقم.')]],
            ], 422);
        }

        $otp = $this->otp->send($user->phone, OtpCode::PURPOSE_RESET);

        return response()->json([
            'message' => __('تم إرسال كود التحقق.'),
            'needs_otp' => true,
            'phone' => $user->phone,
            'debug_code' => config('app.otp_debug') ? $otp->code : null,
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string'],
            'code' => ['required', 'digits:4'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        if (! $this->otp->verify($data['phone'], OtpCode::PURPOSE_RESET, $data['code'])) {
            return response()->json([
                'message' => __('الكود غير صحيح أو منتهي الصلاحية.'),
                'errors' => ['code' => [__('الكود غير صحيح أو منتهي الصلاحية.')]],
            ], 422);
        }

        $user = User::where('phone', $data['phone'])->firstOrFail();
        $user->forceFill(['password' => $data['password']])->save();

        return response()->json(['message' => __('تم تغيير كلمة المرور، سجل دخولك الآن.')]);
    }

    public function googleLogin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id_token' => ['required', 'string'],
        ]);

        $clientId = config('services.google.client_id');

        if (empty($clientId)) {
            return response()->json([
                'message' => __('تسجيل جوجل غير مُعد على السيرفر بعد. أضف GOOGLE_CLIENT_ID في .env'),
            ], 501);
        }

        try {
            $response = Http::timeout(10)->get('https://oauth2.googleapis.com/tokeninfo', [
                'id_token' => $data['id_token'],
            ]);
        } catch (\Throwable $e) {
            Log::error('Google tokeninfo failed: '.$e->getMessage());

            return response()->json(['message' => __('تعذر التحقق من جوجل، حاول مرة أخرى.')], 502);
        }

        if ($response->failed() || ($response->json('aud') ?? null) !== $clientId) {
            return response()->json(['message' => __('توكن جوجل غير صالح.')], 401);
        }

        $googleId = $response->json('sub');
        $email = $response->json('email');
        $name = $response->json('name') ?? __('مستخدم ترانزيت');

        $user = User::where('google_id', $googleId)
            ->orWhere(fn ($q) => $email ? $q->where('email', $email) : $q->whereRaw('1=0'))
            ->first();

        if (! $user) {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'google_id' => $googleId,
                'phone' => 'G'.substr((string) $googleId, -9),
                'password' => bin2hex(random_bytes(16)),
            ]);
            $user->forceFill(['phone_verified_at' => now()])->save();
        }

        return $this->tokenResponse($user, __('تم تسجيل الدخول بجوجل.'));
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => __('تم تسجيل الخروج.')]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'min:3', 'max:255'],
            'email' => ['sometimes', 'nullable', 'string', 'email', 'max:255', 'unique:users,email,' . $request->user()->id],
        ]);

        $request->user()->update($data);

        return response()->json([
            'message' => __('تم تحديث الملف الشخصي.'),
            'user' => $request->user()->fresh(),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        if (! password_verify($data['current_password'], $request->user()->password)) {
            return response()->json([
                'message' => __('كلمة المرور الحالية غير صحيحة.'),
            ], 422);
        }

        $request->user()->forceFill(['password' => $data['password']])->save();

        return response()->json(['message' => __('تم تغيير كلمة المرور بنجاح.')]);
    }

    public function updatePushToken(Request $request): JsonResponse
    {
        $data = $request->validate([
            'push_token' => ['required', 'string'],
        ]);

        $request->user()->update(['push_token' => $data['push_token']]);

        return response()->json(['message' => 'Push token updated.']);
    }

    private function tokenResponse(User $user, string $message): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'token' => $user->createToken('mobile')->plainTextToken,
            'user' => $user,
        ]);
    }
}
