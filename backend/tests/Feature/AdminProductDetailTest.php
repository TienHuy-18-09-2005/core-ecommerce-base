<?php

namespace Tests\Feature;

use App\Models\AdminAuditLog;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Trang chi tiết sản phẩm (chỉ xem): lịch sử thay đổi + lọc đánh giá theo sản phẩm. */
class AdminProductDetailTest extends TestCase
{
    use RefreshDatabase;

    private function asSpa(User $user): static
    {
        return $this->withHeader('Origin', 'http://localhost:5173')->withCredentials()->actingAs($user);
    }

    public function test_history_lists_only_this_product_newest_first_and_requires_admin(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true, 'name' => 'Quản trị']);
        $p = Product::create(['name' => 'Đèn', 'slug' => 'den', 'status' => 'draft']);
        $other = Product::create(['name' => 'Quạt', 'slug' => 'quat', 'status' => 'draft']);
        AdminAuditLog::create(['user_id' => $admin->id, 'action' => 'product.created', 'subject_type' => 'Product', 'subject_id' => $p->id, 'changes' => ['name' => 'Đèn']]);
        AdminAuditLog::create(['user_id' => $admin->id, 'action' => 'product.updated', 'subject_type' => 'Product', 'subject_id' => $p->id, 'changes' => ['status' => ['draft', 'published']]]);
        AdminAuditLog::create(['user_id' => $admin->id, 'action' => 'product.created', 'subject_type' => 'Product', 'subject_id' => $other->id]);

        $this->asSpa($admin)->getJson("/api/admin/products/{$p->id}/history")->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.action', 'product.updated')
            ->assertJsonPath('data.0.user.name', 'Quản trị')
            ->assertJsonPath('data.1.action', 'product.created');

        $customer = User::factory()->create(['role' => 'customer']);
        $this->asSpa($customer)->getJson("/api/admin/products/{$p->id}/history")->assertForbidden();
    }

    public function test_reviews_can_be_filtered_by_product(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        $a = Product::create(['name' => 'Đèn', 'slug' => 'den', 'status' => 'published']);
        $b = Product::create(['name' => 'Quạt', 'slug' => 'quat', 'status' => 'published']);
        foreach ([$a, $b] as $p) {
            ProductReview::create(['product_id' => $p->id, 'user_id' => User::factory()->create()->id, 'rating' => 5, 'comment' => 'Tốt', 'is_approved' => true]);
        }
        $this->asSpa($admin)->getJson("/api/admin/reviews?product_id={$a->id}")->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.product.id', $a->id);
    }
}
