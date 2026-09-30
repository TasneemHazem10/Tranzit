<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\PaymobService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(private PaymobService $paymob)
    {
    }

    /**
     * Initiate a Paymob payment session for wallet topup.
     * Returns the iframe URL the frontend should open in a WebView.
     */
    public function initiateTopup(Request $request): JsonResponse
    {
        if (! $this->paymob->isConfigured()) {
            return response()->json([
                'message' => 'Paymob is not configured on the server.',
            ], 501);
        }

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:10', 'max:100000'],
        ]);

        $amountCents = (int) ($validated['amount'] * 100);

        try {
            $token = $this->paymob->getAuthToken();
            $orderId = $this->paymob->createOrder($token, $amountCents, (string) $request->user()->id);
            $paymentKey = $this->paymob->createPaymentKey($token, $orderId, $amountCents, [
                'apartment' => 'NA',
                'email' => $request->user()->email ?? 'user@tranzet.app',
                'floor' => 'NA',
                'first_name' => $request->user()->name,
                'street' => 'NA',
                'building' => 'NA',
                'phone_number' => $request->user()->phone,
                'city' => 'Cairo',
                'country' => 'EG',
                'last_name' => '',
                'state' => 'Cairo',
            ]);

            $iframeUrl = $this->paymob->getIframeUrl($paymentKey);

            // Record the expected amount server-side so confirm/callback can
            // verify against it instead of trusting the client blindly.
            $wallet = Wallet::firstOrCreate(['user_id' => $request->user()->id]);
            WalletTransaction::updateOrCreate(
                ['reference' => 'paymob_order_' . $orderId],
                [
                    'wallet_id' => $wallet->id,
                    'type' => 'topup',
                    'amount' => $validated['amount'],
                    'description' => 'paymob_pending',
                ]
            );

            return response()->json([
                'iframe_url' => $iframeUrl,
                'order_id' => $orderId,
                'amount' => $validated['amount'],
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Paymob initiate failed: ' . $e->getMessage());

            return response()->json([
                'message' => 'Could not initiate payment. Please try again.',
            ], 502);
        }
    }

    /**
     * Paymob callback/webhook - called when payment completes.
     */
    public function callback(Request $request): JsonResponse
    {
        $data = $request->all();

        if (! $this->paymob->verifyCallback($data)) {
            return response()->json(['message' => 'Payment failed or was cancelled.'], 422);
        }

        // Paymob may send order as an array or a plain id.
        $order = $data['order'] ?? $data['order_id'] ?? null;
        $orderId = is_array($order) ? ($order['id'] ?? null) : $order;
        $amountCents = $data['amount_cents'] ?? 0;

        if ($orderId === null || $amountCents <= 0) {
            return response()->json(['message' => 'Invalid callback data.'], 422);
        }

        return $this->creditFromOrder((int) $orderId, round($amountCents / 100, 2), 'Paymob callback');
    }

    /**
     * Confirm a payment from the frontend after WebView closes.
     * The amount is cross-checked against a server-side pending record,
     * so a client cannot top up an arbitrary amount.
     */
    public function confirmPayment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:10', 'max:100000'],
            'order_id' => ['required', 'integer'],
        ]);

        $wallet = Wallet::firstOrCreate(['user_id' => $request->user()->id]);

        return $this->creditFromOrder(
            (int) $validated['order_id'],
            (float) $validated['amount'],
            'Paymob confirm',
            $wallet
        );
    }

    /**
     * Initiate a Paymob payment session for an online-paid shipment
     * (payment_method = 1). Returns the iframe URL the app opens in a WebView.
     */
    public function initiateShipmentPayment(Request $request, string $code): JsonResponse
    {
        if (! $this->paymob->isConfigured()) {
            return response()->json([
                'message' => 'Paymob is not configured on the server.',
            ], 501);
        }

        $shipment = $request->user()->shipments()->where('tracking_code', $code)->first();

        if (! $shipment) {
            return response()->json(['message' => __('الشحنة غير موجودة.')], 404);
        }

        if ((int) $shipment->payment_method !== 1) {
            return response()->json([
                'message' => __('هذه الشحنة لا تستخدم الدفع الأونلاين.'),
            ], 422);
        }

        if ($shipment->payment_status === Shipment::PAYMENT_PAID) {
            return response()->json([
                'message' => __('تم دفع هذه الشحنة بالفعل.'),
                'shipment' => $shipment->fresh(['driver', 'statuses']),
            ], 422);
        }

        $price = (float) $shipment->price;

        if ($price <= 0) {
            return response()->json([
                'message' => __('لا يوجد سعر محدد لهذه الشحنة بعد.'),
            ], 422);
        }

        $amountCents = (int) round($price * 100);

        try {
            $token = $this->paymob->getAuthToken();
            $orderId = $this->paymob->createOrder($token, $amountCents, 'shipment_' . $shipment->tracking_code);
            $paymentKey = $this->paymob->createPaymentKey($token, $orderId, $amountCents, [
                'apartment' => 'NA',
                'email' => $request->user()->email ?? 'user@tranzet.app',
                'floor' => 'NA',
                'first_name' => $request->user()->name,
                'street' => 'NA',
                'building' => 'NA',
                'phone_number' => $request->user()->phone,
                'city' => 'Cairo',
                'country' => 'EG',
                'last_name' => '',
                'state' => 'Cairo',
            ]);

            $iframeUrl = $this->paymob->getIframeUrl($paymentKey);

            // Keep a single pending marker per wallet so confirmShipmentPayment
            // can verify the paid amount against the server-recorded price.
            $wallet = Wallet::firstOrCreate(['user_id' => $request->user()->id]);

            WalletTransaction::where('wallet_id', $wallet->id)
                ->where('description', 'paymob_shipment_pending')
                ->delete();

            WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'type' => 'payment',
                'amount' => $price,
                'description' => 'paymob_shipment_pending',
                'reference' => 'paymob_shipment_' . $orderId,
            ]);

            return response()->json([
                'iframe_url' => $iframeUrl,
                'order_id' => $orderId,
                'amount' => $price,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Paymob shipment initiate failed: ' . $e->getMessage());

            return response()->json([
                'message' => 'Could not initiate payment. Please try again.',
            ], 502);
        }
    }

    /**
     * Confirm a shipment payment after the Paymob iframe/WebView closes.
     * Amount + order id are cross-checked against the recorded pending
     * transaction and the shipment price.
     */
    public function confirmShipmentPayment(Request $request, string $code): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'order_id' => ['required', 'integer'],
        ]);

        $shipment = $request->user()->shipments()->where('tracking_code', $code)->first();

        if (! $shipment) {
            return response()->json(['message' => __('الشحنة غير موجودة.')], 404);
        }

        if ((int) $shipment->payment_method !== 1) {
            return response()->json([
                'message' => __('هذه الشحنة لا تستخدم الدفع الأونلاين.'),
            ], 422);
        }

        if ($shipment->payment_status === Shipment::PAYMENT_PAID) {
            return response()->json([
                'message' => __('تم دفع هذه الشحنة بالفعل.'),
                'shipment' => $shipment->fresh(['driver', 'statuses']),
            ]);
        }

        $wallet = Wallet::firstOrCreate(['user_id' => $request->user()->id]);

        $pending = WalletTransaction::where('reference', 'paymob_shipment_' . $validated['order_id'])
            ->where('wallet_id', $wallet->id)
            ->where('description', 'paymob_shipment_pending')
            ->first();

        $amount = (float) $validated['amount'];

        if (! $pending
            || abs((float) $pending->amount - $amount) > 0.01
            || abs((float) $shipment->price - $amount) > 0.01) {
            return response()->json([
                'message' => 'لم يتم العثور على طلب دفع مطابق. أعد محاولة الدفع.',
            ], 422);
        }

        $shipment->update([
            'payment_status' => Shipment::PAYMENT_PAID,
            'paid_at' => now(),
        ]);

        $shipment->statuses()->create([
            'status' => $shipment->status,
            'note' => __('تم تأكيد الدفع الأونلاين بقيمة :amount جنيه.', [
                'amount' => number_format($amount, 2),
            ]),
            'occurred_at' => now(),
        ]);

        $pending->update([
            'description' => 'دفع شحنة ' . $shipment->tracking_code . ' أونلاين',
        ]);

        return response()->json([
            'message' => __('تم تأكيد الدفع الأونلاين.'),
            'shipment' => $shipment->fresh(['driver', 'statuses']),
        ]);
    }

    /**
     * Credit the wallet for a Paymob order after verifying a recorded
     * pending transaction with a matching reference.
     */
    private function creditFromOrder(
        int $orderId,
        float $amount,
        string $source,
        ?Wallet $wallet = null
    ): JsonResponse {
        $pending = WalletTransaction::where('reference', 'paymob_order_' . $orderId)
            ->where('description', 'paymob_pending')
            ->with('wallet')
            ->first();

        if ($wallet && $pending && $pending->wallet_id !== $wallet->id) {
            $pending = null;
        }

        if (! $pending || ((float) $pending->amount) !== $amount) {
            return response()->json([
                'message' => 'لم يتم العثور على طلب دفع مطابق. أعد محاولة الدفع.',
            ], 422);
        }

        $pending->wallet->increment('balance', $amount);

        $pending->update(['description' => 'إضافة رصيد عبر Paymob (' . $source . ')']);

        return response()->json([
            'message' => 'تم إضافة الرصيد بنجاح.',
            'balance' => $pending->wallet->fresh()->balance,
            'transaction' => $pending->fresh(),
        ]);
    }
}
