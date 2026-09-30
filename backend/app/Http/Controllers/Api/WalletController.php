<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $wallet = Wallet::firstOrCreate(['user_id' => $request->user()->id]);

        $perPage = min(50, max(5, (int) $request->query('per_page', 30)));
        $page = max(1, (int) $request->query('page', 1));

        $query = WalletTransaction::where('wallet_id', $wallet->id)
            ->where('description', '!=', 'paymob_shipment_pending')
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        $total = (clone $query)->count();
        $transactions = (clone $query)->forPage($page, $perPage)->get();

        return response()->json([
            'balance' => $wallet->balance,
            'transactions' => $transactions,
            'page' => $page,
            'has_more' => ($page * $perPage) < $total,
        ]);
    }

    public function topup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1', 'max:100000'],
        ]);

        $wallet = Wallet::firstOrCreate(['user_id' => $request->user()->id]);

        $wallet->increment('balance', $validated['amount']);

        $transaction = WalletTransaction::create([
            'wallet_id' => $wallet->id,
            'type' => 'topup',
            'amount' => $validated['amount'],
            'description' => 'إضافة رصيد',
        ]);

        return response()->json([
            'message' => 'تم إضافة الرصيد بنجاح',
            'balance' => $wallet->fresh()->balance,
            'transaction' => $transaction,
        ]);
    }
}
