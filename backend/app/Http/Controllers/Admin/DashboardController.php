<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use App\Services\Admin\AdminOrderService;
use App\Services\Admin\AdminProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    /** Doanh thu tính trên đơn không bị hủy/hoàn trả, theo ngày đặt (giờ app). */
    private const REVENUE_EXCLUDED = ['cancelled', 'returned'];

    public function __invoke(Request $request, AdminOrderService $orders): JsonResponse
    {
        $user = $request->user();
        // R6: trường doanh thu chỉ trả về khi có revenue.view (ẩn ở server, không chỉ ở giao diện)
        $canRevenue = $user->hasPermission('revenue.view');
        $today = Carbon::today();
        $from = $today->copy()->subDays(13);
        $revenue = Order::query()->whereNotIn('status', self::REVENUE_EXCLUDED);

        $daily = (clone $revenue)->where('created_at', '>=', $from)
            ->get(['created_at', 'total_amount'])
            ->groupBy(fn (Order $o) => $o->created_at->toDateString())
            ->map(fn ($g) => ['orders' => $g->count(), 'revenue' => (float) $g->sum('total_amount')]);
        $series = [];
        for ($d = $from->copy(); $d->lte($today); $d->addDay()) {
            $k = $d->toDateString();
            $series[] = ['date' => $k, 'orders' => $daily[$k]['orders'] ?? 0, 'revenue' => $daily[$k]['revenue'] ?? 0.0];
        }

        $lowStock = ProductVariant::query()->with('product:id,name')
            ->where('is_active', true)->whereHas('product')
            ->where('stock_quantity', '<=', AdminProductService::LOW_STOCK)
            ->orderBy('stock_quantity')->limit(10)->get();

        $stats = [
            'orders_total' => Order::count(),
            'orders_today' => Order::where('created_at', '>=', $today)->count(),
            'pending_orders' => Order::where('status', 'pending')->count(),
            'low_stock_variants' => ProductVariant::where('is_active', true)->whereHas('product')->where('stock_quantity', '<=', AdminProductService::LOW_STOCK)->count(),
            'hidden_reviews' => ProductReview::where('is_approved', false)->count(),
        ];
        if ($canRevenue) {
            $stats['revenue_today'] = (float) (clone $revenue)->where('created_at', '>=', $today)->sum('total_amount');
            $stats['revenue_14d'] = (float) array_sum(array_column($series, 'revenue'));
        } else {
            $series = array_map(fn ($r) => ['date' => $r['date'], 'orders' => $r['orders']], $series);
        }

        return response()->json(['success' => true, 'data' => [
            'stats' => $stats,
            'revenue_series' => $series,
            'recent_orders' => $user->hasPermission('orders.view')
                ? Order::withCount('items')->orderByDesc('id')->limit(8)->get()->map(fn ($o) => $orders->summary($o))->all() : [],
            'low_stock' => ! $user->hasPermission('products.view') ? [] : $lowStock->map(fn (ProductVariant $v) => [
                'variant_id' => $v->id, 'product_id' => $v->product_id, 'product_name' => $v->product?->name,
                'variant_name' => $v->name, 'sku' => $v->sku, 'stock_quantity' => (int) $v->stock_quantity,
            ])->all(),
        ]]);
    }
}
