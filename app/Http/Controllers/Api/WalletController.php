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

        $transactions = WalletTransaction::where('wallet_id', $wallet->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json([
            'balance' => $wallet->balance,
            'transactions' => $transactions,
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
