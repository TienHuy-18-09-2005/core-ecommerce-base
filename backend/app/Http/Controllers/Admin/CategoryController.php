<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CategoryRequest;
use App\Models\Category;
use App\Services\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CategoryController extends Controller
{
    public function __construct(private AuditLogger $audit) {}

    /** Trả danh sách phẳng (FE dựng cây theo parent_id) kèm số sản phẩm. */
    public function index(): JsonResponse
    {
        $rows = Category::query()->withCount(['products', 'children'])->orderBy('sort_order')->orderBy('name')->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn (Category $c) => $this->present($c))->all()]);
    }

    public function store(CategoryRequest $request): JsonResponse
    {
        $data = $request->validated();
        $category = Category::create($this->fields($data) + ['slug' => $this->uniqueSlug($data['slug'] ?? null, $data['name'])]);
        $this->audit->record('category.created', $category, ['name' => $category->name]);

        return response()->json(['success' => true, 'message' => 'Đã tạo danh mục.', 'data' => $this->present($category->loadCount(['products', 'children']))], 201);
    }

    public function update(CategoryRequest $request, Category $category): JsonResponse
    {
        $data = $request->validated();
        $this->assertNoCycle($category, $data['parent_id'] ?? null);
        $before = $category->only(['name', 'slug', 'parent_id', 'is_active', 'sort_order']);
        $category->update($this->fields($data) + ['slug' => ! empty($data['slug']) ? $data['slug'] : $category->slug]);
        $this->audit->record('category.updated', $category, $this->audit->diff($before, $category->only(array_keys($before))) ?: null);

        return response()->json(['success' => true, 'message' => 'Đã lưu danh mục.', 'data' => $this->present($category->loadCount(['products', 'children']))]);
    }

    public function destroy(Category $category): JsonResponse
    {
        if ($category->children()->exists() || $category->products()->exists()) {
            throw new DomainException(DomainException::CATEGORY_IN_USE, 'Danh mục còn danh mục con hoặc sản phẩm, hãy chuyển chúng đi trước khi xóa.', 409);
        }
        $category->delete();
        $this->audit->record('category.deleted', $category, ['name' => $category->name]);

        return response()->json(['success' => true, 'message' => 'Đã xóa danh mục.']);
    }

    private function fields(array $d): array
    {
        return [
            'name' => $d['name'],
            'parent_id' => $d['parent_id'] ?? null,
            'description' => isset($d['description']) ? strip_tags($d['description']) : null,
            'image_url' => $d['image_url'] ?? null,
            'is_active' => $d['is_active'] ?? true,
            'sort_order' => $d['sort_order'] ?? 0,
        ];
    }

    private function assertNoCycle(Category $category, ?int $parentId): void
    {
        $seen = [];
        while ($parentId !== null) {
            if ($parentId === $category->id || isset($seen[$parentId])) {
                throw ValidationException::withMessages(['parent_id' => 'Không thể chọn chính danh mục này hoặc danh mục con của nó làm danh mục cha.']);
            }
            $seen[$parentId] = true;
            $parentId = Category::whereKey($parentId)->value('parent_id');
        }
    }

    private function uniqueSlug(?string $wanted, string $name): string
    {
        $base = Str::slug($wanted ?: $name) ?: 'danh-muc';
        $slug = $base;
        for ($n = 2; Category::where('slug', $slug)->exists(); $n++) {
            $slug = $base.'-'.$n;
        }

        return $slug;
    }

    private function present(Category $c): array
    {
        return [
            'id' => $c->id,
            'parent_id' => $c->parent_id,
            'name' => $c->name,
            'slug' => $c->slug,
            'description' => $c->description,
            'image_url' => $c->image_url,
            'is_active' => (bool) $c->is_active,
            'sort_order' => (int) $c->sort_order,
            'products_count' => (int) ($c->products_count ?? 0),
            'children_count' => (int) ($c->children_count ?? 0),
        ];
    }
}
