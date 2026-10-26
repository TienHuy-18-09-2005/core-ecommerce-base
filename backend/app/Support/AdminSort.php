<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;

/**
 * Sắp xếp danh sách admin theo whitelist: chỉ cột trong $allowed mới được ORDER BY
 * (FormRequest đã chặn giá trị lạ bằng rule `in:`; đây là lớp phòng thủ thứ hai).
 */
final class AdminSort
{
    public static function rules(array $allowed): array
    {
        return [
            'sort' => ['nullable', 'string', 'in:'.implode(',', $allowed)],
            'direction' => ['nullable', 'in:asc,desc'],
        ];
    }

    public static function messages(): array
    {
        return [
            'sort.in' => 'Trường sắp xếp không hợp lệ.',
            'direction.in' => 'Chiều sắp xếp chỉ nhận asc hoặc desc.',
        ];
    }

    /** @param array<string,string> $map tên tham số → cột/alias SQL */
    public static function apply(Builder $q, array $f, array $map, string $default = 'id', string $defaultDir = 'desc'): Builder
    {
        $field = $f['sort'] ?? null;
        $column = $field !== null && isset($map[$field]) ? $map[$field] : $map[$default];
        $dir = ($f['direction'] ?? null) === 'asc' ? 'asc' : (($f['direction'] ?? null) === 'desc' ? 'desc' : ($field ? 'asc' : $defaultDir));
        $q->orderBy($column, $dir);
        if ($column !== 'id') {
            $q->orderBy($q->getModel()->getTable().'.id', $dir); // ổn định khi trùng giá trị
        }

        return $q;
    }
}
