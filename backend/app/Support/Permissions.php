<?php

namespace App\Support;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Danh mục quyền (R6) và 4 vai trò mẫu. Nguồn duy nhất cho seed, kiểm tra hợp lệ và màn hình phân quyền.
 * Admin luôn có mọi quyền; nhân viên (role=staff) có hợp quyền của mọi vai trò được gán.
 */
final class Permissions
{
    /** Quyền chỉ admin có, không gán được cho vai trò (nhân viên không tự nâng quyền quản lý vai trò). */
    public const ADMIN_ONLY = ['roles.manage', 'settings.manage'];

    /** @var array<string, array{label: string, items: array<string, string>}> */
    public const GROUPS = [
        'dashboard' => ['label' => 'Tổng quan', 'items' => [
            'dashboard.view' => 'Xem trang tổng quan',
            'revenue.view' => 'Xem doanh thu',
        ]],
        'products' => ['label' => 'Sản phẩm', 'items' => [
            'products.view' => 'Xem sản phẩm',
            'products.edit' => 'Thêm, sửa, nhân bản sản phẩm',
            'products.delete' => 'Xóa sản phẩm',
        ]],
        'categories' => ['label' => 'Danh mục', 'items' => [
            'categories.view' => 'Xem danh mục',
            'categories.manage' => 'Thêm, sửa, xóa danh mục',
        ]],
        'orders' => ['label' => 'Đơn hàng', 'items' => [
            'orders.view' => 'Xem đơn hàng',
            'orders.update' => 'Đổi trạng thái đơn (trừ hủy)',
            'orders.cancel' => 'Hủy đơn',
            'orders.note' => 'Thêm ghi chú nội bộ',
            'orders.print' => 'In phiếu giao hàng',
        ]],
        'coupons' => ['label' => 'Mã giảm giá', 'items' => [
            'coupons.view' => 'Xem mã giảm giá',
            'coupons.manage' => 'Thêm, sửa, xóa mã giảm giá',
        ]],
        'reviews' => ['label' => 'Đánh giá', 'items' => [
            'reviews.view' => 'Xem đánh giá',
            'reviews.moderate' => 'Ẩn, hiện, xóa đánh giá',
        ]],
        'system' => ['label' => 'Hệ thống', 'items' => [
            'audit.view' => 'Xem nhật ký thay đổi',
            'roles.manage' => 'Quản lý vai trò và phân quyền (chỉ admin)',
            'settings.manage' => 'Cài đặt cửa hàng (chỉ admin)',
        ]],
    ];

    /** @var array<string, array{name: string, description: string, permissions: list<string>}> */
    public const PRESETS = [
        'product_manager' => ['name' => 'Quản lý sản phẩm', 'description' => 'Quản lý sản phẩm, danh mục, đánh giá. Không xem doanh thu.', 'permissions' => [
            'dashboard.view', 'products.view', 'products.edit', 'products.delete', 'categories.view', 'categories.manage',
            'coupons.view', 'reviews.view', 'reviews.moderate', 'audit.view',
        ]],
        'order_processor' => ['name' => 'Xử lý đơn hàng', 'description' => 'Xác nhận, đóng gói, giao, hủy và in phiếu đơn hàng.', 'permissions' => [
            'dashboard.view', 'products.view', 'orders.view', 'orders.update', 'orders.cancel', 'orders.note', 'orders.print', 'coupons.view',
        ]],
        'accountant' => ['name' => 'Kế toán', 'description' => 'Xem doanh thu, đơn hàng và mã giảm giá. Không xem nhật ký.', 'permissions' => [
            'dashboard.view', 'revenue.view', 'products.view', 'orders.view', 'orders.print', 'coupons.view',
        ]],
        'customer_care' => ['name' => 'Chăm sóc khách hàng', 'description' => 'Xem đơn, ghi chú liên hệ khách, xử lý đánh giá. Không hủy đơn.', 'permissions' => [
            'dashboard.view', 'products.view', 'orders.view', 'orders.note', 'coupons.view', 'reviews.view', 'reviews.moderate',
        ]],
    ];

    /** @return list<string> */
    public static function all(): array
    {
        return array_merge(...array_map(fn ($g) => array_keys($g['items']), array_values(self::GROUPS)));
    }

    /** @return list<string> */
    public static function assignable(): array
    {
        return array_values(array_diff(self::all(), self::ADMIN_ONLY));
    }

    /** Đồng bộ bảng permissions và tạo vai trò mẫu nếu chưa có (không ghi đè vai trò mẫu đã được chỉnh). Idempotent. */
    public static function sync(): void
    {
        $now = Carbon::now();
        foreach (self::GROUPS as $group => $g) {
            foreach ($g['items'] as $key => $label) {
                DB::table('permissions')->updateOrInsert(['key' => $key], ['group' => $group, 'label' => $label, 'updated_at' => $now, 'created_at' => $now]);
            }
        }
        DB::table('permissions')->whereNotIn('key', self::all())->delete();
        $ids = DB::table('permissions')->pluck('id', 'key');
        foreach (self::PRESETS as $slug => $p) {
            if (DB::table('roles')->where('slug', $slug)->exists()) {
                continue;
            }
            $roleId = DB::table('roles')->insertGetId(['slug' => $slug, 'name' => $p['name'], 'description' => $p['description'], 'is_system' => true, 'created_at' => $now, 'updated_at' => $now]);
            DB::table('role_permission')->insert(array_map(fn ($k) => ['role_id' => $roleId, 'permission_id' => $ids[$k]], $p['permissions']));
        }
    }
}
