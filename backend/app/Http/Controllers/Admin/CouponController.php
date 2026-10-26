<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CouponRequest;
use App\Models\Coupon;
use App\Models\Order;
use App\Services\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use App\Http\Requests\Admin\ListAdminCouponsRequest;
use App\Support\AdminSort;

class CouponController extends Controller
{
    private const FIELDS = ['code', 'type', 'value', 'min_order_amount', 'max_discount_amount', 'usage_limit', 'per_customer_limit', 'starts_at', 'expires_at', 'is_active'];

    private const SORTABLE = ['id', 'code', 'value', 'used_count', 'expires_at', 'is_active'];

    public function __construct(private AuditLogger $audit) {}

    public function index(ListAdminCouponsRequest $request): JsonResponse
    {
        $f = $request->validated();
        $q = trim((string) ($f['q'] ?? ''));
        $query = Coupon::query()
            ->when($q !== '', fn ($w) => $w->where('code', 'like', '%'.addcslashes($q, '%_\\').'%'));
        $page = AdminSort::apply($query, $f, array_combine(self::SORTABLE, self::SORTABLE))->paginate(20);

        return $this->paginated($page, fn (Coupon $c) => $this->present($c));
    }

    public function store(CouponRequest $request): JsonResponse
    {
        $coupon = Coupon::create($this->fields($request->validated()));
        $this->audit->record('coupon.created', $coupon, ['code' => $coupon->code]);

        return response()->json(['success' => true, 'message' => 'Đã tạo mã giảm giá.', 'data' => $this->present($coupon->refresh())], 201);
    }

    public function update(CouponRequest $request, Coupon $coupon): JsonResponse
    {
        $before = $this->present($coupon);
        $coupon->update($this->fields($request->validated()));
        $this->audit->record('coupon.updated', $coupon, $this->audit->diff($before, $this->present($coupon->refresh())) ?: null);

        return response()->json(['success' => true, 'message' => 'Đã lưu mã giảm giá.', 'data' => $this->present($coupon)]);
    }

    public function destroy(Coupon $coupon): JsonResponse
    {
        if ($coupon->used_count > 0 || Order::where('coupon_id', $coupon->id)->exists()) {
            throw new DomainException(DomainException::COUPON_IN_USE, 'Mã đã được dùng trong đơn hàng, hãy tắt mã thay vì xoá.', 409);
        }
        $coupon->delete();
        $this->audit->record('coupon.deleted', $coupon, ['code' => $coupon->code]);

        return response()->json(['success' => true, 'message' => 'Đã xoá mã giảm giá.']);
    }

    private function fields(array $d): array
    {
        $out = [];
        foreach (self::FIELDS as $f) {
            $out[$f] = $d[$f] ?? null;
        }
        $out['is_active'] = $d['is_active'] ?? true;
        $out['min_order_amount'] = $d['min_order_amount'] ?? 0;

        return $out;
    }

    private function present(Coupon $c): array
    {
        return [
            'id' => $c->id,
            'code' => $c->code,
            'type' => $c->type,
            'value' => (float) $c->value,
            'min_order_amount' => (float) $c->min_order_amount,
            'max_discount_amount' => $c->max_discount_amount !== null ? (float) $c->max_discount_amount : null,
            'usage_limit' => $c->usage_limit,
            'per_customer_limit' => $c->per_customer_limit,
            'used_count' => (int) $c->used_count,
            'starts_at' => $c->starts_at?->toIso8601String(),
            'expires_at' => $c->expires_at?->toIso8601String(),
            'is_active' => (bool) $c->is_active,
        ];
    }
}
