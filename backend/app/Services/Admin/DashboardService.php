<?php

namespace App\Services\Admin;

use App\Models\Coupon;
use App\Models\Order;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * R8: số liệu bảng điều khiển theo khoảng ngày + so với kỳ trước liền kề.
 * - Doanh thu = tổng total_amount của đơn không hủy/hoàn trả, theo ngày đặt (múi giờ shop.report_timezone).
 * - Mỗi khối chỉ được tính & trả về khi user có quyền tương ứng (ẩn ở server).
 * - Cache theo (khoảng ngày, tập quyền liên quan, phiên bản dữ liệu); phiên bản tăng khi đơn/biến thể/đánh giá/mã thay đổi.
 */
class DashboardService
{
    public const RANGES = ['today' => 1, '7d' => 7, '14d' => 14, '30d' => 30];

    public const DEFAULT_RANGE = '14d';

    public const REVENUE_EXCLUDED = ['cancelled', 'returned'];

    public const VERSION_KEY = 'dashboard:version';

    /** Quyền ảnh hưởng tới nội dung bảng điều khiển. */
    private const SCOPES = ['revenue.view', 'orders.view', 'products.view', 'reviews.view', 'coupons.view'];

    public static function bump(): void
    {
        Cache::forever(self::VERSION_KEY, (int) Cache::get(self::VERSION_KEY, 0) + 1);
    }

    public function forUser(User $user, string $range): array
    {
        $flags = array_values(array_filter(self::SCOPES, fn ($p) => $user->hasPermission($p)));
        $tz = (string) config('shop.report_timezone', 'UTC');
        $key = sprintf('dashboard:%d:%s:%s:%s:%s', (int) Cache::get(self::VERSION_KEY, 0), $range, implode(',', $flags), $tz, Carbon::now($tz)->format('YmdHi'));
        $ttl = max(1, (int) config('shop.dashboard_cache_ttl', 60));

        return Cache::remember($key, $ttl, fn () => $this->build($range, array_flip($flags), $tz));
    }

    /** @param array<string,int> $can */
    public function build(string $range, array $can, string $tz): array
    {
        $days = self::RANGES[$range] ?? self::RANGES[self::DEFAULT_RANGE];
        $now = Carbon::now($tz);
        $from = $now->copy()->startOfDay()->subDays($days - 1);
        $prevFrom = $from->copy()->subDays($days);
        $prevTo = $now->copy()->subDays($days); // cùng thời điểm trong ngày của kỳ trước → so sánh công bằng
        $utc = fn (Carbon $c) => $c->copy()->utc();

        $revenue = isset($can['revenue.view']);
        $orders = isset($can['orders.view']);
        $products = isset($can['products.view']);

        $out = [
            'range' => ['key' => $range, 'days' => $days, 'from' => $from->toDateString(), 'to' => $now->toDateString(),
                'previous_from' => $prevFrom->toDateString(), 'previous_to' => $prevTo->toDateString(), 'timezone' => $tz],
            'kpis' => [],
            'stats' => [],
            'todo' => [],
            // Khối không có quyền vẫn có khóa nhưng rỗng (client dễ xử lý).
            'recent_orders' => [],
            'low_stock' => [],
            'top_products' => [],
            'status_breakdown' => (object) [],
        ];

        // KPI kỳ này & kỳ trước: 1 truy vấn tổng hợp mỗi kỳ.
        $agg = function (Carbon $a, Carbon $b) use ($utc) {
            $ex = "'".implode("','", self::REVENUE_EXCLUDED)."'";
            $r = DB::table('orders')->whereBetween('created_at', [$utc($a), $utc($b)])
                ->selectRaw("COUNT(*) AS orders, SUM(CASE WHEN status NOT IN ($ex) THEN 1 ELSE 0 END) AS valid, COALESCE(SUM(CASE WHEN status NOT IN ($ex) THEN total_amount ELSE 0 END), 0) AS revenue")
                ->first();

            return ['orders' => (int) $r->orders, 'valid' => (int) $r->valid, 'revenue' => round((float) $r->revenue, 2)];
        };
        $cur = $agg($from, $now);
        $prev = $agg($prevFrom, $prevTo);
        $pair = fn ($c, $p) => ['current' => $c, 'previous' => $p, 'change_pct' => self::changePct($c, $p)];

        $out['kpis']['orders'] = $pair($cur['orders'], $prev['orders']);
        if ($revenue) {
            $aov = fn ($x) => $x['valid'] > 0 ? round($x['revenue'] / $x['valid'], 0) : 0;
            $out['kpis']['revenue'] = $pair($cur['revenue'], $prev['revenue']);
            $out['kpis']['avg_order_value'] = $pair($aov($cur), $aov($prev));
        }

        // Chuỗi theo giờ (hôm nay) hoặc theo ngày: lấy cột nhẹ rồi chia theo múi giờ shop.
        $rows = DB::table('orders')->whereBetween('created_at', [$utc($from), $utc($now)])->get(['created_at', 'total_amount', 'status']);
        $hourly = $days === 1;
        $buckets = [];
        if ($hourly) {
            for ($h = 0; $h <= (int) $now->format('G'); $h++) {
                $buckets[sprintf('%02d:00', $h)] = ['orders' => 0, 'revenue' => 0.0];
            }
        } else {
            for ($d = $from->copy(); $d->lte($now); $d->addDay()) {
                $buckets[$d->toDateString()] = ['orders' => 0, 'revenue' => 0.0];
            }
        }
        $statusCounts = [];
        foreach ($rows as $row) {
            $t = Carbon::parse($row->created_at, 'UTC')->setTimezone($tz);
            $k = $hourly ? $t->format('H').':00' : $t->toDateString();
            $statusCounts[$row->status] = ($statusCounts[$row->status] ?? 0) + 1;
            if (! isset($buckets[$k]) || in_array($row->status, self::REVENUE_EXCLUDED, true)) {
                continue;
            }
            $buckets[$k]['orders']++;
            $buckets[$k]['revenue'] += (float) $row->total_amount;
        }
        $out['granularity'] = $hourly ? 'hour' : 'day';
        $out['revenue_series'] = array_map(fn ($k, $v) => $revenue
            ? ['date' => $k, 'orders' => $v['orders'], 'revenue' => round($v['revenue'], 2)]
            : ['date' => $k, 'orders' => $v['orders']], array_keys($buckets), $buckets);

        if ($orders) {
            $pending = Order::where('status', 'pending')->count();
            $out['kpis']['pending_orders'] = $pending;
            $out['todo']['pending_orders'] = $pending;
            $out['status_breakdown'] = (object) $statusCounts;
            $out['stats'] += [
                'orders_total' => Order::count(),
                'orders_today' => Order::where('created_at', '>=', $utc($now->copy()->startOfDay()))->count(),
                'pending_orders' => $pending,
            ];
            $out['recent_orders'] = Order::withCount('items')->orderByDesc('id')->limit(5)->get()
                ->map(fn ($o) => app(AdminOrderService::class)->summary($o))->all();
        }

        if ($products) {
            $lowQ = fn () => ProductVariant::query()->where('is_active', true)->whereHas('product')->where('stock_quantity', '<=', AdminProductService::LOW_STOCK);
            $lowCount = $lowQ()->count();
            $out['kpis']['low_stock_variants'] = $lowCount;
            $out['todo']['low_stock_variants'] = $lowCount;
            $out['stats']['low_stock_variants'] = $lowCount;
            $out['low_stock'] = $lowQ()->with('product:id,name')->orderBy('stock_quantity')->limit(8)->get()->map(fn (ProductVariant $v) => [
                'variant_id' => $v->id, 'product_id' => $v->product_id, 'product_name' => $v->product?->name,
                'variant_name' => $v->name, 'sku' => $v->sku, 'stock_quantity' => (int) $v->stock_quantity,
            ])->all();

            // Top bán chạy trong kỳ (đơn hợp lệ), 1 truy vấn GROUP BY.
            $top = DB::table('order_items')->join('orders', 'orders.id', '=', 'order_items.order_id')
                ->whereBetween('orders.created_at', [$utc($from), $utc($now)])
                ->whereNotIn('orders.status', self::REVENUE_EXCLUDED)
                ->groupBy('order_items.product_id')
                ->selectRaw('order_items.product_id, MAX(order_items.product_name) AS name, SUM(order_items.quantity) AS quantity, SUM(order_items.line_total) AS revenue')
                ->orderByDesc('quantity')->orderByDesc('revenue')->limit(5)->get();
            $out['top_products'] = $top->map(function ($r) use ($revenue) {
                $row = ['product_id' => $r->product_id ? (int) $r->product_id : null, 'name' => $r->name, 'quantity' => (int) $r->quantity];
                if ($revenue) {
                    $row['revenue'] = round((float) $r->revenue, 2);
                }

                return $row;
            })->all();
        }

        if (isset($can['reviews.view'])) {
            $hidden = ProductReview::where('is_approved', false)->count();
            $out['todo']['hidden_reviews'] = $hidden;
            $out['stats']['hidden_reviews'] = $hidden;
        }

        if (isset($can['coupons.view'])) {
            $out['todo']['expiring_coupons'] = Coupon::where('is_active', true)
                ->whereNotNull('expires_at')->whereBetween('expires_at', [Carbon::now(), Carbon::now()->addDays(7)])->count();
        }

        if ($revenue) {
            $out['stats']['revenue_today'] = (float) Order::whereNotIn('status', self::REVENUE_EXCLUDED)
                ->where('created_at', '>=', $utc($now->copy()->startOfDay()))->sum('total_amount');
            $out['stats']['revenue_range'] = $cur['revenue'];
        }

        return $out;
    }

    /** % thay đổi so kỳ trước; null khi kỳ trước = 0 (không chia được). */
    public static function changePct(float|int $current, float|int $previous): ?float
    {
        if ((float) $previous === 0.0) {
            return null;
        }

        return round(($current - $previous) / $previous * 100, 1);
    }
}
